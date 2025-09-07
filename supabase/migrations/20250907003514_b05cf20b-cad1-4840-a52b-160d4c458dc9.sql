-- Corriger les problèmes de sécurité critiques

-- 1. Supprimer la politique publique dangereuse pour les baux
DROP POLICY IF EXISTS "Public validation access for leases with validation code" ON public.leases;

-- 2. Supprimer la politique publique dangereuse pour les inventaires
DROP POLICY IF EXISTS "Tenants can view inventories for validation by phone" ON public.inventories;

-- 3. Créer des politiques sécurisées pour la validation des baux
-- Permettre l'accès uniquement avec un code de validation spécifique et pour une durée limitée
CREATE POLICY "Secure lease validation access" 
ON public.leases 
FOR SELECT 
USING (
  tenant_validation_code IS NOT NULL 
  AND validation_expires_at > now() 
  AND LENGTH(tenant_validation_code) = 6
);

-- 4. Créer des politiques sécurisées pour la validation des inventaires
-- Limiter l'accès aux inventaires avec validation active seulement
CREATE POLICY "Secure inventory validation access" 
ON public.inventories 
FOR SELECT 
USING (
  tenant_validation_code IS NOT NULL 
  AND validation_expires_at > now() 
  AND LENGTH(tenant_validation_code) = 6
  AND tenant_phone IS NOT NULL
);