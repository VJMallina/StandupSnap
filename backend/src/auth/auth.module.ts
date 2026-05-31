import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Role } from '../entities/role.entity';
import { Invitation } from '../entities/invitation.entity';
import { MailModule } from '../mail/mail.module';
// Enterprise entities for permission system
import { Organization } from '../entities/organization.entity';
import { OrgUser } from '../entities/org-user.entity';
import { OrgRole } from '../entities/org-role.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { PermissionResolverService } from './services/permission-resolver.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      Role,
      Invitation,
      // Enterprise entities
      Organization,
      OrgUser,
      OrgRole,
      RolePermission,
    ]),
    PassportModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, PermissionResolverService, PermissionsGuard, JwtAuthGuard],
  exports: [AuthService, PermissionResolverService, PermissionsGuard, JwtAuthGuard],
})
export class AuthModule {}
