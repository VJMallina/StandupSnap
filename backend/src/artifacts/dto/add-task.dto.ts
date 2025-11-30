import { IsString, IsInt, IsOptional, IsNotEmpty, Min, MaxLength } from 'class-validator';

export class AddTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  taskName: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  taskDescription?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  rowOrder?: number;
}
