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
    const { leaseId } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Récupérer les données du bail
    const { data: lease, error: leaseError } = await supabaseAdmin
      .from("leases")
      .select(`
        *,
        properties (*),
        tenants (*)
      `)
      .eq("id", leaseId)
      .single();

    if (leaseError || !lease) {
      throw new Error("Bail introuvable");
    }

    // Mettre à jour le statut du bail
    const { error: updateError } = await supabaseAdmin
      .from("leases")
      .update({ 
        status: 'envoye',
        updated_at: new Date().toISOString()
      })
      .eq("id", leaseId);

    if (updateError) {
      throw new Error("Erreur lors de la mise à jour du statut");
    }

    // Simuler l'envoi d'email
    console.log("Envoi notification bail:", {
      to: lease.tenants?.email,
      subject: `Contrat de location - ${lease.properties?.title}`,
      lease: {
        id: leaseId,
        property: lease.properties?.title,
        startDate: lease.start_date,
        rentAmount: lease.rent_amount
      }
    });

    // Dans une vraie implémentation, utiliser un service d'email
    // comme Resend, SendGrid, etc.

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification envoyée avec succès" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erreur envoi notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});