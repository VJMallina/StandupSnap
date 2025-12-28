import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class CreateArtifactVersionDto {
  @IsObject()
  @IsNotEmpty()
  data: any;

  @IsString()
  @IsOptional()
  changeSummary?: string;

  @IsBoolean()
  @IsOptional()
  isMajorVersion?: boolean;
}
