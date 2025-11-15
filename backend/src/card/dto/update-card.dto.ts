import { IsString, IsOptional, IsUUID, IsInt, Min, IsEnum } from 'class-validator';
import { CardPriority } from '../../entities/card.entity';

export class UpdateCardDto {
  @IsString()
  @IsOptional()
  title?: string;

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
  @IsOptional()
  estimatedTime?: number; // ET in hours - MANDATORY if provided

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsUUID()
  @IsOptional()
  sprintId?: string; // Allow sprint change with restrictions
}
