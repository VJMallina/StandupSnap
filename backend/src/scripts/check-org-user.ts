import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkOrgUser() {
  const userId = '4d1b593a-0a61-4d04-9305-f195af294304';

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'standupsnap',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('Connected to database\n');

    // Check if user exists
    const user = await dataSource.query(
      `SELECT id, username, email FROM users WHERE id = $1`,
      [userId]
    );
    console.log('User:', user);

    // Check organizations
    const orgs = await dataSource.query(`SELECT * FROM organizations`);
    console.log('\nOrganizations:', orgs);

    // Check org_roles
    const roles = await dataSource.query(`SELECT id, name, is_system FROM org_roles`);
    console.log('\nOrg Roles:', roles);

    // Check org_users for this user
    const orgUsers = await dataSource.query(
      `SELECT * FROM org_users WHERE user_id = $1`,
      [userId]
    );
    console.log('\nOrg Users for this user:', orgUsers);

    // Check all org_users
    const allOrgUsers = await dataSource.query(`SELECT * FROM org_users`);
    console.log('\nAll Org Users:', allOrgUsers);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

checkOrgUser();
