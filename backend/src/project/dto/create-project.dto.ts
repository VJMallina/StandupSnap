import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean, IsUUID, Matches } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Matches(/^[A-Z0-9]{2,6}$/, { message: 'Project key must be 2–6 uppercase letters or digits (e.g. STDN)' })
  @IsOptional()
  key?: string;

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
