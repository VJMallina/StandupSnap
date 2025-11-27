import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateMomDto {
  @IsString()
  @IsNotEmpty()
  rawInput: string;
}
