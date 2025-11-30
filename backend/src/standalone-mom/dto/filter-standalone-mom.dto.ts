import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { StandaloneMeetingType } from '../../entities/standalone-mom.entity';

export class FilterStandaloneMomDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  sprintId?: string;

  @IsOptional()
  @IsEnum(StandaloneMeetingType)
  meetingType?: StandaloneMeetingType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ValidateIf((dto) => dto.dateFrom && dto.dateTo && new Date(dto.dateTo) < new Date(dto.dateFrom))
  invalidDateRange?: boolean;

  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @IsOptional()
  @IsUUID()
  updatedBy?: string;
}
