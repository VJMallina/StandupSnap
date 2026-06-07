import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum IncidentSeverity {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

export enum IncidentStatus {
  ACTIVE = 'ACTIVE',
  MONITORING = 'MONITORING',
  RESOLVED = 'RESOLVED',
}

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: IncidentSeverity })
  severity: IncidentSeverity;

  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.ACTIVE })
  status: IncidentStatus;

  @Column({ type: 'uuid' })
  declaredById: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declaredByName: string;

  @Column({ type: 'timestamp' })
  declaredAt: Date;

  @Column({ type: 'uuid', nullable: true })
  resolvedById: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'text', nullable: true })
  resolutionSummary: string;

  @Column({ type: 'text', nullable: true })
  postMortem: string;

  @Column({ type: 'boolean', default: false })
  raidPushed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
