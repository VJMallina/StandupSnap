import { IsString, IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class AddTaskDto {
  @IsString()
  @IsNotEmpty()
  taskName: string;

  @IsString()
  @IsOptional()
  taskDescription?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  rowOrder?: number;
}
