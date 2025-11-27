import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { SnapRAG } from '../../entities/snap.entity';

export class CreateSnapDto {
  @IsUUID()
  @IsNotEmpty()
  cardId: string;

  @IsString()
  @IsNotEmpty()
  rawInput: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(3)
  slotNumber: number;

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
