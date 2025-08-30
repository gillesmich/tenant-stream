-- RLS policies to enable proper visibility for caution requests
-- Tenants can read requests sent to their email
CREATE POLICY "lov_tenants_view_caution_requests_by_email_20250830"
ON public.caution_requests
FOR SELECT
USING (
  tenant_email = (
    SELECT email FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Owners can read their own requests (by owner_id)
CREATE POLICY "lov_owners_view_caution_requests_20250830"
ON public.caution_requests
FOR SELECT
USING (
  owner_id = auth.uid()
);
