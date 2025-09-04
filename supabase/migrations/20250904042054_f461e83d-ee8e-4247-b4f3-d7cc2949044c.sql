-- Mettre à jour le bucket inventory-photos pour qu'il soit public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'inventory-photos';

-- Créer les politiques RLS pour l'accès aux photos d'inventaires
CREATE POLICY "Owners can view their inventory photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can upload their inventory photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update their inventory photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);