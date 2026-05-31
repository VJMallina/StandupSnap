import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { seedEnterpriseRoles } from './seeders/enterprise-roles.seeder';

// Load environment variables
dotenv.config();

async function runSeeder() {
  console.log('🌱 Starting database seeder...\n');

  // Create data source
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'standupsnap',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false, // Don't auto-sync during seeding
    logging: false,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Initialize connection
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // Run enterprise roles seeder
    await seedEnterpriseRoles(dataSource);

    console.log('🎉 All seeders completed successfully!\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('📡 Database connection closed');
    }
  }
}

// Run the seeder
runSeeder();
