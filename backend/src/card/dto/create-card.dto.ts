import { IsString, IsNotEmpty, IsOptional, IsUUID, IsInt, Min, IsEnum } from 'class-validator';
import { CardPriority } from '../../entities/card.entity';

export class CreateCardDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsUUID()
  @IsNotEmpty()
  sprintId: string;

  @IsUUID()
  @IsNotEmpty()
  assigneeId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  externalId?: string;

  @IsEnum(CardPriority)
  @IsOptional()
  priority?: CardPriority;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  estimatedTime: number; // MANDATORY - ET in hours
}
