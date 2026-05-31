import { Module, forwardRef } from '@nestjs/common';
import { SnapService } from './snap.service';
import { SnapController } from './snap.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SnapController],
  providers: [SnapService],
  exports: [SnapService],
})
export class SnapModule {}
