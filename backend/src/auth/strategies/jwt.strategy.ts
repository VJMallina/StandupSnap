import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { JwtPayload, AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { SystemRoleName } from '../../entities/org-role.entity';

/**
 * Extended user type that includes org context
 * This is what gets attached to request.user
 */
export interface RequestUser extends User {
  // Enterprise org context (added from JWT or DB lookup)
  organizationId?: string;
  orgSlug?: string;
  orgRole?: string;
  orgPermissions?: string[];
  isOrgAdmin?: boolean;
  // permissionsVersion is inherited from User entity
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Validate JWT and return enriched user object
   *
   * The returned object is attached to request.user and includes:
   * - Base user data from database
   * - Org context from JWT payload (organizationId, orgRole, orgPermissions)
   *
   * During migration, org fields may not be present in JWT.
   * The PermissionsGuard handles cases where org context is missing.
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('user.id = :id', { id: payload.sub })
      .getOne();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Check for token staleness (permission version mismatch).
    // Also fires for old JWTs that were issued before permissionsVersion was added
    // (payload.permissionsVersion is undefined) — e.g. after org removal or role change.
    if (
      user.permissionsVersion &&
      (!payload.permissionsVersion || payload.permissionsVersion < user.permissionsVersion)
    ) {
      this.logger.debug(
        `Token stale for user ${user.id}: token v${payload.permissionsVersion} < db v${user.permissionsVersion}`,
      );
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token permissions are stale',
        code: 'TOKEN_STALE',
      });
    }

    // Create enriched user object with org context from JWT
    const requestUser: RequestUser = Object.assign(user, {
      organizationId: payload.organizationId,
      orgSlug: payload.orgSlug,
      orgRole: payload.orgRole,
      orgPermissions: payload.orgPermissions || [],
      isOrgAdmin: payload.orgRole === SystemRoleName.ORG_ADMIN,
    });

    return requestUser;
  }
}
