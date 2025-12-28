import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { DependencyType } from '../../entities/task-dependency.entity';

export class CreateDependencyDto {
  @IsUUID()
  @IsNotEmpty()
  predecessorTaskId: string;

  @IsUUID()
  @IsNotEmpty()
  successorTaskId: string;

  @IsEnum(DependencyType)
  @IsNotEmpty()
  dependencyType: DependencyType;

  @IsInt()
  @IsOptional()
  lagDays?: number;
}
