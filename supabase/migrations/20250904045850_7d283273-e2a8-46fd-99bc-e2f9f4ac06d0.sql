-- Extend inventories table for SMS validation
ALTER TABLE public.inventories 
ADD COLUMN tenant_phone text,
ADD COLUMN tenant_validation_status text DEFAULT 'pending',
ADD COLUMN owner_validation_status text DEFAULT 'pending', 
ADD COLUMN tenant_validation_code text,
ADD COLUMN tenant_validation_date timestamp with time zone,
ADD COLUMN validation_expires_at timestamp with time zone;

-- Add index for validation lookups
CREATE INDEX idx_inventories_validation_code ON public.inventories(tenant_validation_code);

-- Update RLS policies to allow tenants to view inventories they need to validate
CREATE POLICY "Tenants can view inventories for validation by phone" 
ON public.inventories 
FOR SELECT 
USING (tenant_phone IS NOT NULL AND tenant_validation_code IS NOT NULL);

-- Create function to generate validation codes
CREATE OR REPLACE FUNCTION public.generate_inventory_validation_code()
RETURNS text AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;