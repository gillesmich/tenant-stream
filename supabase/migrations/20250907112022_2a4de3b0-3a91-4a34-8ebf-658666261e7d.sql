-- Correction de l'email incorrect dans la table tenants
UPDATE tenants 
SET email = 'giloumichou0@gmail.com' 
WHERE email = 'giloumichou0@gmail.com.com';