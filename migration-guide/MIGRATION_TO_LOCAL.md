# Migration from Supabase to Local Node.js + PostgreSQL

## Overview

This guide will help you migrate your rental management application from Supabase to a local Node.js backend with PostgreSQL database.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed
- Docker (optional, for containerized setup)
- Basic knowledge of Node.js, Express, and PostgreSQL

## Migration Steps

### 1. Database Migration

#### A. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Windows - Download from https://www.postgresql.org/download/windows/
```

#### B. Create Database and User
```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database and user
CREATE DATABASE rental_app;
CREATE USER rental_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rental_app TO rental_user;

-- Connect to the new database
\c rental_app
```

#### C. Run Database Schema Migration
The database schema is already defined in your Supabase project. You'll need to export and import it:

```bash
# Export from Supabase (requires Supabase CLI)
supabase db dump --db-url "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" > schema.sql

# Import to local PostgreSQL
psql -U rental_user -d rental_app -f schema.sql
```

### 2. Backend Setup

#### A. Initialize Node.js Project
```bash
mkdir rental-app-backend
cd rental-app-backend
npm init -y
```

#### B. Install Dependencies
```bash
npm install express cors helmet dotenv bcryptjs jsonwebtoken
npm install pg @types/pg
npm install multer sharp  # For file uploads
npm install nodemailer    # For email sending
npm install stripe        # For payments
npm install --save-dev nodemon @types/node typescript ts-node
```

#### C. Setup TypeScript
```bash
npx tsc --init
```

### 3. Environment Configuration

Create `.env` file:
```env
# Database
DATABASE_URL=postgresql://rental_user:your_secure_password@localhost:5432/rental_app
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rental_app
DB_USER=rental_user
DB_PASSWORD=your_secure_password

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Email (using nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

### 4. Database Connection

Create `src/config/database.ts`:
```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

### 5. Authentication System

Create `src/middleware/auth.ts`:
```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Get user from database
    const result = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

### 6. API Routes Structure

Create `src/routes/auth.ts`:
```typescript
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

const router = express.Router();

// Sign Up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, first_name, last_name, user_type } = req.body;

    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    const result = await pool.query(
      'INSERT INTO profiles (email, password_hash, first_name, last_name, user_type) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email, first_name, last_name, user_type',
      [email, hashedPassword, first_name, last_name, user_type || 'proprietaire']
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign In
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user
    const result = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        user_type: user.user_type
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 7. Main Server File

Create `src/server.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import propertiesRoutes from './routes/properties';
import tenantsRoutes from './routes/tenants';
import leasesRoutes from './routes/leases';
import rentsRoutes from './routes/rents';
import cautionRoutes from './routes/caution';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/leases', leasesRoutes);
app.use('/api/rents', rentsRoutes);
app.use('/api/caution', cautionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 8. Frontend Migration

#### A. Replace Supabase Client
Create `src/lib/api.ts`:
```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Auth methods
  async signUp(email: string, password: string, userData: any) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...userData }),
    });
  }

  async signIn(email: string, password: string) {
    return this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Properties methods
  async getProperties() {
    return this.request('/properties');
  }

  async createProperty(propertyData: any) {
    return this.request('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  }

  // Add other methods as needed...
}

export const apiClient = new ApiClient();
```

#### B. Update Auth Hook
Replace your `useAuth.tsx`:
```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Validate token and get user info
      apiClient.setToken(token);
      // You might want to call a /me endpoint to get current user
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await apiClient.signIn(email, password);
    apiClient.setToken(response.token);
    setUser(response.user);
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const response = await apiClient.signUp(email, password, userData);
    apiClient.setToken(response.token);
    setUser(response.user);
  };

  const signOut = () => {
    apiClient.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 9. File Upload Setup

Create `src/middleware/upload.ts`:
```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Add file type validation here
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

### 10. Payment Integration

Create `src/routes/payments.ts`:
```typescript
import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'eur', metadata } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      metadata,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

export default router;
```

### 11. Deployment Scripts

Create `deployment/docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: rental_app
      POSTGRES_USER: rental_user
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: .
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    environment:
      - DATABASE_URL=postgresql://rental_user:your_secure_password@postgres:5432/rental_app
    volumes:
      - ./uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 12. Migration Checklist

- [ ] Export Supabase database schema and data
- [ ] Set up local PostgreSQL database
- [ ] Create Node.js backend with all API endpoints
- [ ] Replace Supabase auth with JWT authentication
- [ ] Migrate file uploads to local storage or cloud provider
- [ ] Update all frontend API calls
- [ ] Test all functionality locally
- [ ] Set up production deployment
- [ ] Update DNS and environment variables
- [ ] Migrate any scheduled jobs/cron functions

## Important Notes

1. **Data Migration**: Export your existing data from Supabase before starting the migration
2. **Authentication**: You'll need to handle password resets, email verification manually
3. **Real-time Features**: You'll need to implement WebSocket support if you used Supabase real-time
4. **File Storage**: Consider using AWS S3, Google Cloud Storage, or local file system
5. **Monitoring**: Set up logging and monitoring for your local infrastructure
6. **Backup**: Implement regular database backups
7. **Security**: Ensure proper security measures (HTTPS, rate limiting, input validation)

## Estimated Timeline

- **Basic Setup**: 2-3 days
- **API Migration**: 1-2 weeks
- **Frontend Updates**: 3-5 days
- **Testing & Debugging**: 1 week
- **Production Deployment**: 2-3 days

**Total Estimated Time**: 3-4 weeks for a complete migration

This migration provides you with full control over your data and infrastructure while maintaining the same functionality as your current Supabase-based application.