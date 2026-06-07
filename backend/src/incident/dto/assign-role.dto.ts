import { IsEnum, IsUUID } from 'class-validator';
import { IncidentRoleType } from '../../entities/incident-role.entity';

export class AssignRoleDto {
  @IsUUID()
  userId: string;

  @IsEnum(IncidentRoleType)
  role: IncidentRoleType;
}
