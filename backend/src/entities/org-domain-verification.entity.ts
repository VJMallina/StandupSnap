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

export enum DomainVerificationMethod {
  DNS_TXT = 'dns_txt',
  EMAIL = 'email',
  META_TAG = 'meta_tag',
}

export enum DomainVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

/**
 * OrgDomainVerification - Tracks domain verification for organizations
 *
 * Organizations can verify ownership of a domain (e.g., "infosys.com").
 * Once verified, users with matching email domains can:
 * - Auto-join the org (if domainPolicy = AUTO_JOIN)
 * - Be recognized as internal users
 */
@Entity({ schema: 'public', name: 'org_domain_verifications' })
export class OrgDomainVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * FK to the organization
   */
  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.domainVerifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  /**
   * The domain being verified (e.g., "infosys.com")
   */
  @Index()
  @Column()
  domain: string;

  /**
   * Verification method
   */
  @Column({
    type: 'enum',
    enum: DomainVerificationMethod,
    default: DomainVerificationMethod.EMAIL,
  })
  method: DomainVerificationMethod;

  /**
   * Token to be placed in DNS TXT record or email confirmation
   */
  @Column()
  verificationToken: string;

  /**
   * DNS TXT record name (for DNS verification)
   */
  @Column({ nullable: true })
  dnsRecordName: string;

  /**
   * Current verification status
   */
  @Column({
    type: 'enum',
    enum: DomainVerificationStatus,
    default: DomainVerificationStatus.PENDING,
  })
  status: DomainVerificationStatus;

  /**
   * Whether this domain is currently verified and active
   */
  @Column({ default: false })
  isVerified: boolean;

  /**
   * When the verification was completed
   */
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  /**
   * When the verification token expires
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  /**
   * Number of verification attempts
   */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  /**
   * Last error message if verification failed
   */
  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
