/**
 * One-time script: provisions an isolated PostgreSQL schema for every
 * existing organization that was created before schema-per-tenant was added.
 *
 * Run: npm run provision:schemas
 */
import { DataSource, IsNull } from 'typeorm';
import * as dotenv from 'dotenv';
import { Organization } from '../entities/organization.entity';
import { ALL_TENANT_DS_ENTITIES } from '../tenant/tenant-entities';

dotenv.config();

function toSchemaName(slug: string): string {
  return `org_${slug.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

async function buildTenantDataSource(schemaName: string): Promise<DataSource> {
  const databaseUrl = process.env.DATABASE_URL;
  const useSsl =
    process.env.NODE_ENV === 'production' || process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false;

  const baseOptions: any = databaseUrl
    ? { type: 'postgres', url: databaseUrl, ssl: useSsl }
    : {
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'standupsnap',
        ssl: useSsl,
      };

  return new DataSource({
    ...baseOptions,
    schema: schemaName,
    entities: ALL_TENANT_DS_ENTITIES,
    synchronize: true,
    logging: false,
    extra: {
      max: 2,
    },
  });
}

async function run() {
  console.log('🏗  Provisioning tenant schemas for existing organisations...\n');

  const databaseUrl = process.env.DATABASE_URL;
  const useSsl =
    process.env.NODE_ENV === 'production' || process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false;

  const mainDs = new DataSource(
    databaseUrl
      ? {
          type: 'postgres',
          url: databaseUrl,
          ssl: useSsl,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: false,
        }
      : {
          type: 'postgres',
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '5432', 10),
          username: process.env.DATABASE_USER || 'postgres',
          password: process.env.DATABASE_PASSWORD || 'postgres',
          database: process.env.DATABASE_NAME || 'standupsnap',
          ssl: useSsl,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: false,
        },
  );

  await mainDs.initialize();

  const orgs = await mainDs.getRepository(Organization).find({
    where: { deletedAt: IsNull() },
    select: ['id', 'name', 'slug'],
  });

  console.log(`Found ${orgs.length} organisation(s)\n`);

  let success = 0;
  let failed = 0;

  for (const org of orgs) {
    const schemaName = toSchemaName(org.slug);
    process.stdout.write(`  ${org.name} (${org.slug}) → "${schemaName}" ... `);

    try {
      await mainDs.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

      const tenantDs = await buildTenantDataSource(schemaName);
      await tenantDs.initialize();
      await tenantDs.destroy();

      console.log('✓');
      success++;
    } catch (err: any) {
      console.log(`✗  ${err.message}`);
      failed++;
    }
  }

  await mainDs.destroy();

  console.log(`\n✅ Done — ${success} provisioned, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
