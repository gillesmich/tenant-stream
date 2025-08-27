#!/bin/bash

# Minimal Backend Setup Script
# Creates a basic Node.js + Express backend

set -e

echo "🚀 Setting up minimal Node.js backend..."

# Create backend directory
mkdir -p rental-backend
cd rental-backend

# Initialize package.json
cat > package.json << 'EOF'
{
  "name": "rental-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://rental_user:rental123@localhost:5432/rental_app
JWT_SECRET=your_jwt_secret_change_this_in_production
PORT=3001
EOF

# Create minimal server.js
cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// AUTH ROUTES
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, first_name, last_name, user_type } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await pool.query(
      'INSERT INTO profiles (email, password_hash, first_name, last_name, user_type) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email, first_name, last_name, user_type',
      [email, hashedPassword, first_name, last_name, user_type || 'proprietaire']
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.user_id, email: user.email }, process.env.JWT_SECRET);
    
    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.user_id, email: user.email }, process.env.JWT_SECRET);
    
    res.json({ token, user: { id: user.user_id, email: user.email, first_name: user.first_name, last_name: user.last_name, user_type: user.user_type } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD ROUTES
app.get('/api/properties', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM properties WHERE owner_id = $1', [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/properties', authenticateToken, async (req, res) => {
  try {
    const { name, address } = req.body;
    const result = await pool.query(
      'INSERT INTO properties (owner_id, name, address) VALUES ($1, $2, $3) RETURNING *',
      [req.user.userId, name, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tenants', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tenants');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tenants', authenticateToken, async (req, res) => {
  try {
    const { email, first_name, last_name, phone } = req.body;
    const result = await pool.query(
      'INSERT INTO tenants (email, first_name, last_name, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, first_name, last_name, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leases', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, p.name as property_name, t.first_name, t.last_name 
      FROM leases l 
      JOIN properties p ON l.property_id = p.id 
      JOIN tenants t ON l.tenant_id = t.id 
      WHERE p.owner_id = $1
    `, [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leases', authenticateToken, async (req, res) => {
  try {
    const { property_id, tenant_id, monthly_rent, start_date, end_date } = req.body;
    const result = await pool.query(
      'INSERT INTO leases (property_id, tenant_id, monthly_rent, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [property_id, tenant_id, monthly_rent, start_date, end_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rents', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, l.monthly_rent, p.name as property_name, t.first_name, t.last_name 
      FROM rents r 
      JOIN leases l ON r.lease_id = l.id 
      JOIN properties p ON l.property_id = p.id 
      JOIN tenants t ON l.tenant_id = t.id 
      WHERE p.owner_id = $1
    `, [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rents', authenticateToken, async (req, res) => {
  try {
    const { lease_id, amount, due_date } = req.body;
    const result = await pool.query(
      'INSERT INTO rents (lease_id, amount, due_date) VALUES ($1, $2, $3) RETURNING *',
      [lease_id, amount, due_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
EOF

echo "✅ Backend setup complete!"
echo ""
echo "🔥 To start the server:"
echo "  cd rental-backend"
echo "  npm run dev"
echo ""
echo "📋 API will be available at: http://localhost:3001"