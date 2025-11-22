import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Role, RoleName } from '../entities/role.entity';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { Project } from '../entities/project.entity';
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
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { username, email, password, name, roleName, invitationToken } = registerDto;

    // Check if username already exists
    const existingUsername = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already registered');
    }

    // Check if email already exists
    const existingEmail = await this.userRepository.findOne({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    let selectedRole = roleName;
    let invitation: Invitation | null = null;

    // Handle invitation-based registration
    if (invitationToken) {
      invitation = await this.invitationRepository.findOne({
        where: { token: invitationToken },
        relations: ['project'],
      });

      if (!invitation) {
        throw new BadRequestException('Invalid invitation token');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException('This invitation has already been used');
      }

      if (invitation.expiresAt && invitation.expiresAt < new Date()) {
        invitation.status = InvitationStatus.EXPIRED;
        await this.invitationRepository.save(invitation);
        throw new BadRequestException('This invitation has expired');
      }

      // Override role with invitation's assigned role (role-locked)
      selectedRole = invitation.assignedRole as RoleName;
    }

    // Validate role - Team Member cannot self-register
    if (selectedRole && !Object.values(RoleName).includes(selectedRole)) {
      throw new BadRequestException('Invalid role selected');
    }

    // Get the role from database
    const userRole = await this.roleRepository.findOne({
      where: { name: selectedRole },
    });

    if (!userRole) {
      throw new Error('Role not found. Please run database seeders.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      name,
      roles: [userRole],
    });

    const savedUser = await this.userRepository.save(user);

    // Mark invitation as accepted and update project if it exists
    if (invitation) {
      invitation.status = InvitationStatus.ACCEPTED;
      await this.invitationRepository.save(invitation);

      // Update project with the new user based on their role
      if (invitation.project) {
        const project = await this.projectRepository.findOne({
          where: { id: invitation.project.id },
        });

        if (project) {
          if (invitation.assignedRole === 'product_owner') {
            project.productOwner = savedUser;
            await this.projectRepository.save(project);
          } else if (invitation.assignedRole === 'pmo') {
            project.pmo = savedUser;
            await this.projectRepository.save(project);
          }
        }
      }
    }

    // Reload user with roles relation
    const userWithRoles = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['roles'],
    });

    // Generate tokens
    return this.generateTokens(userWithRoles);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.usernameOrEmail, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async validateUser(usernameOrEmail: string, password: string): Promise<User | null> {
    // Try to find user by username or email
    const user = await this.userRepository.findOne({
      where: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ],
      relations: ['roles'],
    });

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account is disabled. Contact admin.');
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
      username: user.username,
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
        username: user.username,
        email: user.email,
        name: user.name,
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
