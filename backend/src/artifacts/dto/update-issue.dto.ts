import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, IsDateString } from 'class-validator';
import { IssueStatus, IssueSeverity } from '../../entities/issue.entity';

export class UpdateIssueDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(IssueStatus)
  @IsOptional()
  status?: IssueStatus;

  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @IsEnum(IssueSeverity)
  @IsOptional()
  severity?: IssueSeverity;

  @IsString()
  @IsOptional()
  impactSummary?: string;

  @IsString()
  @IsOptional()
  resolutionPlan?: string;

  @IsDateString()
  @IsOptional()
  targetResolutionDate?: string | null;
}
