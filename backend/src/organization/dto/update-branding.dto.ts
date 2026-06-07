import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'brandPrimaryColor must be a valid hex color (e.g. #1a73e8)' })
  brandPrimaryColor?: string | null;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'brandSecondaryColor must be a valid hex color' })
  brandSecondaryColor?: string | null;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'brandAccentColor must be a valid hex color' })
  brandAccentColor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  brandFaviconUrl?: string | null;
}
