import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, IsEmail } from 'class-validator';
import { PowerLevel, InterestLevel, CommunicationFrequency } from '../../entities/stakeholder.entity';

export class UpdateStakeholderDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  stakeholderName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  role?: string;

  @IsEnum(PowerLevel)
  @IsOptional()
  powerLevel?: PowerLevel;

  @IsEnum(InterestLevel)
  @IsOptional()
  interestLevel?: InterestLevel;

  @IsString()
  @IsOptional()
  engagementStrategy?: string;

  @IsEnum(CommunicationFrequency)
  @IsOptional()
  communicationFrequency?: CommunicationFrequency;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  ownerId?: string;
}
