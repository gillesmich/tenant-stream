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
    const { leaseId, templateUrl, to }: { leaseId: string; templateUrl?: string | null; to?: string } = await req.json();

    if (!leaseId) {
      return new Response(JSON.stringify({ error: "Paramètre 'leaseId' manquant" }), {
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

    // Récupérer le bail avec propriété et locataire
    const { data: lease, error: leaseError } = await supabaseAdmin
      .from("leases")
      .select(`*, properties(*), tenants(*)`)
      .eq("id", leaseId)
      .single();

    if (leaseError || !lease) {
      throw new Error("Bail introuvable");
    }

    const recipient = to || lease.tenants?.email;
    if (!recipient) {
      throw new Error("Aucune adresse e-mail trouvée pour le locataire");
    }

    // Générer le PDF via la fonction existante
    const pdfResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-lease-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/pdf",
        // Autoriser l'appel inter-fonctions avec la clé service role
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "apikey": SERVICE_ROLE,
      },
      body: JSON.stringify({ leaseId, templateUrl: templateUrl || null }),
    });

    if (!pdfResponse.ok) {
      const txt = await pdfResponse.text();
      console.error("Erreur génération PDF:", txt);
      throw new Error("Échec de génération du PDF");
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    const pdfBase64 = uint8ToBase64(pdfBytes);

    const subject = `Contrat de location - ${lease.properties?.title ?? "Bail"}`;
    const html = `
      <h2>Contrat de location</h2>
      <p>Bonjour ${lease.tenants?.first_name ?? ""} ${lease.tenants?.last_name ?? ""},</p>
      <p>Veuillez trouver ci-joint votre contrat de location pour le bien <strong>${lease.properties?.title ?? ""}</strong>.</p>
      <p>Cordialement,</p>
    `;

    const email = await resend.emails.send({
      from: "Baux <onboarding@resend.dev>",
      to: [recipient],
      subject,
      html,
      attachments: [
        {
          filename: `bail-${leaseId}.pdf`,
          content: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    });

    // Mettre à jour le statut du bail
    const { error: updateError } = await supabaseAdmin
      .from("leases")
      .update({ status: "envoye", updated_at: new Date().toISOString() })
      .eq("id", leaseId);

    if (updateError) {
      console.error("Erreur MAJ statut bail:", updateError);
    }

    // Créer un document dans la base de données pour le PDF envoyé
    try {
      const { error: docError } = await supabaseAdmin
        .from('documents')
        .insert({
          title: `Contrat de location - ${lease.properties?.title || 'Propriété'}`,
          document_type: 'contrat_location',
          owner_id: lease.owner_id,
          lease_id: leaseId,
          property_id: lease.property_id,
          file_url: `${SUPABASE_URL}/functions/v1/generate-lease-pdf?leaseId=${leaseId}`,
          auto_generated: true,
          source_type: 'lease_pdf'
        });

      if (docError) {
        console.error("Error creating document:", docError);
      } else {
        console.log("Document created successfully for lease PDF");
      }
    } catch (docCreateError) {
      console.error("Error creating document:", docCreateError);
      // Ne pas faire échouer l'envoi d'email si la création du document échoue
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email envoyé", emailId: (email as any)?.id ?? null }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Erreur envoi bail par email:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Erreur inconnue" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
