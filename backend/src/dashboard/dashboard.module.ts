import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Project } from '../entities/project.entity';
import { Sprint } from '../entities/sprint.entity';
import { Card } from '../entities/card.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Snap } from '../entities/snap.entity';
import { User } from '../entities/user.entity';
import { ProjectMember } from '../entities/project-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Sprint,
      Card,
      TeamMember,
      Snap,
      User,
      ProjectMember,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
