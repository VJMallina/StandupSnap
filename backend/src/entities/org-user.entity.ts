import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { OrgRole } from './org-role.entity';

/**
 * OrgUser - Links a User to an Organization with an org-level role
 *
 * This replaces the current User-Role mapping. It captures what role
 * a user holds across the entire organization.
 *
 * A user can belong to multiple organizations (future multi-org support),
 * but has exactly one OrgUser record per organization.
 */
@Entity({ schema: 'public', name: 'org_users' })
@Unique(['organizationId', 'userId'])
export class OrgUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * FK to the organization
   */
  @Index()
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.orgUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  /**
   * FK to the user
   */
  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * FK to the org-level role (e.g., ORG_ADMIN, PMO, MEMBER)
   */
  @Column({ type: 'uuid', name: 'org_role_id' })
  orgRoleId: string;

  @ManyToOne(() => OrgRole, (role) => role.orgUsers, {
    eager: true,
  })
  @JoinColumn({ name: 'org_role_id' })
  orgRole: OrgRole;

  /**
   * Whether this membership is active
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * When the user joined this organization
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  /**
   * FK to user who invited this user (null for self-registered org creators)
   */
  @Column({ type: 'uuid', name: 'invited_by_id', nullable: true })
  invitedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
