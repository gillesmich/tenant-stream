#!/bin/bash

# Script de génération du backend Node.js complet pour l'application de location
# Usage: ./generate-backend.sh

set -e

echo "🚀 Génération du backend Node.js de l'application de location..."

# Créer la structure des dossiers
mkdir -p rental-backend/{src/{controllers,middleware,routes,models,utils},config,uploads}

# Package.json
cat > rental-backend/package.json << 'EOF'
{
  "name": "rental-backend",
  "version": "1.0.0",
  "description": "Backend API pour l'application de gestion locative",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.0",
    "joi": "^17.9.2",
    "compression": "^1.7.4",
    "rate-limiter-flexible": "^3.0.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/bcryptjs": "^2.4.2",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/pg": "^8.10.2",
    "@types/multer": "^1.4.7",
    "@types/uuid": "^9.0.2",
    "@types/compression": "^1.7.2",
    "typescript": "^5.1.6",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.1"
  }
}
EOF

# TypeScript config
cat > rental-backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Configuration environnement
cat > rental-backend/.env << 'EOF'
# Base de données
DATABASE_URL=postgresql://rental_user:rental123@localhost:5432/rental_app
DB_HOST=localhost
DB_PORT=5432
DB_USER=rental_user
DB_PASSWORD=rental123
DB_NAME=rental_app

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Serveur
PORT=3001
NODE_ENV=development

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Sécurité
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
EOF

# Configuration base de données
cat > rental-backend/src/config/database.ts << 'EOF'
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Erreur de connexion PostgreSQL:', err);
});

export default pool;
EOF

# Middleware d'authentification
cat > rental-backend/src/middleware/auth.ts << 'EOF'
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    user_type: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token d\'accès requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.user_type)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    next();
  };
};
EOF

