import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID, IsNumber, Min, Max, IsObject } from 'class-validator';

export class CreateSprintDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  goal?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsNumber()
  @Min(1)
  @Max(3)
  @IsOptional()
  dailyStandupCount?: number;

  @IsObject()
  @IsOptional()
  slotTimes?: Record<string, string>;
}
