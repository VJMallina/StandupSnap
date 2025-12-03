import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, IsDateString, IsArray } from 'class-validator';
import { DecisionStatus, ImpactedArea } from '../../entities/decision.entity';

export class CreateDecisionDto {
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

  @IsUUID()
  @IsNotEmpty()
  ownerId: string;

  @IsEnum(DecisionStatus)
  @IsOptional()
  status?: DecisionStatus; // Defaults to PENDING if not provided

  @IsString()
  @IsOptional()
  decisionTaken?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string; // ISO date

  @IsArray()
  @IsEnum(ImpactedArea, { each: true })
  @IsOptional()
  impactedAreas?: ImpactedArea[];

  @IsString()
  @IsOptional()
  supportingNotes?: string;
}
