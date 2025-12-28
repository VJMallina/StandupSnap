import { PartialType } from '@nestjs/mapped-types';
import { CreateArtifactTemplateDto } from './create-artifact-template.dto';

export class UpdateArtifactTemplateDto extends PartialType(
  CreateArtifactTemplateDto,
) {}
