import { IsUUID, IsNotEmpty } from 'class-validator';

export class SetApprovedByDto {
  @IsUUID()
  @IsNotEmpty()
  approverId: string;
}
