import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { SnapRAG } from '../../entities/snap.entity';

export class CreateSnapDto {
  @IsUUID()
  @IsNotEmpty()
  cardId: string;

  @IsString()
  @IsNotEmpty()
  rawInput: string;

  @IsString()
  @IsOptional()
  done?: string;

  @IsString()
  @IsOptional()
  toDo?: string;

  @IsString()
  @IsOptional()
  blockers?: string;

  @IsEnum(SnapRAG)
  @IsOptional()
  suggestedRAG?: SnapRAG;

  @IsEnum(SnapRAG)
  @IsOptional()
  finalRAG?: SnapRAG;
}
