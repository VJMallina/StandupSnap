import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sprint } from './sprint.entity';

@Entity('daily_summaries')
export class DailySummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sprint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sprint_id' })
  sprint: Sprint;

  @Column({ name: 'sprint_id' })
  sprintId: string;

  // The date for this summary
  @Column({ type: 'date' })
  summaryDate: Date;

  // Consolidated content
  @Column('text', { nullable: true })
  done: string;

  @Column('text', { nullable: true })
  toDo: string;

  @Column('text', { nullable: true })
  blockers: string;

  // RAG overview
  @Column('jsonb', { nullable: true })
  ragOverview: {
    cardLevel: { green: number; amber: number; red: number };
    assigneeLevel: { green: number; amber: number; red: number };
    sprintLevel: string; // green, amber, or red
  };

  // Full structured data (for viewing/export)
  @Column('jsonb')
  fullData: any;

  @CreateDateColumn()
  createdAt: Date;
}
