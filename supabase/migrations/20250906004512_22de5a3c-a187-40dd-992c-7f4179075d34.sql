-- Ajouter les politiques RLS pour permettre aux locataires d'accéder aux documents liés à leurs baux
-- Les locataires peuvent voir les documents liés aux baux où ils apparaissent comme tenant_phone ou tenant_email

-- Politique pour que les locataires puissent voir les documents liés à leurs baux (par email de tenant)
CREATE POLICY "Tenants can view documents for their leases by email" 
ON documents FOR SELECT 
USING (
  lease_id IN (
    SELECT id FROM leases 
    WHERE tenant_phone IN (
      SELECT phone FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND email = leases.tenant_phone  -- Si le téléphone dans leases correspond à l'email du profil
    )
  )
  OR lease_id IN (
    SELECT id FROM leases 
    WHERE tenant_id IN (
      SELECT id FROM tenants 
      WHERE email IN (
        SELECT email FROM profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- Ajouter une colonne pour identifier les documents générés automatiquement (comme les PDFs de contrat)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type TEXT; -- 'lease_pdf', 'inventory_pdf', etc.