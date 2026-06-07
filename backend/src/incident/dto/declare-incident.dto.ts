import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IncidentSeverity } from '../../entities/incident.entity';

export class DeclareIncidentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsUUID()
  projectId: string;
}
