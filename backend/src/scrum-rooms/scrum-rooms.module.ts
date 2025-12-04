import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrumRoom } from '../entities/scrum-room.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { ScrumRoomsController } from './scrum-rooms.controller';
import { ScrumRoomsService } from './scrum-rooms.service';

@Module({
  imports: [TypeOrmModule.forFeature([ScrumRoom, Project, User])],
  controllers: [ScrumRoomsController],
  providers: [ScrumRoomsService],
  exports: [ScrumRoomsService],
})
export class ScrumRoomsModule {}
