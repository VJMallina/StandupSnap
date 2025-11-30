import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * One-off migration to add external_members column to raci_matrices.
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/add-external-members-column.ts
 */
async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const dataSource = app.get(DataSource);

  await dataSource.query(
    'ALTER TABLE IF EXISTS raci_matrices ADD COLUMN IF NOT EXISTS external_members json NULL;',
  );

  await app.close();
  console.log('external_members column ensured on raci_matrices');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
