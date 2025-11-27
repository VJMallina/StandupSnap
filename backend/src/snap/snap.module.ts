import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnapService } from './snap.service';
import { SnapController } from './snap.controller';
import { Snap } from '../entities/snap.entity';
import { Card } from '../entities/card.entity';
import { Sprint } from '../entities/sprint.entity';
import { DailySnapLock } from '../entities/daily-snap-lock.entity';
import { DailyLock } from '../entities/daily-lock.entity';
import { DailySummary } from '../entities/daily-summary.entity';
import { CardRAGHistory } from '../entities/card-rag-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Snap,
      Card,
      Sprint,
      DailySnapLock,
      DailyLock,
      DailySummary,
      CardRAGHistory,
    ]),
  ],
  controllers: [SnapController],
  providers: [SnapService],
  exports: [SnapService],
})
export class SnapModule {}
