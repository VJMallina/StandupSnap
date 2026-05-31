query failed: SELECT "s"."id" AS "s_id", "s"."organizationId" AS "s_organizationId", "s"."name" AS "s_name", "s"."goal" AS "s_goal", "s"."startDate" AS "s_startDate", "s"."endDate" AS "s_endDate", "s"."status" AS "s_status", "s"."creationType" AS "s_creationType", "s"."isClosed" AS "s_isClosed", "s"."dailyStandupCount" AS "s_dailyStandupCount", "s"."slotTimes" AS "s_slotTimes", "s"."createdAt" AS "s_createdAt", "s"."updatedAt" AS "s_updatedAt", "s"."deletedAt" AS "s_deletedAt", "s"."organization_id" AS "s_organization_id", "s"."project_id" AS "s_project_id" FROM "sprints" "s" WHERE ( s.projectId = $1 AND "s"."organizationId" = $2 AND "s"."startDate" <= $3 AND "s"."endDate" >= $4 AND "s"."deletedAt" IS NULL ) AND ( "s"."deletedAt" IS NULL ) ORDER BY "s"."startDate" DESC -- PARAMETERS: ["1353bdec-3eea-4358-a362-3b33b4b79e42","f6792f83-c4c1-4285-8566-8a7109c93ec7","2026-05-30","2026-05-26"]
error: error: column s.projectid does not exist
[Nest] 16792  - 31/05/2026, 6:46:22 pm   ERROR [ExceptionsHandler] column s.projectid does not exist
QueryFailedError: column s.projectid does not exist
    at PostgresQueryRunner.query (F:\StandupSnap\backend\node_modules\typeorm\driver\src\driver\postgres\PostgresQueryRunner.ts:325:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at SelectQueryBuilder.loadRawResults (F:\StandupSnap\backend\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:3868:25)
    at SelectQueryBuilder.executeEntitiesAndRawResults (F:\StandupSnap\backend\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:3614:26)
    at SelectQueryBuilder.getRawAndEntities (F:\StandupSnap\backend\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:1671:29)
    at SelectQueryBuilder.getMany (F:\StandupSnap\backend\node_modules\typeorm\query-builder\src\query-builder\SelectQueryBuilder.ts:1761:25)
    at TemplateGeneratorService.generate (F:\StandupSnap\backend\src\canvas-report\template-generator.service.ts:732:21)
    at CanvasReportService.generateFromTemplate (F:\StandupSnap\backend\src\canvas-report\canvas-report.service.ts:101:20)
    at async F:\StandupSnap\backend\node_modules\@nestjs\core\router\router-execution-context.js:46:28
    at async F:\StandupSnap\backend\node_modules\@nestjs\core\router\router-proxy.js:9:17