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
    const { cautionRequestId, action } = await req.json();

    if (!cautionRequestId || !["accept", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Paramètres invalides" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Client scoped to the calling user to read their identity
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") || "" },
        },
      }
    );

    // Admin client to perform the protected update
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Authentification requise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load the caution request
    const { data: request, error: loadError } = await supabaseAdmin
      .from("caution_requests")
      .select("id, tenant_email, status, expires_at")
      .eq("id", cautionRequestId)
      .single();

    if (loadError || !request) {
      console.error("Request not found:", loadError);
      return new Response(
        JSON.stringify({ error: "Demande introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic validations
    const now = new Date();
    const expiresAt = new Date(request.expires_at);
    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ error: "Invitation expirée" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only the invited tenant can respond
    const callerEmail = user.email?.toLowerCase();
    if (!callerEmail || callerEmail !== String(request.tenant_email).toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";

    const { error: updateError } = await supabaseAdmin
      .from("caution_requests")
      .update({ status: newStatus })
      .eq("id", cautionRequestId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la mise à jour" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("respond-caution-invitation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});