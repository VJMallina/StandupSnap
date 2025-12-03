import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AssumptionStatus } from '../../entities/assumption.entity';

export class UpdateAssumptionDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  ownerId?: string | null;

  @IsEnum(AssumptionStatus)
  @IsOptional()
  status?: AssumptionStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
