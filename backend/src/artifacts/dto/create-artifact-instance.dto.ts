import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ArtifactStatus } from '../../entities/artifact-instance.entity';

export class CreateArtifactInstanceDto {
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ArtifactStatus)
  @IsOptional()
  status?: ArtifactStatus;
}
