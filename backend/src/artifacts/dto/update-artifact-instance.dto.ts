import { PartialType } from '@nestjs/mapped-types';
import { CreateArtifactInstanceDto } from './create-artifact-instance.dto';

export class UpdateArtifactInstanceDto extends PartialType(
  CreateArtifactInstanceDto,
) {}
