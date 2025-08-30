-- Allow tenants to view caution requests sent to their email
CREATE POLICY "Tenants can view caution requests for their email"
ON public.caution_requests
FOR SELECT
USING (
  tenant_email IN (
    SELECT email FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Allow tenant profiles to view caution payments for their profile
CREATE POLICY "Tenants can view their caution payments" 
ON public.caution_payments 
FOR SELECT 
USING (
  tenant_profile_id IN (
    SELECT id FROM public.tenant_profiles WHERE user_id = auth.uid()
  )
);