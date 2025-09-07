-- Améliorer l'accès des locataires aux quittances de loyer

-- S'assurer que les locataires peuvent voir les quittances de leurs loyers
-- Mise à jour de la politique existante pour être plus explicite
DROP POLICY IF EXISTS "Tenants can view rent documents" ON public.documents;
DROP POLICY IF EXISTS "Tenants can view rent receipts for their leases" ON public.documents;

-- Créer une politique unifiée et claire pour l'accès aux quittances
CREATE POLICY "Tenants can view rent receipts and templates" 
ON public.documents 
FOR SELECT 
USING (
  -- Les locataires peuvent voir les quittances de loyer et les templates
  (document_type = ANY (ARRAY['quittance_loyer'::text, 'receipt_template'::text])) 
  AND (
    -- Via leur profil associé au bail par tenant_id
    (lease_id IN ( 
      SELECT l.id
      FROM ((leases l
        JOIN tenants t ON ((l.tenant_id = t.id)))
        JOIN profiles p ON (((p.email = t.email) OR (p.phone = t.phone))))
      WHERE (p.user_id = auth.uid())
    )) 
    OR 
    -- Via leur profil associé au bail par tenant_phone directement
    (lease_id IN ( 
      SELECT l.id
      FROM (leases l
        JOIN profiles p ON (((p.email = l.tenant_phone) OR (p.phone = l.tenant_phone))))
      WHERE (p.user_id = auth.uid())
    ))
  )
);