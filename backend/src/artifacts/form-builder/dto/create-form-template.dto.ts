import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TemplateCategory,
  TemplateStatus,
  TemplateVisibility,
  FormField,
  TemplateSettings,
} from '../../../entities/form-template.entity';

export class CreateFormTemplateDto {
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TemplateCategory)
  @IsOptional()
  category?: TemplateCategory;

  @IsEnum(TemplateStatus)
  @IsOptional()
  status?: TemplateStatus;

  @IsEnum(TemplateVisibility)
  @IsOptional()
  visibility?: TemplateVisibility;

  @IsArray()
  @IsOptional()
  fields?: FormField[];

  @IsObject()
  @IsOptional()
  settings?: TemplateSettings;
}
