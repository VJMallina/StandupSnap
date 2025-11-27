import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateMomDto {
  @IsUUID()
  @IsNotEmpty()
  sprintId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

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
