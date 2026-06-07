import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { IssueSeverity } from '../../entities/issue.entity';
import { ProbabilityLevel, RiskStrategy } from '../../entities/risk.entity';

export class PushIssueDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsEnum(IssueSeverity)
  severity: IssueSeverity;

  @IsUUID()
  ownerId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  impactSummary?: string;

  @IsOptional()
  @IsString()
  resolutionPlan?: string;
}

export class PushRiskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsString()
  riskStatement: string;

  @IsEnum(ProbabilityLevel)
  probability: ProbabilityLevel;

  @IsEnum(RiskStrategy)
  strategy: RiskStrategy;

  @IsUUID()
  ownerId: string;

  @IsOptional()
  @IsString()
  mitigationPlan?: string;
}

export class PushToRaidDto {
  @ValidateNested()
  @Type(() => PushIssueDto)
  issue: PushIssueDto;

  @ValidateNested()
  @Type(() => PushRiskDto)
  risk: PushRiskDto;
}
