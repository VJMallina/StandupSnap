import { IsString, IsOptional, IsIn, IsDateString, MaxLength } from 'class-validator';
import { ReportType } from '../../entities/canvas-report.entity';

export class GenerateTemplateDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsIn(['weekly', 'biweekly', 'monthly', 'custom'])
  reportType?: ReportType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
