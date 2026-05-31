import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Project } from './project.entity';

/**
 * AuditLog - Append-only audit trail for all write operations
 *
 * This entity captures who did what, when, and what changed.
 * Audit logs are NEVER soft-deleted or modified - they are append-only.
 *
 * Used for:
 * - Compliance reporting
 * - Security auditing
 * - Change tracking
 * - Debugging user issues
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * FK to organization - tenant scoping
   */
  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  /**
   * FK to user who performed the action
   */
  @Index()
  @Column({ type: 'uuid' })
  actorId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  /**
   * The actor's role at the time of the action (snapshot)
   */
  @Column()
  actorRole: string;

  /**
   * The action performed (e.g., "risk.update", "snap.lock_daily", "project.create")
   */
  @Index()
  @Column()
  action: string;

  /**
   * The type of entity affected (e.g., "Risk", "Sprint", "ProjectMember")
   */
  @Index()
  @Column()
  entityType: string;

  /**
   * The ID of the entity that was affected
   */
  @Index()
  @Column({ type: 'uuid' })
  entityId: string;

  /**
   * Optional: FK to project if this is a project-scoped action
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  /**
   * State of the entity BEFORE the change (null for create operations)
   */
  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, any> | null;

  /**
   * State of the entity AFTER the change (null for delete operations)
   */
  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, any> | null;

  /**
   * Additional metadata (IP address, user agent, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Human-readable description of the change
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * When the action occurred
   */
  @CreateDateColumn()
  @Index()
  createdAt: Date;

  // NOTE: No updatedAt or deletedAt - audit logs are immutable
}

/**
 * Standard audit actions by module
 */
export const AUDIT_ACTIONS = {
  // Auth
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',

  // Project
  PROJECT_CREATE: 'project.create',
  PROJECT_EDIT: 'project.edit',
  PROJECT_ARCHIVE: 'project.archive',
  PROJECT_UNARCHIVE: 'project.unarchive',
  PROJECT_DELETE: 'project.delete',
  PROJECT_RESTORE: 'project.restore',
  PROJECT_SET_CONFIDENTIAL: 'project.set_confidential',

  // Sprint
  SPRINT_CREATE: 'sprint.create',
  SPRINT_EDIT: 'sprint.edit',
  SPRINT_CLOSE: 'sprint.close',
  SPRINT_DELETE: 'sprint.delete',
  SPRINT_RESTORE: 'sprint.restore',

  // Card
  CARD_CREATE: 'card.create',
  CARD_EDIT: 'card.edit',
  CARD_ASSIGN: 'card.assign',
  CARD_STATUS_CHANGE: 'card.status_change',
  CARD_DELETE: 'card.delete',

  // Snap
  SNAP_CREATE: 'snap.create',
  SNAP_EDIT: 'snap.edit',
  SNAP_DELETE: 'snap.delete',
  SNAP_LOCK_DAILY: 'snap.lock_daily',
  SNAP_RAG_OVERRIDE: 'snap.rag_override',
  SNAP_GENERATE_SUMMARY: 'snap.generate_summary',

  // Risk
  RISK_CREATE: 'risk.create',
  RISK_EDIT: 'risk.edit',
  RISK_STATUS_CHANGE: 'risk.status_change',
  RISK_ARCHIVE: 'risk.archive',

  // Change
  CHANGE_CREATE: 'change.create',
  CHANGE_SUBMIT: 'change.submit',
  CHANGE_APPROVE: 'change.approve',
  CHANGE_REJECT: 'change.reject',
  CHANGE_IMPLEMENT: 'change.implement',

  // MOM
  MOM_CREATE: 'mom.create',
  MOM_EDIT: 'mom.edit',
  MOM_DELETE: 'mom.delete',
  MOM_EXPORT: 'mom.export',

  // Organization
  ORG_CREATE: 'org.create',
  ORG_EDIT: 'org.edit',
  ORG_DOMAIN_VERIFY: 'org.domain_verify',
  ORG_USER_INVITE: 'org.user_invite',
  ORG_USER_DEACTIVATE: 'org.user_deactivate',
  ORG_USER_REACTIVATE: 'org.user_reactivate',
  ORG_ROLE_CREATE: 'org.role_create',
  ORG_ROLE_EDIT: 'org.role_edit',
  ORG_ROLE_DELETE: 'org.role_delete',
  ORG_ROLE_ASSIGN: 'org.role_assign',

  // Project Member
  PROJECT_MEMBER_ADD: 'project_member.add',
  PROJECT_MEMBER_REMOVE: 'project_member.remove',
  PROJECT_MEMBER_ROLE_CHANGE: 'project_member.role_change',

  // RAID items
  ASSUMPTION_CREATE: 'assumption.create',
  ASSUMPTION_EDIT: 'assumption.edit',
  ASSUMPTION_DELETE: 'assumption.delete',
  ISSUE_CREATE: 'issue.create',
  ISSUE_EDIT: 'issue.edit',
  ISSUE_DELETE: 'issue.delete',
  DECISION_CREATE: 'decision.create',
  DECISION_EDIT: 'decision.edit',
  DECISION_DELETE: 'decision.delete',

  // Stakeholder
  STAKEHOLDER_CREATE: 'stakeholder.create',
  STAKEHOLDER_EDIT: 'stakeholder.edit',
  STAKEHOLDER_ARCHIVE: 'stakeholder.archive',

  // RACI
  RACI_CREATE: 'raci.create',
  RACI_EDIT: 'raci.edit',
  RACI_DELETE: 'raci.delete',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
