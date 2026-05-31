import { Module, forwardRef } from '@nestjs/common';
import { SprintService } from './sprint.service';
import { SprintController } from './sprint.controller';
import { CardModule } from '../card/card.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => CardModule), AuthModule],
  controllers: [SprintController],
  providers: [SprintService],
  exports: [SprintService],
})
export class SprintModule {}
