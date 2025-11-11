import { IsUUID, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class GenerateSprintsDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  sprintDurationWeeks: number;
}
