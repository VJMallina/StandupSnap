import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean, IsUUID } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsUUID()
  @IsOptional()
  productOwnerId?: string;

  @IsUUID()
  @IsOptional()
  pmoId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
