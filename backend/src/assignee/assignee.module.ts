import { Module } from '@nestjs/common';
import { AssigneeController } from './assignee.controller';
import { AssigneeService } from './assignee.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AssigneeController],
  providers: [AssigneeService],
  exports: [AssigneeService],
})
export class AssigneeModule {}
