import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { SnapRAG } from '../../entities/snap.entity';

export class UpdateSnapDto {
  @IsString()
  @IsOptional()
  rawInput?: string;

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

  @IsBoolean()
  @IsOptional()
  regenerate?: boolean; // If true, re-run AI parsing
}
