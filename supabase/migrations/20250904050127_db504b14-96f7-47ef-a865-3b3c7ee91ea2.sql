-- Extend leases table for SMS validation
ALTER TABLE public.leases 
ADD COLUMN tenant_phone text,
ADD COLUMN tenant_validation_code text,
ADD COLUMN tenant_validation_status text DEFAULT 'pending',
ADD COLUMN validation_expires_at timestamp with time zone,
ADD COLUMN validation_attempts integer DEFAULT 0,
ADD COLUMN validation_sent_at timestamp with time zone;

-- Add index for validation lookups
CREATE INDEX idx_leases_validation_code ON public.leases(tenant_validation_code);

-- Update RLS policies to allow tenants to view leases for validation by validation code
CREATE POLICY "Public validation access for leases with validation code" 
ON public.leases 
FOR SELECT 
USING (tenant_validation_code IS NOT NULL AND validation_expires_at > now());

-- Create function to generate lease validation codes
CREATE OR REPLACE FUNCTION public.generate_lease_validation_code()
RETURNS text AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;