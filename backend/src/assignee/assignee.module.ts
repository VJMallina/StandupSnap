import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssigneeController } from './assignee.controller';
import { AssigneeService } from './assignee.service';
import { TeamMember } from '../entities/team-member.entity';
import { Card } from '../entities/card.entity';
import { Snap } from '../entities/snap.entity';
import { Sprint } from '../entities/sprint.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamMember, Card, Snap, Sprint]),
  ],
  controllers: [AssigneeController],
  providers: [AssigneeService],
  exports: [AssigneeService],
})
export class AssigneeModule {}
