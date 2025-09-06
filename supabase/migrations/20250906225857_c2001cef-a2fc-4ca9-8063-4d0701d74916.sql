-- Fix RLS policies for rents table to allow proper tenant access

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Tenants can view rents for their leases" ON public.rents;

-- Add comprehensive RLS policy for tenants to view their rents
CREATE POLICY "Tenants can view rents for their leases" ON public.rents
FOR SELECT 
USING (
  lease_id IN (
    SELECT l.id 
    FROM leases l
    JOIN tenants t ON l.tenant_id = t.id
    JOIN profiles p ON p.email = t.email OR p.phone = t.phone
    WHERE p.user_id = auth.uid()
  ) OR 
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN profiles p ON p.email = l.tenant_phone OR p.phone = l.tenant_phone
    WHERE p.user_id = auth.uid()
  )
);

-- Ensure tenants can also view documents related to their rents
DROP POLICY IF EXISTS "Tenants can view rent documents" ON public.documents;

CREATE POLICY "Tenants can view rent documents" ON public.documents
FOR SELECT
USING (
  document_type IN ('quittance_loyer', 'receipt_template') AND
  (
    lease_id IN (
      SELECT l.id 
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      JOIN profiles p ON p.email = t.email OR p.phone = t.phone
      WHERE p.user_id = auth.uid()
    ) OR 
    lease_id IN (
      SELECT l.id
      FROM leases l  
      JOIN profiles p ON p.email = l.tenant_phone OR p.phone = l.tenant_phone
      WHERE p.user_id = auth.uid()
    )
  )
);