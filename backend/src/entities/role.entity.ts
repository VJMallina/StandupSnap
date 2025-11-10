import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { User } from './user.entity';

export enum RoleName {
  SCRUM_MASTER = 'scrum_master',
  PRODUCT_OWNER = 'product_owner',
  PMO = 'pmo',
}

export enum Permission {
  // Project permissions
  CREATE_PROJECT = 'create_project',
  EDIT_PROJECT = 'edit_project',
  DELETE_PROJECT = 'delete_project',
  VIEW_PROJECT = 'view_project',

  // Sprint permissions
  CREATE_SPRINT = 'create_sprint',
  EDIT_SPRINT = 'edit_sprint',
  DELETE_SPRINT = 'delete_sprint',
  VIEW_SPRINT = 'view_sprint',

  // Team member permissions
  ADD_TEAM_MEMBER = 'add_team_member',
  REMOVE_TEAM_MEMBER = 'remove_team_member',
  VIEW_TEAM_MEMBER = 'view_team_member',

  // Standup permissions
  CREATE_STANDUP = 'create_standup',
  EDIT_OWN_STANDUP = 'edit_own_standup',
  EDIT_ANY_STANDUP = 'edit_any_standup',
  DELETE_OWN_STANDUP = 'delete_own_standup',
  DELETE_ANY_STANDUP = 'delete_any_standup',
  VIEW_STANDUP = 'view_standup',

  // Invite permissions
  SEND_INVITE = 'send_invite',
  MANAGE_ROLES = 'manage_roles',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RoleName,
    unique: true
  })
  name: RoleName;

  @Column({ nullable: true })
  description: string;

  @Column('simple-array', { nullable: true, default: '' })
  permissions: Permission[];

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
