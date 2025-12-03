import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, IsDateString } from 'class-validator';
import { IssueStatus, IssueSeverity } from '../../entities/issue.entity';

export class CreateIssueDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(IssueStatus)
  @IsOptional()
  status?: IssueStatus; // Defaults to OPEN if not provided

  @IsUUID()
  @IsNotEmpty()
  ownerId: string;

  @IsEnum(IssueSeverity)
  @IsNotEmpty()
  severity: IssueSeverity;

  @IsString()
  @IsOptional()
  impactSummary?: string;

  @IsString()
  @IsOptional()
  resolutionPlan?: string;

  @IsDateString()
  @IsOptional()
  targetResolutionDate?: string; // ISO date
}
