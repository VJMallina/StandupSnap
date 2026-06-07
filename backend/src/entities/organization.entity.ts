import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrgUser } from './org-user.entity';
import { OrgRole } from './org-role.entity';
import { OrgInvitation } from './org-invitation.entity';
import { OrgDomainVerification } from './org-domain-verification.entity';

export enum OrganizationPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum OrganizationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

export enum DomainPolicy {
  INVITE_ONLY = 'invite_only',
  AUTO_JOIN = 'auto_join',
}

@Entity({ schema: 'public', name: 'organizations' })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  brandPrimaryColor: string;

  @Column({ nullable: true })
  brandSecondaryColor: string;

  @Column({ nullable: true })
  brandAccentColor: string;

  @Column({ nullable: true })
  brandFaviconUrl: string;

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.PENDING,
  })
  status: OrganizationStatus;

  @Column({
    type: 'enum',
    enum: OrganizationPlan,
    default: OrganizationPlan.FREE,
  })
  plan: OrganizationPlan;

  @Column({
    type: 'enum',
    enum: DomainPolicy,
    default: DomainPolicy.INVITE_ONLY,
  })
  domainPolicy: DomainPolicy;

  @Column({ type: 'int', default: 10 })
  maxUsers: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  /** FK to user who created this organization */
  @Column({ type: 'uuid', nullable: true })
  createdById: string;

  /** FK to user who last updated this organization */
  @Column({ type: 'uuid', nullable: true })
  updatedById: string;

  // Relations
  @OneToMany(() => OrgUser, (orgUser) => orgUser.organization)
  orgUsers: OrgUser[];

  @OneToMany(() => OrgRole, (orgRole) => orgRole.organization)
  customRoles: OrgRole[];

  @OneToMany(() => OrgInvitation, (invitation) => invitation.organization)
  invitations: OrgInvitation[];

  @OneToMany(() => OrgDomainVerification, (verification) => verification.organization)
  domainVerifications: OrgDomainVerification[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
