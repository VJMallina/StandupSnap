import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Project } from './project.entity';

export enum DesignationRole {
  DEVELOPER = 'Developer',
  QA_TESTER = 'QA / Tester',
  BUSINESS_ANALYST = 'Business Analyst',
  UI_UX_DESIGNER = 'UI/UX Designer',
  DEVOPS_ENGINEER = 'DevOps Engineer',
  AUTOMATION_ENGINEER = 'Automation Engineer',
  BACKEND_DEVELOPER = 'Backend Developer',
  FRONTEND_DEVELOPER = 'Frontend Developer',
  FULL_STACK_DEVELOPER = 'Full Stack Developer',
}

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({
    type: 'enum',
    enum: DesignationRole,
  })
  designationRole: DesignationRole;

  @Column({ nullable: true })
  displayName: string;

  @ManyToMany(() => Project, (project) => project.teamMembers)
  projects: Project[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
