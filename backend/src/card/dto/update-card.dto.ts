import {
  IsString, IsOptional, IsUUID, IsInt, Min, IsEnum,
  IsArray, IsDateString, ValidateIf,
} from 'class-validator';
import { CardPriority, CardRAG, CardStatus } from '../../entities/card.entity';

export class UpdateCardDto {
  @IsString()
  @IsOptional()
  title?: string;

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

  @IsEnum(CardStatus)
  @IsOptional()
  status?: CardStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  storyPoints?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedTime?: number;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  // null = move to Backlog
  @IsUUID()
  @IsOptional()
  sprintId?: string | null;

  // Move to a different lane (triggers status sync + activity log entry)
  @IsUUID()
  @IsOptional()
  laneId?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ValidateIf((o) => o.ragStatus !== null)
  @IsEnum(CardRAG)
  @IsOptional()
  ragStatus?: CardRAG | null;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
