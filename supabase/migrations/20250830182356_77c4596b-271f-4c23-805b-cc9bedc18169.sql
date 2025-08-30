-- Add SELECT policy so tenants can view their caution requests by their profile email
CREATE POLICY IF NOT EXISTS "Tenants can view their invited caution requests"
ON public.caution_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.email IS NOT NULL
      AND p.email = caution_requests.tenant_email
  )
);
