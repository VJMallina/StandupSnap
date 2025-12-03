import { IsString, IsEnum, IsOptional, IsArray, IsDateString } from 'class-validator';
import { ChangeType, ChangePriority, ChangeStatus } from '../../entities/change.entity';

export class UpdateChangeDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ChangeType)
  @IsOptional()
  changeType?: ChangeType;

  @IsEnum(ChangePriority)
  @IsOptional()
  priority?: ChangePriority;

  @IsEnum(ChangeStatus)
  @IsOptional()
  status?: ChangeStatus;

  @IsString()
  @IsOptional()
  impactAssessment?: string;

  @IsString()
  @IsOptional()
  rollbackPlan?: string;

  @IsString()
  @IsOptional()
  testingRequirements?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  affectedSystems?: string[];

  @IsDateString()
  @IsOptional()
  implementationDate?: string;

  @IsString()
  @IsOptional()
  implementationWindow?: string;

  @IsString()
  @IsOptional()
  requestorId?: string;

  @IsString()
  @IsOptional()
  approverId?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
