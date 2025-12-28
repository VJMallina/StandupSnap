import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateCalendarDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  hoursPerDay?: number;

  @IsOptional()
  @IsString()
  defaultStartTime?: string;

  @IsOptional()
  @IsString()
  defaultEndTime?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
