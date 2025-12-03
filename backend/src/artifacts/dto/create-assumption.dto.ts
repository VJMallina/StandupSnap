import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AssumptionStatus } from '../../entities/assumption.entity';

export class CreateAssumptionDto {
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
  @IsOptional()
  ownerId?: string;

  @IsEnum(AssumptionStatus)
  @IsOptional()
  status?: AssumptionStatus; // Defaults to OPEN if not provided

  @IsString()
  @IsOptional()
  notes?: string;
}
