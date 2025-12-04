import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { RoomType } from '../../entities/scrum-room.entity';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEnum(RoomType)
  @IsNotEmpty()
  type: RoomType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsOptional()
  data?: any; // Room-specific data, validated per room type
}
