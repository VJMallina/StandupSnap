import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SnapRAG } from '../../entities/snap.entity';

export class OverrideRAGDto {
  @IsEnum(SnapRAG)
  ragStatus: SnapRAG;

  @IsString()
  @IsOptional()
  notes?: string;
}
