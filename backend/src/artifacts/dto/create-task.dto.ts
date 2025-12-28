import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskStatus, SchedulingMode } from '../../entities/schedule-task.entity';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsUUID()
  @IsOptional()
  parentTaskId?: string;

  @IsInt()
  @IsNotEmpty()
  orderIndex: number;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsEnum(SchedulingMode)
  @IsOptional()
  schedulingMode?: SchedulingMode;

  @IsBoolean()
  @IsOptional()
  isMilestone?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
