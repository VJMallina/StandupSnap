import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { ProjectMember } from './project-member.entity';
import { Sprint } from './sprint.entity';
import { User } from './user.entity';
import { TeamMember } from './team-member.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'product_owner_id' })
  productOwner: User;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'pmo_id' })
  pmo: User;

  @OneToMany(() => ProjectMember, (projectMember) => projectMember.project)
  members: ProjectMember[];

  @OneToMany(() => Sprint, (sprint) => sprint.project)
  sprints: Sprint[];

  @ManyToMany(() => TeamMember, (teamMember) => teamMember.projects)
  @JoinTable({
    name: 'project_team_members',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_member_id', referencedColumnName: 'id' },
  })
  teamMembers: TeamMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
