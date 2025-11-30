import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { StandaloneMeetingType } from '../../entities/standalone-mom.entity';

export class CreateStandaloneMomDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  sprintId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsDateString()
  meetingDate: string;

  @IsEnum(StandaloneMeetingType)
  meetingType: StandaloneMeetingType;

  @ValidateIf((dto) => dto.meetingType === StandaloneMeetingType.CUSTOM || dto.meetingType === StandaloneMeetingType.OTHER)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customMeetingType?: string;

  @IsOptional()
  @IsString()
  rawNotes?: string;

  @IsOptional()
  @IsString()
  agenda?: string;

  @IsOptional()
  @IsString()
  discussionSummary?: string;

  @IsOptional()
  @IsString()
  decisions?: string;

  @IsOptional()
  @IsString()
  actionItems?: string;
}
