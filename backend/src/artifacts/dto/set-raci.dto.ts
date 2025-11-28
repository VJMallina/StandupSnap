import { IsUUID, IsEnum, IsOptional, IsNotEmpty, IsInt, Min } from 'class-validator';
import { RaciRole } from '../../entities/raci-entry.entity';

export class SetRaciDto {
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  rowOrder: number;

  @IsUUID()
  @IsNotEmpty()
  teamMemberId: string;

  @IsEnum(RaciRole)
  @IsOptional()
  raciRole?: RaciRole; // If null, removes the RACI assignment
}
