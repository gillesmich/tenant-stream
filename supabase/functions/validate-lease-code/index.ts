import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leaseId, validationCode }: { leaseId: string; validationCode: string } = await req.json();

    if (!leaseId || !validationCode) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Récupérer le bail
    const { data: lease, error: leaseError } = await supabaseAdmin
      .from("leases")
      .select(`*, properties(*), tenants(*)`)
      .eq("id", leaseId)
      .single();

    if (leaseError || !lease) {
      throw new Error("Bail introuvable");
    }

    // Vérifier si le code n'a pas expiré
    if (lease.validation_expires_at && new Date(lease.validation_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Le code de validation a expiré" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Vérifier le nombre de tentatives
    if (lease.validation_attempts >= 5) {
      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Demandez un nouveau code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Incrémenter le nombre de tentatives
    const newAttempts = (lease.validation_attempts || 0) + 1;

    // Vérifier le code
    if (lease.tenant_validation_code !== validationCode) {
      // Mettre à jour les tentatives
      await supabaseAdmin
        .from("leases")
        .update({ validation_attempts: newAttempts })
        .eq("id", leaseId);

      return new Response(
        JSON.stringify({ 
          error: "Code incorrect", 
          attemptsRemaining: 5 - newAttempts 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Code correct - marquer comme validé
    const { error: updateError } = await supabaseAdmin
      .from("leases")
      .update({
        tenant_validation_status: "validated",
        signed_by_tenant: true,
        signed_at: new Date().toISOString(),
        status: "actif"
      })
      .eq("id", leaseId);

    if (updateError) {
      console.error("Erreur validation bail:", updateError);
      throw new Error("Erreur lors de la validation");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Bail validé avec succès",
        lease: {
          id: lease.id,
          property: lease.properties?.title,
          status: "actif"
        }
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Erreur validation code:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Erreur inconnue" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});