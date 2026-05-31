import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { OrgRole } from './org-role.entity';
import { Project } from './project.entity';
import { User } from './user.entity';

export enum OrgInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

/**
 * OrgInvitation - Invitations to join an organization
 *
 * Supports two types of invitations:
 * 1. Org-level invite: User joins the org, gets assigned to no projects yet
 *    (projectId = null, projectRoleId = null)
 *
 * 2. Project-level invite: User joins the org AND a specific project simultaneously
 *    (projectId = set, projectRoleId = set)
 *
 * On acceptance, both OrgUser and ProjectMember records are created in one transaction.
 */
@Entity({ schema: 'public', name: 'org_invitations' })
export class OrgInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * FK to the organization
   * Note: scalar lives in the old camelCase column; org relation uses organization_id FK.
   * Both are populated by inviteMember to keep display and acceptance working.
   */
  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.invitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  /**
   * Email address of the invitee
   */
  @Index()
  @Column()
  email: string;

  /**
   * FK to the org-level role to assign on acceptance
   * Note: scalar lives in the old camelCase column; orgRole relation uses org_role_id FK.
   * Both are populated by inviteMember to keep display and acceptance working.
   */
  @Column({ type: 'uuid' })
  orgRoleId: string;

  @ManyToOne(() => OrgRole, { eager: true })
  @JoinColumn({ name: 'org_role_id' })
  orgRole: OrgRole;

  /**
   * Optional: FK to project if this is a direct project invite
   */
  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  /**
   * Optional: FK to project-level role to assign on acceptance
   */
  @Column({ type: 'uuid', name: 'project_role_id', nullable: true })
  projectRoleId: string | null;

  @ManyToOne(() => OrgRole, { nullable: true })
  @JoinColumn({ name: 'project_role_id' })
  projectRole: OrgRole | null;

  /**
   * Unique token for the invitation link
   */
  @Index({ unique: true })
  @Column({ unique: true })
  token: string;

  /**
   * Invitation status
   */
  @Column({
    type: 'enum',
    enum: OrgInvitationStatus,
    default: OrgInvitationStatus.PENDING,
  })
  status: OrgInvitationStatus;

  /**
   * When the invitation expires
   */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /**
   * When the invitation was accepted (null if not accepted)
   */
  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  /**
   * FK to user who created this invitation
   */
  @Column({ type: 'uuid' })
  invitedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
