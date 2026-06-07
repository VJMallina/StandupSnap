import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantStorage } from './tenant.context';

function decodeTokenPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Runs before route handlers. Reads orgSlug + organizationId from the JWT
 * (without re-verifying — JwtGuard still verifies on protected routes) and
 * stores them in AsyncLocalStorage so any downstream code can call
 * getCurrentTenant() to find the current request's tenant.
 *
 * If a Bearer token is present but lacks org context, the request is rejected
 * with 401 so the client is forced to re-authenticate and get a fresh token.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);
    const payload = decodeTokenPayload(token);

    if (payload?.orgSlug && payload?.organizationId) {
      tenantStorage.run(
        { orgSlug: payload.orgSlug, orgId: payload.organizationId },
        next,
      );
    } else {
      res.status(401).json({
        statusCode: 401,
        message: 'Session expired. Please log in again.',
      });
    }
  }
}
