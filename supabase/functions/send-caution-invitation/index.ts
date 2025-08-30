import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cautionRequestId } = await req.json();
    
    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get caution request details
    const { data: cautionRequest, error: requestError } = await supabaseAdmin
      .from("caution_requests")
      .select("*")
      .eq("id", cautionRequestId)
      .single();

    if (requestError || !cautionRequest) {
      console.error("Caution request not found:", requestError);
      throw new Error("Demande de caution introuvable");
    }

    console.log("Found caution request:", cautionRequest);

    // Update status to invited
    const { error: updateError } = await supabaseAdmin
      .from("caution_requests")
      .update({ status: "invited" })
      .eq("id", cautionRequestId);

    if (updateError) {
      console.error("Error updating status:", updateError);
      throw new Error("Erreur lors de la mise à jour du statut");
    }

    // Generate invitation link
    const invitationLink = `${Deno.env.get("SITE_URL") || "http://localhost:5173"}/caution-invitation/${cautionRequestId}`;

    console.log("Sending email to:", cautionRequest.tenant_email);
    
    // Send actual email using Resend
    const emailResponse = await resend.emails.send({
      from: "LocaManager <onboarding@resend.dev>",
      to: [cautionRequest.tenant_email],
      subject: "Invitation - Caution locative",
      html: `
        <h1>Demande de caution locative</h1>
        <p>Vous avez reçu une demande de caution pour le logement suivant :</p>
        <ul>
          <li><strong>Adresse :</strong> ${cautionRequest.property_address}</li>
          <li><strong>Montant de la caution :</strong> ${cautionRequest.amount / 100}€</li>
          <li><strong>Durée :</strong> ${cautionRequest.duration_months} mois</li>
        </ul>
        <p>Pour accepter ou décliner cette demande, cliquez sur le lien ci-dessous :</p>
        <a href="${invitationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Répondre à la demande
        </a>
        <p>Ce lien expire le ${new Date(cautionRequest.expires_at).toLocaleDateString('fr-FR')}.</p>
        <p>Cordialement,<br>L'équipe LocaManager</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation envoyée avec succès",
        invitationLink,
        emailId: emailResponse.data?.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});