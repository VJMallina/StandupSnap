import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProjectMember } from './project-member.entity';
import { Sprint } from './sprint.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ProjectMember, (projectMember) => projectMember.project)
  members: ProjectMember[];

  @OneToMany(() => Sprint, (sprint) => sprint.project)
  sprints: Sprint[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
