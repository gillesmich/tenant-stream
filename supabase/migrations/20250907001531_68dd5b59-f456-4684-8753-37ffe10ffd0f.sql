-- Ajouter les champs d'adresse à la table profiles pour les bailleurs
ALTER TABLE public.profiles 
ADD COLUMN address_line1 TEXT,
ADD COLUMN address_line2 TEXT,
ADD COLUMN city TEXT,
ADD COLUMN postal_code TEXT,
ADD COLUMN country TEXT DEFAULT 'France';