import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, IsDateString } from 'class-validator';
import {
  RiskType,
  ProbabilityLevel,
  ImpactLevel,
  RiskStatus,
  RiskStrategy
} from '../../entities/risk.entity';

export class CreateRiskDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  // A. Identification Section (mandatory fields)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsEnum(RiskType)
  @IsNotEmpty()
  riskType: RiskType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @IsDateString()
  @IsOptional()
  dateIdentified?: string; // ISO date - defaults to today if not provided

  @IsString()
  @IsNotEmpty()
  riskStatement: string;

  @IsString()
  @IsOptional()
  currentStatusAssumptions?: string;

  // B. Assessment Section
  @IsEnum(ProbabilityLevel)
  @IsNotEmpty()
  probability: ProbabilityLevel;

  @IsEnum(ImpactLevel)
  @IsOptional()
  costImpact?: ImpactLevel;

  @IsEnum(ImpactLevel)
  @IsOptional()
  timeImpact?: ImpactLevel;

  @IsEnum(ImpactLevel)
  @IsOptional()
  scheduleImpact?: ImpactLevel;

  @IsString()
  @IsOptional()
  rationale?: string;

  // C. Response & Ownership Section
  @IsEnum(RiskStrategy)
  @IsNotEmpty()
  strategy: RiskStrategy;

  @IsString()
  @IsOptional()
  mitigationPlan?: string;

  @IsString()
  @IsOptional()
  contingencyPlan?: string;

  @IsUUID()
  @IsNotEmpty()
  ownerId: string; // Risk owner is mandatory

  @IsDateString()
  @IsOptional()
  targetClosureDate?: string; // ISO date

  // D. Status Tracking Section
  @IsEnum(RiskStatus)
  @IsOptional()
  status?: RiskStatus; // Defaults to OPEN if not provided

  @IsString()
  @IsOptional()
  progressNotes?: string;
}
