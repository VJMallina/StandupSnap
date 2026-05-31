import { Module } from '@nestjs/common';
import { ScrumRoomsController } from './scrum-rooms.controller';
import { ScrumRoomsService } from './scrum-rooms.service';

@Module({
  controllers: [ScrumRoomsController],
  providers: [ScrumRoomsService],
  exports: [ScrumRoomsService],
})
export class ScrumRoomsModule {}
