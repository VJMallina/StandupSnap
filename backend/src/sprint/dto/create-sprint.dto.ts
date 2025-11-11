import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateSprintDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  durationWeeks: number; // Sprint length in weeks

  @IsString()
  @IsOptional()
  status?: string;
}
