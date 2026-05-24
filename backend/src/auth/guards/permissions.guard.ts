import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionResolverService } from '../services/permission-resolver.service';

/**
 * Metadata key for storing required permissions on route handlers
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Options for permission checking
 */
export interface PermissionCheckOptions {
  /** If true, permission check uses project context from request */
  projectScoped?: boolean;
  /** If true, user must have ALL permissions (AND). Default is ANY (OR) */
  requireAll?: boolean;
}

/**
 * PermissionsGuard - Dynamic permission-based access control
 *
 * Replaces the old static role-based guard with dynamic permission resolution.
 * Uses PermissionResolverService to resolve user permissions based on:
 * - Org-level role
 * - Project-level role override
 * - Confidential project handling
 *
 * Usage:
 * @RequirePermissions('snap:lock_daily')
 * @RequirePermissions(['snap:view_all', 'snap:edit_any'], { requireAll: true })
 * @RequirePermissions('sprint:close', { projectScoped: true })
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator metadata
    const permissionsMetadata = this.reflector.getAllAndOverride<
      string | string[] | { permissions: string | string[]; options?: PermissionCheckOptions }
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // No permissions required - allow access
    if (!permissionsMetadata) {
      return true;
    }

    // Parse metadata
    let requiredPermissions: string[];
    let options: PermissionCheckOptions = {};

    if (typeof permissionsMetadata === 'string') {
      requiredPermissions = [permissionsMetadata];
    } else if (Array.isArray(permissionsMetadata)) {
      requiredPermissions = permissionsMetadata;
    } else {
      requiredPermissions = Array.isArray(permissionsMetadata.permissions)
        ? permissionsMetadata.permissions
        : [permissionsMetadata.permissions];
      options = permissionsMetadata.options || {};
    }

    // Get request and user
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request - access denied');
      return false;
    }

    // Get organization ID from user (set by JWT strategy or tenant middleware)
    const orgId = user.organizationId;
    if (!orgId) {
      this.logger.warn(`User ${user.id} has no organization context - access denied`);
      return false;
    }

    // Get project ID if this is a project-scoped check
    let projectId: string | undefined;
    if (options.projectScoped) {
      projectId = this.extractProjectId(request);
      if (!projectId) {
        this.logger.warn('Project-scoped permission check but no projectId found');
        throw new ForbiddenException('Project context required for this action');
      }
    }

    // Resolve user permissions
    const resolved = await this.permissionResolver.resolvePermissions(
      user.id,
      orgId,
      projectId,
    );

    // ORG_ADMIN bypasses all permission checks
    if (resolved.isOrgAdmin) {
      this.logger.debug(`User ${user.id} is ORG_ADMIN - access granted`);
      return true;
    }

    // Check permissions
    const hasAccess = options.requireAll
      ? requiredPermissions.every((p) => resolved.permissions.includes(p))
      : requiredPermissions.some((p) => resolved.permissions.includes(p));

    if (!hasAccess) {
      this.logger.debug(
        `User ${user.id} denied access. ` +
          `Required: [${requiredPermissions.join(', ')}], ` +
          `Has: [${resolved.permissions.slice(0, 10).join(', ')}${resolved.permissions.length > 10 ? '...' : ''}]`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    this.logger.debug(
      `User ${user.id} granted access for [${requiredPermissions.join(', ')}]`,
    );
    return true;
  }

  /**
   * Extract project ID from request (params, body, or query)
   */
  private extractProjectId(request: any): string | undefined {
    return (
      request.params?.projectId ||
      request.body?.projectId ||
      request.query?.projectId ||
      // Also check for 'project_id' and 'project' variations
      request.params?.project_id ||
      request.body?.project_id ||
      request.query?.project_id ||
      request.params?.project ||
      request.body?.project
    );
  }
}
