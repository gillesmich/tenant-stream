#!/bin/bash

# Minimal PostgreSQL Setup Script
# Run this first to set up your local database

set -e

echo "🚀 Setting up PostgreSQL database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Installing..."
    
    # Detect OS and install PostgreSQL
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt update
        sudo apt install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install postgresql
        brew services start postgresql
    else
        echo "❌ Unsupported OS. Please install PostgreSQL manually."
        exit 1
    fi
fi

# Database configuration
DB_NAME="rental_app"
DB_USER="rental_user"
DB_PASSWORD="rental123"

echo "📝 Creating database and user..."

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF

echo "📋 Creating essential tables..."

# Create minimal schema (only essential tables) - Fixed with TCP connection
PGPASSWORD=$DB_PASSWORD psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME << 'EOF'
-- Users/Profiles
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  user_type VARCHAR(20) DEFAULT 'proprietaire',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(user_id),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leases (simplified)
CREATE TABLE leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  tenant_id UUID REFERENCES tenants(id),
  monthly_rent DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rents (simplified)
CREATE TABLE rents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id),
  amount DECIMAL(10,2),
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

EOF

echo "✅ Database setup complete!"
echo ""
echo "📋 Connection details:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo "  Connection: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"