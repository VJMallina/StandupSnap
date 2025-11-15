import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { User } from '../entities/user.entity';
import { TeamMemberModule } from '../team-member/team-member.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, User]),
    TeamMemberModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
