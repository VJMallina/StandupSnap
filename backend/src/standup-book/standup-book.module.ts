import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StandupBookController } from './standup-book.controller';
import { StandupBookService } from './standup-book.service';
import { MomService } from './mom.service';
import { DailyLockService } from './daily-lock.service';
import { Mom } from '../entities/mom.entity';
import { DailyLock } from '../entities/daily-lock.entity';
import { Sprint } from '../entities/sprint.entity';
import { Snap } from '../entities/snap.entity';
import { Card } from '../entities/card.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mom, DailyLock, Sprint, Snap, Card, User]),
  ],
  controllers: [StandupBookController],
  providers: [StandupBookService, MomService, DailyLockService],
  exports: [StandupBookService, MomService, DailyLockService],
})
export class StandupBookModule {}
