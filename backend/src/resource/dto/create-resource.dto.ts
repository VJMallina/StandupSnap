import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, Min, IsArray } from 'class-validator';
import { ResourceRole } from '../../entities/resource.entity';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ResourceRole)
  @IsNotEmpty()
  role: ResourceRole;

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
  weeklyAvailability?: number; // Default 40 hours

  @IsNumber()
  @Min(0)
  @IsOptional()
  weeklyWorkload?: number; // Default 0 hours

  @IsString()
  @IsOptional()
  notes?: string;
}
