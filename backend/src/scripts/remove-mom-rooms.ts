/**
 * One-time migration: delete all MOM scrum rooms so the DB enum can be
 * updated by TypeORM synchronize on next startup.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/remove-mom-rooms.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

async function run() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await ds.initialize();

  const result = await ds.query(`DELETE FROM scrum_rooms WHERE type = 'mom'`);
  console.log(`Deleted MOM rooms. Affected rows: ${result[1] ?? 0}`);

  // Also drop and recreate the enum so TypeORM can synchronize cleanly
  await ds.query(`
    ALTER TABLE scrum_rooms
      ALTER COLUMN type TYPE varchar(50);
  `);
  await ds.query(`DROP TYPE IF EXISTS "public"."scrum_rooms_type_enum" CASCADE`);
  console.log('Dropped old enum. TypeORM will recreate it correctly on next startup.');

  await ds.destroy();
}

run().catch(err => { console.error(err); process.exit(1); });
