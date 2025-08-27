// Data migration script from Supabase to local PostgreSQL
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase connection (source)
const supabasePool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Local PostgreSQL connection (destination)
const localPool = new Pool({
  host: process.env.LOCAL_DB_HOST || 'localhost',
  port: process.env.LOCAL_DB_PORT || 5432,
  database: process.env.LOCAL_DB_NAME || 'rental_app',
  user: process.env.LOCAL_DB_USER || 'rental_user',
  password: process.env.LOCAL_DB_PASSWORD,
});

const tables = [
  'profiles',
  'user_roles',
  'properties',
  'tenants',
  'tenant_profiles',
  'leases',
  'rents',
  'documents',
  'caution_requests',
  'caution_payments',
  'verification_codes'
];

async function migrateTable(tableName) {
  console.log(`Migrating table: ${tableName}`);
  
  try {
    // Get data from Supabase
    const sourceResult = await supabasePool.query(`SELECT * FROM ${tableName}`);
    const rows = sourceResult.rows;
    
    if (rows.length === 0) {
      console.log(`No data found in ${tableName}`);
      return;
    }

    // Get column names
    const columns = Object.keys(rows[0]);
    const columnList = columns.join(', ');
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

    // Insert data into local database
    for (const row of rows) {
      const values = columns.map(col => row[col]);
      const query = `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      
      try {
        await localPool.query(query, values);
      } catch (error) {
        console.error(`Error inserting row in ${tableName}:`, error.message);
        console.error('Row data:', values);
      }
    }

    console.log(`✅ Migrated ${rows.length} rows from ${tableName}`);
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error.message);
  }
}

async function migrateAllData() {
  console.log('Starting data migration from Supabase to local PostgreSQL...\n');

  // Test connections
  try {
    await supabasePool.query('SELECT 1');
    console.log('✅ Connected to Supabase');
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    return;
  }

  try {
    await localPool.query('SELECT 1');
    console.log('✅ Connected to local PostgreSQL');
  } catch (error) {
    console.error('❌ Failed to connect to local PostgreSQL:', error.message);
    return;
  }

  console.log('\n--- Starting table migration ---\n');

  // Migrate tables in order (respecting foreign key dependencies)
  for (const table of tables) {
    await migrateTable(table);
  }

  console.log('\n--- Migration completed ---');
  
  // Close connections
  await supabasePool.end();
  await localPool.end();
}

// Run migration
if (require.main === module) {
  migrateAllData().catch(console.error);
}

module.exports = { migrateAllData, migrateTable };