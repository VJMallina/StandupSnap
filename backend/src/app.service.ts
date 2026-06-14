import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantService } from './tenant/tenant.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenantService: TenantService,
  ) {}

  getHello(): string {
    return 'Welcome to StandupSnap API!';
  }

  /**
   * Removes the stale 'mom' value from scrum_rooms_type_enum if present.
   * PostgreSQL does not support DROP VALUE on an enum; the 3-step approach is:
   *   1. Null/update any rows that use the stale value.
   *   2. Create a new enum type with the correct values.
   *   3. ALTER COLUMN to use the new type, then rename.
   * Idempotent — safe to run on every startup.
   */
  private async migrateScrumRoomsEnum(schemaName: string): Promise<void> {
    const rows = await this.dataSource.query<{ enumlabel: string }[]>(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       JOIN pg_namespace n ON t.typnamespace = n.oid
       WHERE n.nspname = $1
         AND t.typname = 'scrum_rooms_type_enum'`,
      [schemaName],
    );

    const staleValues = rows
      .map((r) => r.enumlabel)
      .filter((v) => !['planning_poker', 'retrospective', 'sprint_planning', 'refinement'].includes(v));

    if (!staleValues.length) return;

    this.logger.log(
      `Migrating scrum_rooms_type_enum in ${schemaName}: removing stale values [${staleValues.join(', ')}]`,
    );

    // Reassign any rows using a stale value to the closest valid value.
    await this.dataSource.query(`
      UPDATE "${schemaName}".scrum_rooms
      SET type = 'planning_poker'
      WHERE type::text = ANY($1)
    `, [staleValues]);

    // 3-step enum recreation (PostgreSQL does not support DROP VALUE).
    await this.dataSource.query(`
      CREATE TYPE "${schemaName}".scrum_rooms_type_enum_new
      AS ENUM ('planning_poker', 'retrospective', 'sprint_planning', 'refinement')
    `);
    await this.dataSource.query(`
      ALTER TABLE "${schemaName}".scrum_rooms
      ALTER COLUMN type TYPE "${schemaName}".scrum_rooms_type_enum_new
      USING type::text::"${schemaName}".scrum_rooms_type_enum_new
    `);
    await this.dataSource.query(`DROP TYPE "${schemaName}".scrum_rooms_type_enum`);
    await this.dataSource.query(`
      ALTER TYPE "${schemaName}".scrum_rooms_type_enum_new
      RENAME TO scrum_rooms_type_enum
    `);

    this.logger.log(`scrum_rooms_type_enum migration complete for ${schemaName}`);
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      // Ensure the soft-delete column exists (idempotent — safe to run on every startup)
      await this.dataSource.query(`
        ALTER TABLE public.organizations
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
      `);

      const orgs = await this.dataSource.query<{ slug: string }[]>(
        `SELECT slug FROM public.organizations WHERE deleted_at IS NULL`,
      );
      if (!orgs.length) return;

      // Pre-sync enum migrations — must run before createOrgSchema so TypeORM
      // sync sees the correct enum values and doesn't fail mid-transaction.
      for (const { slug } of orgs) {
        await this.migrateScrumRoomsEnum(this.tenantService.toSchemaName(slug));
      }

      this.logger.log(`Syncing tenant schemas for ${orgs.length} org(s)...`);
      await Promise.all(orgs.map(({ slug }) => this.tenantService.createOrgSchema(slug)));
      this.logger.log('All tenant schemas are up to date.');

      for (const { slug } of orgs) {
        const schemaName = this.tenantService.toSchemaName(slug);

        // Drop any DB-level FK constraints on cards.assignee_id / reporter_id.
        // These were created by TypeORM before createForeignKeyConstraints: false was
        // added to Card.assignee and Card.reporter. Cross-schema FKs (tenant → public)
        // are intentionally not enforced at the DB level in this project.
        const staleFks = await this.dataSource.query<{ constraint_name: string }[]>(
          `SELECT kcu.constraint_name
           FROM information_schema.key_column_usage kcu
           JOIN information_schema.table_constraints tc
             ON kcu.constraint_name = tc.constraint_name
            AND kcu.table_schema    = tc.table_schema
           WHERE kcu.table_schema = $1
             AND kcu.table_name   = 'cards'
             AND kcu.column_name  IN ('assignee_id', 'reporter_id')
             AND tc.constraint_type = 'FOREIGN KEY'`,
          [schemaName],
        );
        for (const { constraint_name } of staleFks) {
          await this.dataSource.query(
            `ALTER TABLE "${schemaName}".cards DROP CONSTRAINT IF EXISTS "${constraint_name}"`,
          );
          this.logger.log(`Dropped stale FK constraint: ${schemaName}.cards → ${constraint_name}`);
        }

        // Null out stale assignee_id values that are old TeamMember UUIDs not in public.users.
        await this.dataSource.query(`
          UPDATE "${schemaName}".cards
          SET assignee_id = NULL
          WHERE assignee_id IS NOT NULL
            AND assignee_id NOT IN (SELECT id FROM public.users)
        `);
      }
    } catch (err) {
      this.logger.error('Failed to sync tenant schemas on startup:', err.message);
    }
  }
}
