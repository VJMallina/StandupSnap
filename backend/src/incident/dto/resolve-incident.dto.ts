import { IsNotEmpty, IsString } from 'class-validator';

export class ResolveIncidentDto {
  @IsNotEmpty()
  @IsString()
  resolutionSummary: string;
}
