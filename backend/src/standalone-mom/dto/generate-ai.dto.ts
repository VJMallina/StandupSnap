import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateStandaloneMomDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
