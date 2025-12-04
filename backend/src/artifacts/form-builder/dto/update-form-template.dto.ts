import { PartialType } from '@nestjs/mapped-types';
import { CreateFormTemplateDto } from './create-form-template.dto';
import { IsOptional, IsInt, Min } from 'class-validator';

export class UpdateFormTemplateDto extends PartialType(CreateFormTemplateDto) {
  @IsInt()
  @Min(1)
  @IsOptional()
  version?: number;
}
