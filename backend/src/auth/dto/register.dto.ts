import { IsNotEmpty, IsString, IsEnum, IsOptional, IsEmail } from 'class-validator';
import { RoleName } from '../../entities/role.entity';
import { IsValidUsername } from '../validators/username.validator';
import { IsStrongPassword } from '../validators/password.validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @IsValidUsername()
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @IsStrongPassword()
  password: string;

  @IsEnum(RoleName, {
    message: 'Role must be one of: scrum_master, product_owner, pmo',
  })
  @IsNotEmpty({ message: 'Role is required' })
  roleName: RoleName;

  @IsOptional()
  @IsString()
  invitationToken?: string;
}
