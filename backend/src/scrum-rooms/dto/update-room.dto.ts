import { PartialType } from '@nestjs/mapped-types';
import { CreateRoomDto } from './create-room.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { RoomStatus } from '../../entities/scrum-room.entity';

export class UpdateRoomDto extends PartialType(CreateRoomDto) {
  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;
}
