import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { DesignationRole } from '../../entities/team-member.entity';

export class CreateTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(DesignationRole)
  @IsNotEmpty()
  designationRole: DesignationRole;

  @IsString()
  @IsOptional()
  displayName?: string;
}
