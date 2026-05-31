import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Extended Request interface with tenant context
 */
export interface TenantRequest extends Request {
  user?: {
    id: string;
    username: string;
    organizationId: string;
    orgSlug?: string;
    orgRole?: string;
    orgPermissions?: string[];
    permissionsVersion?: number;
    [key: string]: any;
  };
  orgId?: string;
  tenantContext?: {
    organizationId: string;
    orgSlug?: string;
  };
}

/**
 * TenantMiddleware - Extracts and validates organization context from JWT
 *
 * This middleware:
 * 1. Extracts organizationId from the authenticated user (set by JWT strategy)
 * 2. Sets req.orgId for easy access in services
 * 3. Ensures all authenticated requests have tenant context
 *
 * Must be applied AFTER JwtAuthGuard in the middleware chain.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  use(req: TenantRequest, res: Response, next: NextFunction): void {
    // Skip if no user (public routes)
    if (!req.user) {
      return next();
    }

    const orgId = req.user.organizationId;

    if (!orgId) {
      this.logger.warn(
        `User ${req.user.id} authenticated but has no organization context`,
      );
      throw new UnauthorizedException(
        'No organization context. Please contact your administrator.',
      );
    }

    // Set tenant context on request for easy access
    req.orgId = orgId;
    req.tenantContext = {
      organizationId: orgId,
      orgSlug: req.user.orgSlug,
    };

    this.logger.debug(`Tenant context set: orgId=${orgId}`);

    next();
  }
}

/**
 * Helper function to get organization ID from request
 * For use in services and controllers
 */
export function getOrgIdFromRequest(req: TenantRequest): string {
  const orgId = req.orgId || req.user?.organizationId;
  if (!orgId) {
    throw new UnauthorizedException('No organization context');
  }
  return orgId;
}

/**
 * Helper function to get user ID from request
 */
export function getUserIdFromRequest(req: TenantRequest): string {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedException('No user context');
  }
  return userId;
}
