import { DataSource } from 'typeorm';
import { seedRoles } from './seeders/role.seeder';

export async function runSeeders(dataSource: DataSource): Promise<void> {
  console.log('🌱 Starting database seeding...');

  try {
    await seedRoles(dataSource);
    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}
