import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMemberService } from './team-member.service';
import { TeamMemberController } from './team-member.controller';
import { TeamMember } from '../entities/team-member.entity';
import { Project } from '../entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TeamMember, Project])],
  controllers: [TeamMemberController],
  providers: [TeamMemberService],
  exports: [TeamMemberService],
})
export class TeamMemberModule {}
