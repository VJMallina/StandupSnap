import { IsArray, IsUUID } from 'class-validator';

export class AddToProjectDto {
  @IsArray()
  @IsUUID('4', { each: true })
  teamMemberIds: string[];
}
