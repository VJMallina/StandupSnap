import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TimelineEntryType } from '../../entities/incident-timeline-entry.entity';

export class AddTimelineEntryDto {
  @IsEnum(TimelineEntryType)
  entryType: TimelineEntryType;

  @IsNotEmpty()
  @IsString()
  content: string;
}
