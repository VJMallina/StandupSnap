import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IncidentSeverity, IncidentStatus } from '../../entities/incident.entity';

export class UpdateIncidentDto {
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;
}
