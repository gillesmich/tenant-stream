import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // 32KB chunks to avoid call stack limits
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rentId, templateUrl, templateName }: { 
      rentId: string; 
      templateUrl?: string | null; 
      templateName?: string | null;
    } = await req.json();

    if (!rentId) {
      return new Response(JSON.stringify({ error: "Paramètre 'rentId' manquant" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY env");
      return new Response(JSON.stringify({ error: "Configuration email manquante (RESEND_API_KEY)" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resend = new Resend(RESEND_API_KEY);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Récupérer les données du loyer avec le bail et le locataire
    const { data: rent, error: rentError } = await supabaseAdmin
      .from("rents")
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*),
          tenant:tenants(*)
        )
      `)
      .eq("id", rentId)
      .single();

    if (rentError || !rent) {
      throw new Error("Loyer introuvable");
    }

    const tenant = rent.lease?.tenant;
    const property = rent.lease?.property;

    if (!tenant?.email) {
      throw new Error("Aucune adresse e-mail trouvée pour le locataire");
    }

    // Générer le PDF via la fonction existante
    const pdfResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-rent-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/pdf",
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "apikey": SERVICE_ROLE,
      },
      body: JSON.stringify({ 
        rentId, 
        templateUrl: templateUrl || null,
        templateName: templateName || null
      }),
    });

    if (!pdfResponse.ok) {
      const txt = await pdfResponse.text();
      console.error("Erreur génération PDF:", txt);
      throw new Error("Échec de génération du PDF");
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    const pdfBase64 = uint8ToBase64(pdfBytes);

    // Créer le nom du fichier pour le stockage
    const fileName = `receipts/${rent.lease.owner_id}/quittance-${rent.period_start}-${rentId}.pdf`;

    // Sauvegarder le PDF dans le stockage Supabase
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error("Erreur upload PDF:", uploadError);
      throw new Error("Échec de sauvegarde du PDF");
    }

    // Créer un document dans la base de données
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        title: `Quittance de loyer - ${new Date(rent.period_start).toLocaleDateString('fr-FR')}`,
        document_type: 'quittance_loyer',
        owner_id: rent.lease.owner_id,
        lease_id: rent.lease_id,
        property_id: rent.lease.property_id,
        file_url: fileName,
        auto_generated: true,
        source_type: 'rent_receipt',
        file_name: `quittance-${rent.period_start}.pdf`,
        file_size: pdfBytes.length,
        mime_type: 'application/pdf'
      })
      .select()
      .single();

    if (docError) {
      console.error("Erreur création document:", docError);
    }

    const periodStart = new Date(rent.period_start).toLocaleDateString('fr-FR');
    const periodEnd = new Date(rent.period_end).toLocaleDateString('fr-FR');

    const subject = `Quittance de loyer - ${property?.title || "Propriété"} - ${periodStart}`;
    const html = `
      <h2>Quittance de loyer</h2>
      <p>Bonjour ${tenant.first_name} ${tenant.last_name},</p>
      <p>Veuillez trouver ci-joint votre quittance de loyer pour la période du <strong>${periodStart}</strong> au <strong>${periodEnd}</strong>.</p>
      <p><strong>Bien loué :</strong> ${property?.title || ""}</p>
      <p><strong>Adresse :</strong> ${property?.address || ""}, ${property?.city || ""}</p>
      <p><strong>Montant payé :</strong> ${rent.total_amount}€</p>
      <p>Cette quittance est également disponible dans votre espace documents en ligne.</p>
      <p>Cordialement,</p>
    `;

    const email = await resend.emails.send({
      from: "Quittances <onboarding@resend.dev>",
      to: [tenant.email],
      subject,
      html,
      attachments: [
        {
          filename: `quittance-${rent.period_start}.pdf`,
          content: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    });

    // Marquer le loyer comme ayant reçu sa quittance
    const { error: updateError } = await supabaseAdmin
      .from("rents")
      .update({ 
        receipt_sent: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", rentId);

    if (updateError) {
      console.error("Erreur MAJ statut loyer:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Quittance envoyée par email et sauvegardée", 
        emailId: (email as any)?.id ?? null,
        documentId: document?.id
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Erreur envoi quittance par email:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Erreur inconnue" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});