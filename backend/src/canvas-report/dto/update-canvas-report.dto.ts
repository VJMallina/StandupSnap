import { IsString, IsOptional, IsArray, IsIn, MaxLength } from 'class-validator';
import { SlideData, ReportType } from '../../entities/canvas-report.entity';

export class UpdateCanvasReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['weekly', 'biweekly', 'monthly', 'custom'])
  reportType?: ReportType;

  @IsOptional()
  @IsArray()
  slides?: SlideData[];
}
