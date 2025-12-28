import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class CreateCalendarDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[]; // Default: [1,2,3,4,5] = Mon-Fri

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  hoursPerDay?: number; // Default: 8.0

  @IsOptional()
  @IsString()
  defaultStartTime?: string; // Default: '09:00'

  @IsOptional()
  @IsString()
  defaultEndTime?: string; // Default: '17:00'

  @IsOptional()
  @IsString()
  timezone?: string; // Default: 'UTC'

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean; // Default: false
}
