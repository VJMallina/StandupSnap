import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { RolePermission } from './role-permission.entity';
import { OrgUser } from './org-user.entity';

/**
 * System role names - these are the 6 default roles shipped with the app
 */
export enum SystemRoleName {
  ORG_ADMIN = 'ORG_ADMIN',
  PMO = 'PMO',
  SCRUM_MASTER = 'SCRUM_MASTER',
  PRODUCT_OWNER = 'PRODUCT_OWNER',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

/**
 * OrgRole - Unified role table for both org-level and project-level roles
 *
 * System roles have organizationId = null and are shared across all orgs.
 * Custom roles have organizationId set and belong to a specific org.
 *
 * Permissions are NOT stored on this entity (no JSONB column).
 * Instead, permissions are stored in the RolePermission junction table.
 */
@Entity({ schema: 'public', name: 'org_roles' })
@Index(['organizationId', 'name'], { unique: true, where: '"organization_id" IS NOT NULL' })
export class OrgRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * FK to Organization - null means this is a system role shared across all orgs
   */
  @Column({ type: 'uuid', name: 'organization_id', nullable: true })
  organizationId: string | null;

  @ManyToOne(() => Organization, (org) => org.customRoles, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  /**
   * Role name (e.g., "Scrum Master", "Delivery Lead", "Client Observer")
   */
  @Column()
  name: string;

  /**
   * Human-readable description of the role
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * System roles are shipped with the app and cannot be deleted
   */
  @Column({ default: false })
  isSystem: boolean;

  /**
   * System roles are not editable; custom roles are editable
   */
  @Column({ default: true })
  isEditable: boolean;

  /**
   * FK to user who created this role (null for system roles)
   */
  @Column({ type: 'uuid', name: 'created_by_id', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  /**
   * Permissions are loaded via the RolePermission junction table
   */
  @OneToMany(() => RolePermission, (rp) => rp.orgRole)
  rolePermissions: RolePermission[];

  /**
   * Users assigned this role at the org level
   */
  @OneToMany(() => OrgUser, (ou) => ou.orgRole)
  orgUsers: OrgUser[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
