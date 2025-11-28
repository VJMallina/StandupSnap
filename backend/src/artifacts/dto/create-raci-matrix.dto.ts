import { IsString, IsUUID, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateRaciMatrixDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
