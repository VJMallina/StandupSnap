import { IsNotEmpty, Matches } from 'class-validator';

export class AddTeamMemberColumnDto {
  @Matches(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|user-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i, {
    message: 'teamMemberId must be a valid UUID or user-{UUID} format for special roles',
  })
  @IsNotEmpty()
  teamMemberId: string;
}
