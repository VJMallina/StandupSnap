import { IsUUID, IsNotEmpty, IsDateString } from 'class-validator';

export class LockDailySnapsDto {
  @IsUUID()
  @IsNotEmpty()
  sprintId: string;

  @IsDateString()
  @IsNotEmpty()
  lockDate: string; // YYYY-MM-DD format
}
