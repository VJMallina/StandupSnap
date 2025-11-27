import { IsUUID, IsNotEmpty, IsDateString } from 'class-validator';

export class LockDayDto {
  @IsUUID()
  @IsNotEmpty()
  sprintId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;
}
