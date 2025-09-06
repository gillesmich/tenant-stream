import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leaseId }: { leaseId: string } = await req.json();

    if (!leaseId) {
      return new Response(JSON.stringify({ error: "Paramètre 'leaseId' manquant" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY env");
      return new Response(JSON.stringify({ error: "Configuration email manquante" }), {
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

    if (!lease.tenants?.email) {
      throw new Error("Aucune adresse e-mail trouvée pour le locataire");
    }

    // Générer un code de validation à 6 chiffres
    const validationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Mettre à jour le bail avec le code de validation
    const { error: updateError } = await supabaseAdmin
      .from("leases")
      .update({
        tenant_validation_code: validationCode,
        validation_expires_at: expiresAt.toISOString(),
        validation_sent_at: new Date().toISOString(),
        validation_attempts: 0,
      })
      .eq("id", leaseId);

    if (updateError) {
      console.error("Erreur MAJ bail:", updateError);
      throw new Error("Erreur lors de la mise à jour du bail");
    }

    // Envoyer l'email avec le code
    const subject = `Code de validation - Contrat de location ${lease.properties?.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Code de validation de votre contrat de location</h2>
        
        <p>Bonjour ${lease.tenants?.first_name} ${lease.tenants?.last_name},</p>
        
        <p>Votre propriétaire vous a envoyé un contrat de location pour le bien :</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>${lease.properties?.title}</strong><br>
          ${lease.properties?.address || ""}
        </div>
        
        <p>Pour valider et signer ce contrat, veuillez utiliser le code de validation suivant :</p>
        
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="margin: 0; font-size: 32px; letter-spacing: 8px;">${validationCode}</h1>
        </div>
        
        <p style="color: #dc2626; font-weight: bold;">⚠️ Ce code expire dans 24 heures.</p>
        
        <p>Rendez-vous sur la page de validation pour saisir ce code et finaliser la signature de votre contrat.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          Si vous n'avez pas demandé cette validation, veuillez ignorer cet email.
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Validation Bail <onboarding@resend.dev>",
      to: [lease.tenants.email],
      subject,
      html,
    });

    console.log("Email validation envoyé:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Code de validation envoyé par email",
        expiresAt: expiresAt.toISOString()
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Erreur envoi code validation:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Erreur inconnue" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});