import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RaciMatrix } from '../entities/raci-matrix.entity';
import { Repository } from 'typeorm';

/**
 * Simple backfill to set createdBy/updatedBy to a given user for matrices missing creator.
 * Usage:
 *   ts-node -r tsconfig-paths/register src/artifacts/raci-matrix.backfill.ts <userId>
 */
async function run() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: ts-node src/artifacts/raci-matrix.backfill.ts <userId>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const raciRepo = app.get<Repository<RaciMatrix>>(getRepositoryToken(RaciMatrix));

  const matrices = await raciRepo.find({ relations: ['createdBy', 'updatedBy'] });
  let updated = 0;

  for (const matrix of matrices) {
    if (!matrix.createdBy || !matrix.updatedBy) {
      matrix.createdBy = matrix.createdBy ?? { id: userId } as any;
      matrix.updatedBy = { id: userId } as any;
      await raciRepo.save(matrix);
      updated++;
    }
  }

  console.log(`Backfill complete. Updated ${updated} matrices.`);
  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
