import { PartialType } from '@nestjs/mapped-types';
import { CreateSprintDto } from './create-sprint.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSprintDto extends PartialType(CreateSprintDto) {
  @IsOptional()
  @IsString()
  status?: string;
}
