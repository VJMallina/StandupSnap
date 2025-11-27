import { IsString, IsOptional } from 'class-validator';

export class UpdateMomDto {
  @IsString()
  @IsOptional()
  rawInput?: string;

  @IsString()
  @IsOptional()
  agenda?: string;

  @IsString()
  @IsOptional()
  keyDiscussionPoints?: string;

  @IsString()
  @IsOptional()
  decisionsTaken?: string;

  @IsString()
  @IsOptional()
  actionItems?: string;
}
