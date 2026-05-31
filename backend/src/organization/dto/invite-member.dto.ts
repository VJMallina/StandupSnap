import {
  IsString,
  IsEmail,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsUUID()
  orgRoleId: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  projectRoleId?: string;
}

export class UpdateMemberRoleDto {
  @IsUUID()
  orgRoleId: string;
}

export class AddMemberToProjectDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  projectRoleId?: string;
}
