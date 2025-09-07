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
    console.log(`Importing ${Array.isArray(profiles) ? profiles.length : 0} profiles...`);

    if (Array.isArray(profiles)) {
      for (const profile of profiles) {
        // Set a default password hash (user will need to reset) -> "password123"
        const defaultPasswordHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbNvQXYA6K9jXam';

        await pool.query(
          'INSERT INTO profiles (user_id, email, password_hash, first_name, last_name, user_type) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id) DO NOTHING',
          [profile.user_id, profile.email, defaultPasswordHash, profile.first_name, profile.last_name, profile.user_type || 'proprietaire']
        );
      }
    }

    // Import properties (map to local schema: title, address, city, postal_code, rent_amount, property_type)
    const properties = JSON.parse(fs.readFileSync('properties.json', 'utf8'));
    console.log(`Importing ${Array.isArray(properties) ? properties.length : 0} properties...`);

    if (Array.isArray(properties)) {
      for (const property of properties) {
        await pool.query(
          `INSERT INTO properties (
            id, owner_id, property_type, title, address, city, postal_code,
            rent_amount, charges_amount, deposit_amount, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (id) DO NOTHING`,
          [
            property.id,
            property.owner_id,
            property.property_type || 'appartement',
            property.title || property.name || 'Sans titre',
            property.address || '',
            property.city || '',
            property.postal_code || '',
            property.rent_amount ?? property.monthly_rent ?? 0,
            property.charges_amount ?? 0,
            property.deposit_amount ?? null,
            property.status || 'disponible'
          ]
        );
      }
    }

    // Import tenants (ensure owner_id exists in local schema)
    const tenants = JSON.parse(fs.readFileSync('tenants.json', 'utf8'));
    console.log(`Importing ${Array.isArray(tenants) ? tenants.length : 0} tenants...`);

    if (Array.isArray(tenants)) {
      for (const tenant of tenants) {
        await pool.query(
          'INSERT INTO tenants (id, owner_id, email, first_name, last_name, phone) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
          [tenant.id, tenant.owner_id, tenant.email, tenant.first_name, tenant.last_name, tenant.phone]
        );
      }
    }

    // Import leases (map monthly_rent -> rent_amount, add owner_id, lease_type, status)
    const leases = JSON.parse(fs.readFileSync('leases.json', 'utf8'));
    console.log(`Importing ${Array.isArray(leases) ? leases.length : 0} leases...`);

    if (Array.isArray(leases)) {
      for (const lease of leases) {
        await pool.query(
          `INSERT INTO leases (
            id, owner_id, property_id, tenant_id, rent_amount, start_date, end_date,
            lease_type, status, tenant_phone
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (id) DO NOTHING`,
          [
            lease.id,
            lease.owner_id,
            lease.property_id,
            lease.tenant_id,
            lease.rent_amount ?? lease.monthly_rent ?? 0,
            lease.start_date,
            lease.end_date ?? null,
            lease.lease_type || 'residence_principale',
            lease.status || 'brouillon',
            lease.tenant_phone ?? null
          ]
        );
      }
    }

    // Import rents (compute total_amount if missing)
    const rents = JSON.parse(fs.readFileSync('rents.json', 'utf8'));
    console.log(`Importing ${Array.isArray(rents) ? rents.length : 0} rents...`);

    if (Array.isArray(rents)) {
      for (const rent of rents) {
        const rentAmount = rent.rent_amount ?? rent.amount ?? 0;
        const chargesAmount = rent.charges_amount ?? 0;
        const totalAmount = rent.total_amount ?? (Number(rentAmount) + Number(chargesAmount));

        await pool.query(
          `INSERT INTO rents (
            id, owner_id, lease_id, period_start, period_end, rent_amount,
            charges_amount, total_amount, due_date, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (id) DO NOTHING`,
          [
            rent.id,
            rent.owner_id,
            rent.lease_id,
            rent.period_start,
            rent.period_end,
            rentAmount,
            chargesAmount,
            totalAmount,
            rent.due_date,
            rent.status || 'en_attente'
          ]
        );
      }
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