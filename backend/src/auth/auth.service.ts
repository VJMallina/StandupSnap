import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Role, RoleName } from '../entities/role.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse } from './interfaces/auth-response.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName, roleName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get the specified role or default to 'scrum_master' role
    const selectedRoleName = roleName || RoleName.SCRUM_MASTER;
    const userRole = await this.roleRepository.findOne({
      where: { name: selectedRoleName },
    });

    if (!userRole) {
      throw new Error('Role not found. Please run database seeders.');
    }

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      roles: [userRole],
    });

    const savedUser = await this.userRepository.save(user);

    // Reload user with roles relation
    const userWithRoles = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['roles'],
    });

    // Generate tokens
    return this.generateTokens(userWithRoles);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    // Find refresh token
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user', 'user.roles'],
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is revoked
    if (token.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Check if token is expired
    if (new Date() > token.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new tokens
    return this.generateTokens(token.user);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    // Revoke the refresh token
    await this.refreshTokenRepository.update(
      { user: { id: userId }, token: refreshToken },
      { isRevoked: true },
    );
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async generateTokens(user: User): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '24h',
    });

    // Generate refresh token (valid for 7 days)
    const refreshTokenValue = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    // Save refresh token to database
    const refreshToken = this.refreshTokenRepository.create({
      token: refreshTokenValue,
      user: user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
        })),
      },
    };
  }
}
