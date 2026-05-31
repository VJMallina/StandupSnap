import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RolePermission } from './role-permission.entity';

/**
 * PermissionKey - Master registry of all permission keys in the system
 *
 * This table stores all permission keys (e.g., "snap:create", "project:view_all").
 * When adding a new permission to the app, insert a row here. No migration needed
 * for existing roles - they simply don't have the new key until explicitly granted.
 */
@Entity({ schema: 'public', name: 'permission_keys' })
export class PermissionKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The permission key string (e.g., "snap:create", "project:view_all")
   */
  @Index({ unique: true })
  @Column({ unique: true })
  key: string;

  /**
   * Module/resource this permission belongs to (e.g., "snap", "project", "artifact:risk")
   * Used for grouping in the Role Builder UI
   */
  @Column()
  module: string;

  /**
   * Human-readable description of what this permission allows
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Display name for the UI (e.g., "Create Snap", "View All Projects")
   */
  @Column({ nullable: true })
  displayName: string;

  /**
   * Set to false to disable a deprecated permission without deleting it
   * Inactive permissions are ignored by the guard but preserved in RolePermission rows
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * Order for display in the Role Builder UI (lower = higher in list)
   */
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  /**
   * Roles that have this permission (via junction table)
   */
  @OneToMany(() => RolePermission, (rp) => rp.permissionKeyEntity)
  rolePermissions: RolePermission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
