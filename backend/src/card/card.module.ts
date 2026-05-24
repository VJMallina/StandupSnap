import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { Card } from '../entities/card.entity';
import { Sprint } from '../entities/sprint.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Project } from '../entities/project.entity';
import { WorkflowLane } from '../entities/workflow-lane.entity';
import { WorkflowTemplate } from '../entities/workflow-template.entity';
import { CardAssignmentHistory } from '../entities/card-assignment-history.entity';
import { CardComment } from '../entities/card-comment.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Card,
      Sprint,
      TeamMember,
      Project,
      WorkflowLane,
      WorkflowTemplate,
      CardAssignmentHistory,
      CardComment,
    ]),
    AuthModule,
  ],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
