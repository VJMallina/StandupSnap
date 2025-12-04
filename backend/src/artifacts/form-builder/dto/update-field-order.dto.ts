import { IsArray, IsString, IsUUID } from 'class-validator';

export class UpdateFieldOrderDto {
  @IsArray()
  @IsString({ each: true })
  fieldIds: string[]; // Array of field IDs in desired order
}
