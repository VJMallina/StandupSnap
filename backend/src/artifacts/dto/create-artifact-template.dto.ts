import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ArtifactCategory } from '../../entities/artifact-template.entity';

export class CreateArtifactTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEnum(ArtifactCategory)
  @IsOptional()
  category?: ArtifactCategory;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  templateStructure: any;

  @IsBoolean()
  @IsOptional()
  isSystemTemplate?: boolean;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsUUID()
  @IsNotEmpty()
  projectId: string;
}
