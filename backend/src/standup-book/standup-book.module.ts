import { Module } from '@nestjs/common';
import { StandupBookController } from './standup-book.controller';
import { StandupBookService } from './standup-book.service';
import { MomService } from './mom.service';
import { DailyLockService } from './daily-lock.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [StandupBookController],
  providers: [StandupBookService, MomService, DailyLockService],
  exports: [StandupBookService, MomService, DailyLockService],
})
export class StandupBookModule {}
