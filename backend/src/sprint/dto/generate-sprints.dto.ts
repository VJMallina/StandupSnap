import { IsUUID, IsNotEmpty, IsNumber, Min, IsString, IsOptional, IsIn } from 'class-validator';

export class GenerateSprintsDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsNumber()
  @Min(1)
  @IsIn([1, 2, 3, 4])
  @IsNotEmpty()
  sprintDurationWeeks: number;

  @IsString()
  @IsOptional()
  namePrefix?: string;
}

export class PreviewSprintsDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsNumber()
  @Min(1)
  @IsIn([1, 2, 3, 4])
  @IsNotEmpty()
  sprintDurationWeeks: number;

  @IsString()
  @IsOptional()
  namePrefix?: string;
}
