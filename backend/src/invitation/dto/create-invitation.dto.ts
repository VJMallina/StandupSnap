import { IsEmail, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { RoleName } from '../../entities/role.entity';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsEnum(RoleName)
  assignedRole: RoleName;

  @IsUUID()
  @IsOptional()
  projectId?: string;
}
