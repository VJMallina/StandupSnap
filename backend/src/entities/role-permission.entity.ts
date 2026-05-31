import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { OrgRole } from './org-role.entity';
import { PermissionKey } from './permission-key.entity';

/**
 * RolePermission - Junction table linking OrgRole to PermissionKey
 *
 * This replaces the JSONB permissions array on OrgRole.
 * Benefits:
 * - Adding a new permission key = INSERT one row into PermissionKey, no migration
 * - Can query "which roles have permission X?" efficiently
 * - Can deprecate a permission without breaking existing data
 */
@Entity({ schema: 'public', name: 'role_permissions' })
@Unique(['orgRoleId', 'permissionKey'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * FK to the role
   */
  @Index()
  @Column({ type: 'uuid' })
  orgRoleId: string;

  @ManyToOne(() => OrgRole, (role) => role.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'org_role_id' })
  orgRole: OrgRole;

  /**
   * The permission key string (e.g., "snap:create")
   * Stored as string for fast lookups without joining PermissionKey table
   */
  @Index()
  @Column()
  permissionKey: string;

  /**
   * Optional FK to PermissionKey entity for referential integrity
   */
  @ManyToOne(() => PermissionKey, (pk) => pk.rolePermissions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'permission_key', referencedColumnName: 'key' })
  permissionKeyEntity: PermissionKey;

  @CreateDateColumn()
  createdAt: Date;
}
