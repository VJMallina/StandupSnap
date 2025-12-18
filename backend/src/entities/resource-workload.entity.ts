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
import { Resource } from './resource.entity';

@Entity('resource_workloads')
@Index(['resource', 'weekStartDate'], { unique: true }) // One entry per resource per week
export class ResourceWorkload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Resource, (resource) => resource.workloads, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @Column({ type: 'date' })
  weekStartDate: Date; // Start of the week (Monday)

  @Column({ type: 'date' })
  weekEndDate: Date; // End of the week (Sunday)

  @Column({ type: 'float' })
  availability: number; // Weekly availability for this specific week

  @Column({ type: 'float' })
  workload: number; // Weekly workload for this specific week

  @Column({ type: 'float' })
  loadPercentage: number; // (workload / availability) * 100

  @Column({ type: 'varchar', length: 10 })
  ragStatus: string; // green, amber, red

  @Column({ type: 'text', nullable: true })
  notes: string; // Week-specific notes

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
