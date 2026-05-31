/**
 * Shared entities live in the `public` schema (declared explicitly on each
 * entity class with `@Entity({ schema: 'public', name: '...' })`).
 * They are included here so TypeORM has their metadata when resolving FK
 * relations from tenant entities (e.g. StandupUpdate → User).
 * TypeORM will not try to create/alter these tables in the org schema.
 */
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { OrgUser } from '../entities/org-user.entity';
import { OrgRole } from '../entities/org-role.entity';
import { Role } from '../entities/role.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { PermissionKey } from '../entities/permission-key.entity';
import { Invitation } from '../entities/invitation.entity';
import { OrgInvitation } from '../entities/org-invitation.entity';
import { OrgDomainVerification } from '../entities/org-domain-verification.entity';

export const SHARED_ENTITIES = [
  User,
  Organization,
  OrgUser,
  OrgRole,
  Role,
  RefreshToken,
  RolePermission,
  PermissionKey,
  Invitation,
  OrgInvitation,
  OrgDomainVerification,
];

import { Project } from '../entities/project.entity';
import { Sprint } from '../entities/sprint.entity';
import { Card } from '../entities/card.entity';
import { CardRAGHistory } from '../entities/card-rag-history.entity';
import { CardAssignmentHistory } from '../entities/card-assignment-history.entity';
import { CardComment } from '../entities/card-comment.entity';
import { Snap } from '../entities/snap.entity';
import { StandupUpdate } from '../entities/standup-update.entity';
import { DailySummary } from '../entities/daily-summary.entity';
import { DailySnapLock } from '../entities/daily-snap-lock.entity';
import { DailyLock } from '../entities/daily-lock.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { ScrumRoom } from '../entities/scrum-room.entity';
import { Assumption } from '../entities/assumption.entity';
import { Change } from '../entities/change.entity';
import { Decision } from '../entities/decision.entity';
import { Issue } from '../entities/issue.entity';
import { Risk } from '../entities/risk.entity';
import { RiskHistory } from '../entities/risk-history.entity';
import { Stakeholder } from '../entities/stakeholder.entity';
import { RaciMatrix } from '../entities/raci-matrix.entity';
import { RaciEntry } from '../entities/raci-entry.entity';
import { Mom } from '../entities/mom.entity';
import { StandaloneMom } from '../entities/standalone-mom.entity';
import { TeamMember } from '../entities/team-member.entity';
import { ArtifactTemplate } from '../entities/artifact-template.entity';
import { ArtifactInstance } from '../entities/artifact-instance.entity';
import { ArtifactVersion } from '../entities/artifact-version.entity';
import { Schedule } from '../entities/schedule.entity';
import { ScheduleTask } from '../entities/schedule-task.entity';
import { WorkingCalendar } from '../entities/working-calendar.entity';
import { CalendarException } from '../entities/calendar-exception.entity';
import { TaskDependency } from '../entities/task-dependency.entity';
import { Resource } from '../entities/resource.entity';
import { ResourceWorkload } from '../entities/resource-workload.entity';
import { WorkflowLane } from '../entities/workflow-lane.entity';
import { WorkflowTemplate } from '../entities/workflow-template.entity';
import { AuditLog } from '../entities/audit-log.entity';

/**
 * All entity classes that live in the per-org tenant schema.
 * Created/managed by tenant DataSources (one per org).
 */
export const TENANT_ENTITIES = [
  Project,
  Sprint,
  Card,
  CardRAGHistory,
  CardAssignmentHistory,
  CardComment,
  Snap,
  StandupUpdate,
  DailySummary,
  DailySnapLock,
  DailyLock,
  ProjectMember,
  ScrumRoom,
  Assumption,
  Change,
  Decision,
  Issue,
  Risk,
  RiskHistory,
  Stakeholder,
  RaciMatrix,
  RaciEntry,
  Mom,
  StandaloneMom,
  TeamMember,
  ArtifactTemplate,
  ArtifactInstance,
  ArtifactVersion,
  Schedule,
  ScheduleTask,
  WorkingCalendar,
  CalendarException,
  TaskDependency,
  Resource,
  ResourceWorkload,
  WorkflowLane,
  WorkflowTemplate,
  AuditLog,
];

/**
 * Combined list passed to every tenant DataSource.
 * Shared entities carry `schema: 'public'` in their @Entity() decorator so
 * TypeORM knows where they live and won't try to recreate them in the org schema.
 */
export const ALL_TENANT_DS_ENTITIES = [...TENANT_ENTITIES, ...SHARED_ENTITIES];
