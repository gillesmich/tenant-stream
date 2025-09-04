import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Twilio configuration
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

async function sendSMS(to: string, message: string) {
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  const body = new URLSearchParams();
  body.append('To', to);
  body.append('From', TWILIO_PHONE_NUMBER!);
  body.append('Body', message);

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio SMS failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { leaseId, tenantPhone } = await req.json();

    // Generate validation code
    const validationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update lease with validation details
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    const { error: updateError } = await supabaseClient
      .from('leases')
      .update({
        tenant_phone: tenantPhone,
        tenant_validation_code: validationCode,
        validation_expires_at: expiresAt.toISOString(),
        validation_sent_at: new Date().toISOString(),
        validation_attempts: 0
      })
      .eq('id', leaseId);

    if (updateError) {
      throw updateError;
    }

    // Send SMS using Twilio
    const smsMessage = `Votre code de validation pour le bail est: ${validationCode}. Ce code expire dans 15 minutes.`;
    
    try {
      await sendSMS(tenantPhone, smsMessage);
      console.log(`SMS sent successfully to ${tenantPhone}`);
    } catch (smsError) {
      console.error('Failed to send SMS:', smsError);
      // Still return success if database was updated, but log the SMS error
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Code de validation envoyé par SMS' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending SMS validation:', error);
    return new Response(
      JSON.stringify({ error: 'Échec de l\'envoi du code de validation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});