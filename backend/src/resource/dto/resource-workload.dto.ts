import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsDateString } from 'class-validator';

export class CreateResourceWorkloadDto {
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @IsDateString()
  @IsNotEmpty()
  weekStartDate: string; // YYYY-MM-DD format

  @IsNumber()
  @Min(0)
  availability: number;

  @IsNumber()
  @Min(0)
  workload: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateResourceWorkloadDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  availability?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  workload?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
