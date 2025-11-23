import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Role, RoleName } from '../entities/role.entity';
import { Invitation } from '../entities/invitation.entity';
import { Project } from '../entities/project.entity';
import { MailService } from '../mail/mail.service';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let roleRepository: Repository<Role>;
  let invitationRepository: Repository<Invitation>;
  let projectRepository: Repository<Project>;
  let jwtService: JwtService;
  let mailService: MailService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockRoleRepository = {
    findOne: jest.fn(),
  };

  const mockInvitationRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockMailService = {
    sendPasswordReset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepository },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
        { provide: getRepositoryToken(Invitation), useValue: mockInvitationRepository },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    invitationRepository = module.get<Repository<Invitation>>(getRepositoryToken(Invitation));
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    jwtService = module.get<JwtService>(JwtService);
    mailService = module.get<MailService>(MailService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      roleName: RoleName.SCRUM_MASTER,
    };

    it('should successfully register a new user', async () => {
      const mockRole = { id: '1', name: RoleName.SCRUM_MASTER };
      const mockUser = {
        id: '1',
        ...registerDto,
        roles: [mockRole],
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(mockUser); // reload with roles
      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockRefreshTokenRepository.create.mockReturnValue({});
      mockRefreshTokenRepository.save.mockResolvedValue({});
      mockConfigService.get.mockReturnValue('7d');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce({ username: 'testuser' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce({ email: 'test@example.com' }); // email check

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      usernameOrEmail: 'testuser',
      password: 'password123',
    };

    it('should successfully login with username', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        isActive: true,
        roles: [{ id: '1', name: RoleName.SCRUM_MASTER }],
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockRefreshTokenRepository.create.mockReturnValue({});
      mockRefreshTokenRepository.save.mockResolvedValue({});
      mockConfigService.get.mockReturnValue('7d');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should successfully login with email', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        isActive: true,
        roles: [{ id: '1', name: RoleName.SCRUM_MASTER }],
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockRefreshTokenRepository.create.mockReturnValue({});
      mockRefreshTokenRepository.save.mockResolvedValue({});
      mockConfigService.get.mockReturnValue('7d');

      const result = await service.login({
        usernameOrEmail: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('differentpassword', 10);
      const mockUser = {
        id: '1',
        username: 'testuser',
        password: hashedPassword,
        isActive: true,
        roles: [{ id: '1', name: RoleName.SCRUM_MASTER }],
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email if user exists', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        passwordResetToken: null,
        passwordResetExpires: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockMailService.sendPasswordReset.mockResolvedValue(undefined);

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('If this email is registered');
      expect(mockMailService.sendPasswordReset).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should return same message if user does not exist (security)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result.message).toContain('If this email is registered');
      expect(mockMailService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        passwordResetToken: 'hashed-token',
        passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour from now
        password: 'old-password',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.resetPassword('valid-token', 'newpassword123');

      expect(result.message).toContain('successfully');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if token is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword('invalid-token', 'newpassword')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token is expired', async () => {
      const mockUser = {
        id: '1',
        passwordResetToken: 'hashed-token',
        passwordResetExpires: new Date(Date.now() - 3600000), // 1 hour ago (expired)
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.resetPassword('expired-token', 'newpassword')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
