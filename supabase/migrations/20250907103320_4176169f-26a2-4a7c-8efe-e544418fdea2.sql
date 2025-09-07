-- Fix RLS policies for tenant access to documents and leases
-- Update the documents RLS policy to properly match tenant access by email/phone

-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Tenants can view documents for their leases by email" ON public.documents;

-- Create a more comprehensive policy for tenant document access
CREATE POLICY "Tenants can view their lease documents" 
ON public.documents 
FOR SELECT 
USING (
  -- Allow if document is linked to a lease where tenant matches user's email/phone
  (lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN profiles p ON (p.user_id = auth.uid())
    WHERE (
      -- Match by tenant_phone field on lease
      (l.tenant_phone IS NOT NULL AND (p.phone = l.tenant_phone OR p.email = l.tenant_phone))
      OR
      -- Match by tenant table email
      (l.tenant_id IN (
        SELECT t.id FROM tenants t 
        WHERE t.email = p.email OR t.phone = p.phone
      ))
    )
  ))
);

-- Also update the lease RLS policy to ensure tenants can see leases sent to them
DROP POLICY IF EXISTS "Secure lease validation access" ON public.leases;

-- Create policy for tenants to view leases with proper email/phone matching
CREATE POLICY "Tenants can view their leases by email or phone" 
ON public.leases 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    WHERE (
      -- Match by tenant_phone field (can be email or phone)
      (tenant_phone IS NOT NULL AND (p.phone = tenant_phone OR p.email = tenant_phone))
      OR
      -- Match by tenant table
      (tenant_id IN (
        SELECT t.id FROM tenants t 
        WHERE t.email = p.email OR t.phone = p.phone
      ))
    )
  )
);