import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsObject,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { InstanceStatus } from '../../../entities/form-instance.entity';

export class CreateFormInstanceDto {
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsObject()
  @IsOptional()
  values?: Record<string, any>;

  @IsEnum(InstanceStatus)
  @IsOptional()
  status?: InstanceStatus;
}
