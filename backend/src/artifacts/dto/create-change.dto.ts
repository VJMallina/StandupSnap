import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, IsDateString } from 'class-validator';
import { ChangeType, ChangePriority, ChangeStatus } from '../../entities/change.entity';

export class CreateChangeDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(ChangeType)
  changeType: ChangeType;

  @IsEnum(ChangePriority)
  priority: ChangePriority;

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
}
