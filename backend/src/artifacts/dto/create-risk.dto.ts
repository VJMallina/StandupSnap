import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { RiskImpact, RiskLikelihood, RiskStatus } from '../../entities/risk.entity';

export class CreateRiskDto {
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

  @IsEnum(RiskImpact)
  @IsOptional()
  impact?: RiskImpact;

  @IsEnum(RiskLikelihood)
  @IsOptional()
  likelihood?: RiskLikelihood;

  @IsEnum(RiskStatus)
  @IsOptional()
  status?: RiskStatus;

  @IsUUID()
  @IsOptional()
  ownerId?: string | null;

  @IsString()
  @IsOptional()
  dueDate?: string; // ISO date

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @IsString()
  @IsOptional()
  mitigationPlan?: string;

  @IsString()
  @IsOptional()
  contingencyPlan?: string;

  @IsOptional()
  tags?: string[];
}
