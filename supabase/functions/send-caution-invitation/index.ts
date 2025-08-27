import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      throw new Error("Demande de caution introuvable");
    }

    // Update status to invited
    const { error: updateError } = await supabaseAdmin
      .from("caution_requests")
      .update({ status: "invited" })
      .eq("id", cautionRequestId);

    if (updateError) {
      throw new Error("Erreur lors de la mise à jour du statut");
    }

    // Generate invitation link
    const invitationLink = `${Deno.env.get("SITE_URL") || "http://localhost:5173"}/caution-invitation/${cautionRequestId}`;

    // In a real implementation, you would send an email here
    // For now, we'll just log the invitation details
    console.log("Sending invitation email:", {
      to: cautionRequest.tenant_email,
      subject: "Invitation - Caution locative",
      invitationLink,
      amount: cautionRequest.amount / 100,
      property: cautionRequest.property_address,
    });

    // Send SMS invitation (in a real implementation)
    console.log("Sending SMS invitation:", {
      to: cautionRequest.tenant_phone,
      message: `Caution locative: Vous avez reçu une demande de caution de ${cautionRequest.amount / 100}€. Lien: ${invitationLink}`,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation envoyée avec succès",
        invitationLink 
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