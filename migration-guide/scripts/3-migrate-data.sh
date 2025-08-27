#!/bin/bash

# Minimal Data Migration Script
# Exports data from Supabase and imports to local PostgreSQL

set -e

echo "🚀 Migrating data from Supabase to local PostgreSQL..."

# Configuration
LOCAL_DB="postgresql://rental_user:rental123@localhost:5432/rental_app"
SUPABASE_URL="https://vbpyykdkaoktzuewbzzl.supabase.co"

# Check if required tools are installed
if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl first."
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Please install PostgreSQL client first."
    exit 1
fi

# Prompt for Supabase credentials
echo "📝 Enter your Supabase credentials:"
read -p "Supabase Service Role Key: " SUPABASE_SERVICE_KEY

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Service role key is required"
    exit 1
fi

echo ""
echo "📊 Fetching data from Supabase..."

# Create temporary directory for data
mkdir -p ./migration-data
cd ./migration-data

# Export profiles data
echo "  → Exporting profiles..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/profiles?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicHl5a2RrYW9rdHp1ZXdienpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzA2MTQsImV4cCI6MjA3MTg0NjYxNH0.FIh_pXKyNfeR2qm8my6bLENe-8HwM7hrEckNwaKR9s4" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" > profiles.json

# Export properties data
echo "  → Exporting properties..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/properties?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicHl5a2RrYW9rdHp1ZXdienpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzA2MTQsImV4cCI6MjA3MTg0NjYxNH0.FIh_pXKyNfeR2qm8my6bLENe-8HwM7hrEckNwaKR9s4" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" > properties.json

# Export tenants data
echo "  → Exporting tenants..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/tenants?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicHl5a2RrYW9rdHp1ZXdienpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzA2MTQsImV4cCI6MjA3MTg0NjYxNH0.FIh_pXKyNfeR2qm8my6bLENe-8HwM7hrEckNwaKR9s4" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" > tenants.json

# Export leases data
echo "  → Exporting leases..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/leases?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicHl5a2RrYW9rdHp1ZXdienpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzA2MTQsImV4cCI6MjA3MTg0NjYxNH0.FIh_pXKyNfeR2qm8my6bLENe-8HwM7hrEckNwaKR9s4" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" > leases.json

# Export rents data
echo "  → Exporting rents..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/rents?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicHl5a2RrYW9rdHp1ZXdienpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzA2MTQsImV4cCI6MjA3MTg0NjYxNH0.FIh_pXKyNfeR2qm8my6bLENe-8HwM7hrEckNwaKR9s4" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" > rents.json

echo ""
echo "📥 Importing data to local PostgreSQL..."

# Create import script
cat > import_data.js << 'EOF'
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://rental_user:rental123@localhost:5432/rental_app'
});

async function importData() {
  try {
    // Import profiles (users need dummy passwords for local auth)
    const profiles = JSON.parse(fs.readFileSync('profiles.json', 'utf8'));
    console.log(`Importing ${profiles.length} profiles...`);
    
    for (const profile of profiles) {
      // Set a default password hash (user will need to reset)
      const defaultPasswordHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbNvQXYA6K9jXam'; // "password123"
      
      await pool.query(
        'INSERT INTO profiles (user_id, email, password_hash, first_name, last_name, user_type) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id) DO NOTHING',
        [profile.user_id, profile.email, defaultPasswordHash, profile.first_name, profile.last_name, profile.user_type]
      );
    }

    // Import properties
    const properties = JSON.parse(fs.readFileSync('properties.json', 'utf8'));
    console.log(`Importing ${properties.length} properties...`);
    
    for (const property of properties) {
      await pool.query(
        'INSERT INTO properties (id, owner_id, name, address) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [property.id, property.owner_id, property.name, property.address]
      );
    }

    // Import tenants
    const tenants = JSON.parse(fs.readFileSync('tenants.json', 'utf8'));
    console.log(`Importing ${tenants.length} tenants...`);
    
    for (const tenant of tenants) {
      await pool.query(
        'INSERT INTO tenants (id, email, first_name, last_name, phone) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [tenant.id, tenant.email, tenant.first_name, tenant.last_name, tenant.phone]
      );
    }

    // Import leases
    const leases = JSON.parse(fs.readFileSync('leases.json', 'utf8'));
    console.log(`Importing ${leases.length} leases...`);
    
    for (const lease of leases) {
      await pool.query(
        'INSERT INTO leases (id, property_id, tenant_id, monthly_rent, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
        [lease.id, lease.property_id, lease.tenant_id, lease.monthly_rent, lease.start_date, lease.end_date, lease.status]
      );
    }

    // Import rents
    const rents = JSON.parse(fs.readFileSync('rents.json', 'utf8'));
    console.log(`Importing ${rents.length} rents...`);
    
    for (const rent of rents) {
      await pool.query(
        'INSERT INTO rents (id, lease_id, amount, due_date, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [rent.id, rent.lease_id, rent.amount, rent.due_date, rent.status]
      );
    }

    console.log('✅ Data migration completed successfully!');
    console.log('');
    console.log('⚠️  IMPORTANT: All users have been given the default password "password123"');
    console.log('   Users will need to log in and change their passwords.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

importData();
EOF

# Install pg for the import script
if [ ! -d "node_modules" ]; then
    npm init -y > /dev/null 2>&1
    npm install pg > /dev/null 2>&1
fi

# Run the import
node import_data.js

# Clean up
cd ..
rm -rf migration-data

echo ""
echo "✅ Migration complete!"
echo ""
echo "⚠️  IMPORTANT NOTES:"
echo "  • All users have the default password: password123"
echo "  • Users should log in and change their passwords"
echo "  • Test the application thoroughly before going live"