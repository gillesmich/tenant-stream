-- Fixer les paramètres de sécurité pour l'authentification

-- 1. Réduire l'expiration des OTP à 10 minutes (recommandé)
UPDATE auth.config 
SET value = '600' 
WHERE key = 'otp_expiry';

-- 2. Activer la protection contre les mots de passe compromis
UPDATE auth.config 
SET value = 'true' 
WHERE key = 'password_strength_enable_leaked_password_protection';

-- 3. Configurer une politique de mot de passe forte
UPDATE auth.config 
SET value = '8' 
WHERE key = 'password_strength_min_length';

-- Insérer les configurations si elles n'existent pas
INSERT INTO auth.config (key, value) 
VALUES 
  ('otp_expiry', '600'),
  ('password_strength_enable_leaked_password_protection', 'true'),
  ('password_strength_min_length', '8')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;