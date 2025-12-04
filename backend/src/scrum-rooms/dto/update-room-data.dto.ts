import { IsNotEmpty, IsObject } from 'class-validator';

export class UpdateRoomDataDto {
  @IsObject()
  @IsNotEmpty()
  data: any; // Room-specific data
}
