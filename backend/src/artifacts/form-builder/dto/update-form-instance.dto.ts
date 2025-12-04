import { PartialType } from '@nestjs/mapped-types';
import { CreateFormInstanceDto } from './create-form-instance.dto';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateFormInstanceDto extends PartialType(CreateFormInstanceDto) {
  @IsString()
  @IsOptional()
  approvalNotes?: string;

  @IsUUID()
  @IsOptional()
  approvedBy?: string;
}
