import { IsArray, IsUUID, IsString, IsOptional } from 'class-validator';

export class AddToProjectDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @IsString()
  @IsOptional()
  designationRole?: string;
}
