import { IsEnum, IsOptional, IsNotEmpty, IsInt, Min, Matches } from 'class-validator';
import { RaciRole } from '../../entities/raci-entry.entity';

export class SetRaciDto {
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  rowOrder: number;

  @IsNotEmpty()
  @Matches(/^user-.+|[0-9a-fA-F-]{36}$/, {
    message: 'teamMemberId must be a UUID or start with user-',
  })
  teamMemberId: string;

  @IsEnum(RaciRole)
  @IsOptional()
  raciRole?: RaciRole; // If null, removes the RACI assignment
}
