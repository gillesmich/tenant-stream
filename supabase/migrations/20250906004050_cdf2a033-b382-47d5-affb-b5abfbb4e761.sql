-- Corriger l'utilisateur gillesmich@yahoo.fr en tant que locataire
-- D'abord, mettre à jour le type d'utilisateur dans profiles
UPDATE profiles 
SET user_type = 'locataire' 
WHERE email = 'gillesmich@yahoo.fr';

-- Ensuite, ajouter le rôle dans user_roles s'il n'existe pas
INSERT INTO user_roles (user_id, role) 
SELECT user_id, 'locataire' 
FROM profiles 
WHERE email = 'gillesmich@yahoo.fr'
ON CONFLICT (user_id, role) DO NOTHING;