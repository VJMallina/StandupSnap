import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, IsDateString } from 'class-validator';
import {
  RiskType,
  ProbabilityLevel,
  ImpactLevel,
  RiskStatus,
  RiskStrategy
} from '../../entities/risk.entity';

export class UpdateRiskDto {
  // A. Identification Section
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsEnum(RiskType)
  @IsOptional()
  riskType?: RiskType;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsDateString()
  @IsOptional()
  dateIdentified?: string;

  @IsString()
  @IsOptional()
  riskStatement?: string;

  @IsString()
  @IsOptional()
  currentStatusAssumptions?: string;

  // B. Assessment Section
  @IsEnum(ProbabilityLevel)
  @IsOptional()
  probability?: ProbabilityLevel;

  @IsEnum(ImpactLevel)
  @IsOptional()
  costImpact?: ImpactLevel | null;

  @IsEnum(ImpactLevel)
  @IsOptional()
  timeImpact?: ImpactLevel | null;

  @IsEnum(ImpactLevel)
  @IsOptional()
  scheduleImpact?: ImpactLevel | null;

  @IsString()
  @IsOptional()
  rationale?: string;

  // C. Response & Ownership Section
  @IsEnum(RiskStrategy)
  @IsOptional()
  strategy?: RiskStrategy;

  @IsString()
  @IsOptional()
  mitigationPlan?: string;

  @IsString()
  @IsOptional()
  contingencyPlan?: string;

  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @IsDateString()
  @IsOptional()
  targetClosureDate?: string | null;

  // D. Status Tracking Section
  @IsEnum(RiskStatus)
  @IsOptional()
  status?: RiskStatus;

  @IsString()
  @IsOptional()
  progressNotes?: string;
}
