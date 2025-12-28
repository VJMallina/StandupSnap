import { IsString, IsEnum, IsDateString, IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ExceptionType } from '../../entities/calendar-exception.entity';

export class UpdateCalendarExceptionDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(ExceptionType)
  type?: ExceptionType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  workingHours?: number;
}
