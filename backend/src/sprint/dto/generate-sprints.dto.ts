import { IsUUID, IsNotEmpty, IsNumber, Min, Max, IsString, IsOptional, IsIn, IsObject } from 'class-validator';

export class GenerateSprintsDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsNumber()
  @Min(1)
  @IsIn([1, 2, 3, 4])
  @IsNotEmpty()
  sprintDurationWeeks: number;

  @IsString()
  @IsOptional()
  namePrefix?: string;

  @IsNumber()
  @Min(1)
  @Max(3)
  @IsOptional()
  dailyStandupCount?: number;

  @IsObject()
  @IsOptional()
  slotTimes?: Record<string, string>;
}

export class PreviewSprintsDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsNumber()
  @Min(1)
  @IsIn([1, 2, 3, 4])
  @IsNotEmpty()
  sprintDurationWeeks: number;

  @IsString()
  @IsOptional()
  namePrefix?: string;

  @IsNumber()
  @Min(1)
  @Max(3)
  @IsOptional()
  dailyStandupCount?: number;

  @IsObject()
  @IsOptional()
  slotTimes?: Record<string, string>;
}
