import { PartialType } from '@nestjs/mapped-types';
import { CreateStandaloneMomDto } from './create-standalone-mom.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateStandaloneMomDto extends PartialType(CreateStandaloneMomDto) {
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
