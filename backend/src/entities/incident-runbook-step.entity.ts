import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

export enum RunbookPhase {
  TRIAGE = 'TRIAGE',
  DIAGNOSIS = 'DIAGNOSIS',
  FIX = 'FIX',
  VERIFY = 'VERIFY',
  COMMUNICATE = 'COMMUNICATE',
}

@Entity('incident_runbook_steps')
export class IncidentRunbookStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  incidentId: string;

  @Column({ type: 'enum', enum: RunbookPhase })
  phase: RunbookPhase;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'uuid', nullable: true })
  completedById: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  completedByName: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int' })
  order: number;
}
