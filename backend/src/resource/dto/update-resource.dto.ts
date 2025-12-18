import { IsString, IsEnum, IsOptional, IsNumber, Min, IsArray, IsBoolean } from 'class-validator';
import { ResourceRole } from '../../entities/resource.entity';

export class UpdateResourceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ResourceRole)
  @IsOptional()
  role?: ResourceRole;

  @IsString()
  @IsOptional()
  customRoleName?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  weeklyAvailability?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  weeklyWorkload?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
