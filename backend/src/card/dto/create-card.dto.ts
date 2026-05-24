import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsInt,
  Min, IsEnum, IsArray, IsDateString,
} from 'class-validator';
import { CardPriority, CardType } from '../../entities/card.entity';

export class CreateCardDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  // null = Backlog; required for CARD and SUB_CARD, optional for EPIC
  @IsUUID()
  @IsOptional()
  sprintId?: string;

  @IsEnum(CardType)
  @IsOptional()
  cardType?: CardType;

  // For CARD → parentId is an EPIC id; for SUB_CARD → parentId is a CARD id
  @IsUUID()
  @IsOptional()
  parentId?: string;

  // Lane to place the card in (defaults to first TODO lane of project default workflow)
  @IsUUID()
  @IsOptional()
  laneId?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  acceptanceCriteria?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @IsString()
  @IsOptional()
  externalId?: string;

  @IsEnum(CardPriority)
  @IsOptional()
  priority?: CardPriority;

  @IsInt()
  @Min(1)
  @IsOptional()
  storyPoints?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedTime?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
