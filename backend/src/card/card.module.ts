import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { Card } from '../entities/card.entity';
import { Sprint } from '../entities/sprint.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Project } from '../entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Card, Sprint, TeamMember, Project]),
  ],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
