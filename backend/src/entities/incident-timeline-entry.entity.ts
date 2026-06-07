import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum TimelineEntryType {
  UPDATE = 'UPDATE',
  HYPOTHESIS = 'HYPOTHESIS',
  FIX_ATTEMPT = 'FIX_ATTEMPT',
  ESCALATION = 'ESCALATION',
  STATUS_CHANGE = 'STATUS_CHANGE',
  RESOLUTION = 'RESOLUTION',
  SYSTEM = 'SYSTEM',
}

@Entity('incident_timeline_entries')
export class IncidentTimelineEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  incidentId: string;

  @Column({ type: 'uuid', nullable: true })
  authorId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  authorName: string;

  @Column({ type: 'enum', enum: TimelineEntryType, default: TimelineEntryType.UPDATE })
  entryType: TimelineEntryType;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
