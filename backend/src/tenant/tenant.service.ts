/**
 * HOW TO MIGRATE A SERVICE TO USE TENANT SCHEMAS
 * ------------------------------------------------
 * Before (single shared DB):
 *   constructor(
 *     @InjectRepository(Project) private projectRepo: Repository<Project>,
 *   ) {}
 *   async findAll(orgId: string) {
 *     return this.projectRepo.find({ where: { organizationId: orgId } });
 *   }
 *
 * After (per-org schema):
 *   constructor(private tenantService: TenantService) {}
 *   async findAll() {
 *     const repo = await this.tenantService.getRepository(Project);
 *     return repo.find();  // no organizationId filter needed — schema IS the org
 *   }
 *
 * TenantService.getRepository() reads the current request's tenant from
 * AsyncLocalStorage (set by TenantMiddleware) and returns a repository scoped
 * to that org's schema.  When there is no tenant context it falls back to the
 * main DataSource so background jobs / admin routes keep working.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { ALL_TENANT_DS_ENTITIES } from './tenant-entities';
import { getCurrentTenant } from './tenant.context';

@Injectable()
export class TenantService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantService.name);
  private readonly cache = new Map<string, DataSource>();

  constructor(
    @InjectDataSource() private readonly mainDataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Called when a new organisation is created.
   * Creates the PostgreSQL schema and synchronises all tenant tables into it.
   */
  async createOrgSchema(orgSlug: string): Promise<void> {
    const schemaName = this.toSchemaName(orgSlug);
    this.logger.log(`Provisioning schema "${schemaName}" for org "${orgSlug}"`);

    // Ensure the schema exists first
    await this.mainDataSource.query(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,
    );

    // Spin up a temporary DataSource scoped to this schema and synchronise
    // all tenant entity tables into it, then tear it down.
    const ds = this.buildDataSource(schemaName, true);
    await ds.initialize();
    await ds.destroy();

    this.logger.log(`Schema "${schemaName}" ready`);
  }

  /**
   * Returns a repository that queries the current request's tenant schema.
   * Falls back to the main DataSource when there is no tenant context
   * (e.g. unauthenticated routes, background jobs).
   */
  async getRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Promise<Repository<T>> {
    const tenant = getCurrentTenant();
    if (!tenant) {
      return this.mainDataSource.getRepository(entity);
    }
    const ds = await this.getTenantDataSource(tenant.orgSlug);
    return ds.getRepository(entity);
  }

  /** Returns a repository backed by the main (public-schema) DataSource. */
  getMainRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Repository<T> {
    return this.mainDataSource.getRepository(entity);
  }

  /**
   * Returns (and caches) a ready DataSource for the given org slug.
   * The DataSource is configured so all queries automatically hit the
   * correct per-org schema via PostgreSQL's search_path.
   */
  async getTenantDataSource(orgSlug: string): Promise<DataSource> {
    const cached = this.cache.get(orgSlug);
    if (cached?.isInitialized) return cached;

    const schemaName = this.toSchemaName(orgSlug);
    const ds = this.buildDataSource(schemaName, false);
    await ds.initialize();
    this.cache.set(orgSlug, ds);
    return ds;
  }

  /** Converts an org slug to a safe PostgreSQL schema name. */
  toSchemaName(orgSlug: string): string {
    return `org_${orgSlug.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private buildDataSource(schemaName: string, synchronize: boolean): DataSource {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const isProd = process.env.NODE_ENV === 'production';
    const useSsl =
      isProd || this.configService.get('DATABASE_SSL') === 'true'
        ? { rejectUnauthorized: false }
        : false;

    const baseOptions = databaseUrl
      ? { type: 'postgres' as const, url: databaseUrl, ssl: useSsl }
      : {
          type: 'postgres' as const,
          host: this.configService.get<string>('DATABASE_HOST'),
          port: +this.configService.get<string>('DATABASE_PORT'),
          username: this.configService.get<string>('DATABASE_USER'),
          password: this.configService.get<string>('DATABASE_PASSWORD'),
          database: this.configService.get<string>('DATABASE_NAME'),
          ssl: useSsl,
        };

    return new DataSource({
      ...baseOptions,
      schema: schemaName,
      // ALL_TENANT_DS_ENTITIES is used for both sync and query DataSources.
      // SHARED_ENTITIES (User, Organization, etc.) carry @Entity({ schema: 'public' })
      // so TypeORM knows they live in public and will not try to recreate them in the
      // org schema. They must be included so TypeORM can resolve inverse back-references
      // (e.g. StandupUpdate → user.standupUpdates, ProjectMember → user.projectMemberships).
      // Cross-schema FK constraints that could violate referential integrity are
      // suppressed with createForeignKeyConstraints: false on the relevant @ManyToOne
      // decorators (Card.assignee, Card.reporter) and cleaned up on startup.
      entities: ALL_TENANT_DS_ENTITIES,
      synchronize,
      logging: false,
      extra: {
        max: 5,
        min: 1,
        idleTimeoutMillis: 30_000,
        // Neon (and PgBouncer in general) blocks startup-parameter search_path.
        // TypeORM's `schema` option above handles isolation by schema-qualifying
        // every query: SELECT * FROM "org_acme"."projects" …
        // Cross-schema FK columns (e.g. user_id → public.users) are created as
        // plain UUID columns without DB-level FK constraints; referential
        // integrity is enforced at the application layer.
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    for (const [slug, ds] of this.cache) {
      if (ds.isInitialized) {
        await ds.destroy();
        this.logger.log(`Closed tenant connection for org: ${slug}`);
      }
    }
    this.cache.clear();
  }
}
