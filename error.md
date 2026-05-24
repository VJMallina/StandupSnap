query: ALTER TABLE "org_invitations" ALTER COLUMN "organization_id" SET NOT NULL
query failed: ALTER TABLE "org_invitations" ALTER COLUMN "organization_id" SET NOT NULL
error: error: column "organization_id" of relation "org_invitations" contains null values
query: ROLLBACK
[Nest] 18980  - 25/05/2026, 2:16:29 am   ERROR [TypeOrmModule] Unable to connect to the database. Retrying (1)...
QueryFailedError: column "organization_id" of relation "org_invitations" contains null values
    at PostgresQueryRunner.query (F:\StandupSnap\backend\node_modules\typeorm\driver\src\driver\postgres\PostgresQueryRunner.ts:325:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at PostgresQueryRunner.executeQueries (F:\StandupSnap\backend\node_modules\typeorm\query-runner\src\query-runner\BaseQueryRunner.ts:681:13)
    at PostgresQueryRunner.changeColumn (F:\StandupSnap\backend\node_modules\typeorm\driver\src\driver\postgres\PostgresQueryRunner.ts:2307:9)
    at PostgresQueryRunner.changeColumns (F:\StandupSnap\backend\node_modules\typeorm\driver\src\driver\postgres\PostgresQueryRunner.ts:2319:13)
    at RdbmsSchemaBuilder.updateExistColumns (F:\StandupSnap\backend\node_modules\typeorm\schema-builder\src\schema-builder\RdbmsSchemaBuilder.ts:969:13)
    at RdbmsSchemaBuilder.executeSchemaSyncOperationsInProperOrder (F:\StandupSnap\backend\node_modules\typeorm\schema-builder\src\schema-builder\RdbmsSchemaBuilder.ts:229:9)
    at RdbmsSchemaBuilder.build (F:\StandupSnap\backend\node_modules\typeorm\schema-builder\src\schema-builder\RdbmsSchemaBuilder.ts:95:13)
    at DataSource.synchronize (F:\StandupSnap\backend\node_modules\typeorm\data-source\src\data-source\DataSource.ts:340:9)
    at DataSource.initialize (F:\StandupSnap\backend\node_modules\typeorm\data-source\src\data-source\DataSource.ts:278:43)
query: SELECT version()
query: SELECT * FROM current_schema()
query: CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
query: START TRANSACTION
query: SELECT * FROM current_schema()
query: SELECT * FROM current_database()