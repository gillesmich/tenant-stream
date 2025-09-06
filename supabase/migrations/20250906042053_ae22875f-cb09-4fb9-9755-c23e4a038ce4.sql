-- Mettre à jour les RLS policies pour permettre aux locataires de voir leurs quittances
-- Politique pour permettre aux locataires de voir les documents liés à leurs baux via email de locataire

-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Tenants can view rent receipts for their leases" ON public.documents;

-- Créer une nouvelle politique pour les quittances de loyer
CREATE POLICY "Tenants can view rent receipts for their leases" 
ON public.documents 
FOR SELECT 
USING (
  -- Documents de type quittance_loyer liés à des baux du locataire
  (document_type = 'quittance_loyer' AND lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN tenants t ON l.tenant_id = t.id
    WHERE t.email IN (
      SELECT p.email
      FROM profiles p
      WHERE p.user_id = auth.uid()
    )
  ))
  OR
  -- Documents de type quittance_loyer liés à des baux via tenant_phone
  (document_type = 'quittance_loyer' AND lease_id IN (
    SELECT l.id
    FROM leases l
    WHERE l.tenant_phone IN (
      SELECT p.phone
      FROM profiles p
      WHERE p.user_id = auth.uid()
    )
  ))
);