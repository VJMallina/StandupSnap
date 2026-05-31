import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixOrgUsersColumns() {
  console.log('🔧 Fixing org_users table columns...\n');

  const databaseUrl = process.env.DATABASE_URL;

  const dataSource = new DataSource(
    databaseUrl
      ? {
          type: 'postgres',
          url: databaseUrl,
          synchronize: false,
          logging: true,
          ssl: { rejectUnauthorized: false },
        }
      : {
          type: 'postgres',
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '5432', 10),
          username: process.env.DATABASE_USER || 'postgres',
          password: process.env.DATABASE_PASSWORD || 'postgres',
          database: process.env.DATABASE_NAME || 'standupsnap',
          synchronize: false,
          logging: true,
          ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        }
  );

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    // Check current columns
    console.log('📋 Current columns in org_users:');
    const columns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'org_users'
      ORDER BY ordinal_position
    `);
    console.table(columns);

    // Drop duplicate camelCase columns from org_users if they exist
    const duplicateColumns = ['organizationId', 'userId', 'orgRoleId', 'invitedById'];

    for (const col of duplicateColumns) {
      const exists = columns.find((c: any) => c.column_name === col);
      if (exists) {
        console.log(`\n🗑️  Dropping duplicate column from org_users: ${col}`);
        await dataSource.query(`ALTER TABLE org_users DROP COLUMN IF EXISTS "${col}"`);
        console.log(`✅ Dropped ${col}`);
      }
    }

    // Fix org_roles table too
    console.log('\n📋 Checking org_roles columns:');
    const roleColumns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'org_roles'
      ORDER BY ordinal_position
    `);
    console.table(roleColumns);

    const roleDuplicateColumns = ['organizationId', 'createdById'];
    for (const col of roleDuplicateColumns) {
      const exists = roleColumns.find((c: any) => c.column_name === col);
      if (exists) {
        console.log(`\n🗑️  Dropping duplicate column from org_roles: ${col}`);
        await dataSource.query(`ALTER TABLE org_roles DROP COLUMN IF EXISTS "${col}"`);
        console.log(`✅ Dropped ${col}`);
      }
    }

    // Clear existing org_users to allow fresh migration
    console.log('\n🧹 Clearing existing org_users records...');
    await dataSource.query(`DELETE FROM org_users`);
    console.log('✅ Cleared org_users table');

    // Verify final structure
    console.log('\n📋 Final columns in org_users:');
    const finalColumns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'org_users'
      ORDER BY ordinal_position
    `);
    console.table(finalColumns);

    console.log('\n📋 Final columns in org_roles:');
    const finalRoleColumns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'org_roles'
      ORDER BY ordinal_position
    `);
    console.table(finalRoleColumns);

    console.log('\n✅ Fix completed! Now run: npm run migrate:users');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

fixOrgUsersColumns();