# Contrôleur d'authentification
cat > rental-backend/src/controllers/authController.ts << 'EOF'
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, first_name, last_name, user_type = 'proprietaire' } = req.body;

    // Vérifier si l'utilisateur existe
    const existingUser = await pool.query('SELECT id FROM profiles WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const result = await pool.query(
      'INSERT INTO profiles (email, password_hash, first_name, last_name, user_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, user_type',
      [email, hashedPassword, first_name, last_name, user_type]
    );

    const user = result.rows[0];

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, user_type: user.user_type },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type
      },
      token
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Rechercher l'utilisateur
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, user_type FROM profiles WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, user_type: user.user_type },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type
      },
      token
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(
      'SELECT id, email, first_name, last_name, user_type, phone, company, created_at FROM profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
EOF

# Contrôleur des propriétés
cat > rental-backend/src/controllers/propertyController.ts << 'EOF'
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';

export const getProperties = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      'SELECT * FROM properties WHERE owner_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ properties: result.rows });
  } catch (error) {
    console.error('Erreur lors de la récupération des propriétés:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const createProperty = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      title,
      address,
      city,
      postal_code,
      property_type,
      surface,
      rooms,
      bedrooms,
      furnished,
      rent_amount,
      charges_amount,
      deposit_amount,
      description
    } = req.body;

    const result = await pool.query(
      `INSERT INTO properties (
        owner_id, title, address, city, postal_code, property_type,
        surface, rooms, bedrooms, furnished, rent_amount, charges_amount,
        deposit_amount, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        userId, title, address, city, postal_code, property_type,
        surface, rooms, bedrooms, furnished, rent_amount, charges_amount,
        deposit_amount, description
      ]
    );

    res.status(201).json({
      message: 'Propriété créée avec succès',
      property: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création de la propriété:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const updateProperty = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const propertyId = req.params.id;
    const updateFields = req.body;

    // Vérifier que la propriété appartient à l'utilisateur
    const ownerCheck = await pool.query(
      'SELECT id FROM properties WHERE id = $1 AND owner_id = $2',
      [propertyId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Propriété non trouvée' });
    }

    // Construire la requête de mise à jour dynamiquement
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');

    const values = [propertyId, userId, ...Object.values(updateFields)];

    const result = await pool.query(
      `UPDATE properties SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND owner_id = $2 RETURNING *`,
      values
    );

    res.json({
      message: 'Propriété mise à jour avec succès',
      property: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la propriété:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const deleteProperty = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const propertyId = req.params.id;

    const result = await pool.query(
      'DELETE FROM properties WHERE id = $1 AND owner_id = $2 RETURNING id',
      [propertyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Propriété non trouvée' });
    }

    res.json({ message: 'Propriété supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la propriété:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
EOF

# Routes
cat > rental-backend/src/routes/auth.ts << 'EOF'
import { Router } from 'express';
import { signup, signin, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/profile', authenticateToken, getProfile);

export default router;
EOF

cat > rental-backend/src/routes/properties.ts << 'EOF'
import { Router } from 'express';
import { getProperties, createProperty, updateProperty, deleteProperty } from '../controllers/propertyController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole(['proprietaire']), getProperties);
router.post('/', authenticateToken, requireRole(['proprietaire']), createProperty);
router.put('/:id', authenticateToken, requireRole(['proprietaire']), updateProperty);
router.delete('/:id', authenticateToken, requireRole(['proprietaire']), deleteProperty);

export default router;
EOF

# Serveur principal
cat > rental-backend/src/server.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Routes
import authRoutes from './routes/auth';
import propertyRoutes from './routes/properties';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'middleware',
  points: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60,
});

const rateLimiterMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    await rateLimiter.consume(req.ip!);
    next();
  } catch {
    res.status(429).json({ message: 'Trop de requêtes' });
  }
};

// Middlewares
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiterMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Gestionnaire d'erreurs global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erreur:', err);
  res.status(500).json({ 
    message: 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
EOF

# Script de création de la base de données
cat > rental-backend/setup-database.sql << 'EOF'
-- Création de la base de données et de l'utilisateur
CREATE DATABASE rental_app;
CREATE USER rental_user WITH PASSWORD 'rental123';
GRANT ALL PRIVILEGES ON DATABASE rental_app TO rental_user;

-- Se connecter à la base rental_app pour créer les tables
\c rental_app

-- Table des profils utilisateurs
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    company VARCHAR(200),
    user_type VARCHAR(20) DEFAULT 'proprietaire' CHECK (user_type IN ('proprietaire', 'locataire', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des propriétés
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    property_type VARCHAR(50) NOT NULL,
    surface DECIMAL(8,2),
    rooms INTEGER,
    bedrooms INTEGER,
    furnished BOOLEAN DEFAULT FALSE,
    rent_amount DECIMAL(10,2) NOT NULL,
    charges_amount DECIMAL(10,2) DEFAULT 0,
    deposit_amount DECIMAL(10,2),
    description TEXT,
    status VARCHAR(20) DEFAULT 'disponible' CHECK (status IN ('disponible', 'loue', 'maintenance')),
    available_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des locataires
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    birth_date DATE,
    occupation VARCHAR(200),
    employer VARCHAR(200),
    monthly_income DECIMAL(10,2),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des baux
CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lease_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    rent_amount DECIMAL(10,2) NOT NULL,
    charges_amount DECIMAL(10,2) DEFAULT 0,
    deposit_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'actif', 'termine', 'resilience')),
    signed_by_tenant BOOLEAN DEFAULT FALSE,
    signed_by_owner BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des loyers
CREATE TABLE rents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL,
    charges_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'paye', 'partiel', 'en_retard')),
    paid_date DATE,
    payment_method VARCHAR(50),
    notes TEXT,
    reminder_count INTEGER DEFAULT 0,
    last_reminder_date DATE,
    receipt_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX idx_leases_owner_id ON leases(owner_id);
CREATE INDEX idx_leases_property_id ON leases(property_id);
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_rents_lease_id ON rents(lease_id);
CREATE INDEX idx_rents_owner_id ON rents(owner_id);
CREATE INDEX idx_rents_due_date ON rents(due_date);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON leases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rents_updated_at BEFORE UPDATE ON rents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Donner les permissions à l'utilisateur
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rental_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rental_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO rental_user;
EOF

echo "✅ Backend Node.js généré avec succès dans le dossier rental-backend/"
echo "🗄️  Configuration de la base de données : psql -U postgres -f setup-database.sql"
echo "📦 Installation des dépendances : cd rental-backend && npm install"
echo "🚀 Démarrage : npm run dev"