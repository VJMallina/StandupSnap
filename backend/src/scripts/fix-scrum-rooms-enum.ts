/**
 * Fix scrum_rooms type column after MOM removal.
 * Recreates the enum with the 4 valid values and converts the varchar column back to it.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/fix-scrum-rooms-enum.ts
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
  console.log('Connected to database.');

  await ds.query(`
    CREATE TYPE "public"."scrum_rooms_type_enum" AS ENUM (
      'planning_poker', 'retrospective', 'sprint_planning', 'refinement'
    );
  `);
  console.log('Enum created.');

  await ds.query(`
    ALTER TABLE scrum_rooms
      ALTER COLUMN type TYPE "public"."scrum_rooms_type_enum"
      USING type::"public"."scrum_rooms_type_enum";
  `);
  console.log('Column converted. Done — restart the backend.');

  await ds.destroy();
}

run().catch(err => { console.error(err); process.exit(1); });
