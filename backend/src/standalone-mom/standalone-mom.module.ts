import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StandaloneMomController } from './standalone-mom.controller';
import { StandaloneMomService } from './standalone-mom.service';

@Module({
  imports: [AuthModule],
  controllers: [StandaloneMomController],
  providers: [StandaloneMomService],
})
export class StandaloneMomModule {}
