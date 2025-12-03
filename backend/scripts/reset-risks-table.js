/**
 * Script to drop and recreate the risks table
 * Run with: node scripts/reset-risks-table.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function resetRisksTable() {
  // Parse DATABASE_URL or use individual params
  const databaseUrl = process.env.DATABASE_URL;

  let client;

  if (databaseUrl) {
    client = new Client({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  } else {
    client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'standupsnap',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  }

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Drop the risks table
    console.log('🗑️  Dropping risks table...');
    await client.query('DROP TABLE IF EXISTS risks CASCADE');
    console.log('✅ Risks table dropped successfully');

    console.log('\n✨ Done! Restart your backend server and TypeORM will recreate the table with the new schema.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetRisksTable();
