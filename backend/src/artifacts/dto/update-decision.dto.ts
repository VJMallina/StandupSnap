import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, IsDateString, IsArray } from 'class-validator';
import { DecisionStatus, ImpactedArea } from '../../entities/decision.entity';

export class UpdateDecisionDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @IsEnum(DecisionStatus)
  @IsOptional()
  status?: DecisionStatus;

  @IsString()
  @IsOptional()
  decisionTaken?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string | null;

  @IsArray()
  @IsEnum(ImpactedArea, { each: true })
  @IsOptional()
  impactedAreas?: ImpactedArea[];

  @IsString()
  @IsOptional()
  supportingNotes?: string;
}
