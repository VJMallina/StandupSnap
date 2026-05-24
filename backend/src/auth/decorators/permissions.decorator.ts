import { SetMetadata } from '@nestjs/common';
import {
  PERMISSIONS_KEY,
  PermissionCheckOptions,
} from '../guards/permissions.guard';

/**
 * Decorator to require specific permissions for a route handler.
 * Used with PermissionsGuard to restrict access based on user permissions.
 *
 * @example
 * // Single permission
 * @RequirePermissions('snap:lock_daily')
 *
 * @example
 * // Multiple permissions (ANY - user needs at least one)
 * @RequirePermissions('snap:edit_own', 'snap:edit_any')
 *
 * @example
 * // Multiple permissions (ALL - user needs all of them)
 * @RequirePermissions(['snap:view_all', 'snap:generate_summary'], { requireAll: true })
 *
 * @example
 * // Project-scoped permission (requires projectId in request)
 * @RequirePermissions('sprint:close', { projectScoped: true })
 */
export function RequirePermissions(
  permissions: string | string[],
  options?: PermissionCheckOptions,
): MethodDecorator & ClassDecorator;
export function RequirePermissions(
  ...permissions: string[]
): MethodDecorator & ClassDecorator;
export function RequirePermissions(
  ...args: any[]
): MethodDecorator & ClassDecorator {
  // Case 1: RequirePermissions('permission') or RequirePermissions('perm1', 'perm2')
  if (args.every((arg) => typeof arg === 'string')) {
    return SetMetadata(PERMISSIONS_KEY, args);
  }

  // Case 2: RequirePermissions(['perm1', 'perm2'], { options })
  if (Array.isArray(args[0])) {
    const permissions = args[0] as string[];
    const options = (args[1] as PermissionCheckOptions) || {};
    return SetMetadata(PERMISSIONS_KEY, { permissions, options });
  }

  // Case 3: RequirePermissions('permission', { options })
  if (typeof args[0] === 'string' && typeof args[1] === 'object') {
    const permissions = [args[0] as string];
    const options = args[1] as PermissionCheckOptions;
    return SetMetadata(PERMISSIONS_KEY, { permissions, options });
  }

  // Fallback
  return SetMetadata(PERMISSIONS_KEY, args);
}

/**
 * Shorthand for project-scoped permissions
 *
 * @example
 * @RequireProjectPermission('sprint:close')
 */
export const RequireProjectPermission = (permission: string) =>
  RequirePermissions(permission, { projectScoped: true });

/**
 * Shorthand for requiring ALL permissions
 *
 * @example
 * @RequireAllPermissions('snap:view_all', 'snap:generate_summary')
 */
export const RequireAllPermissions = (...permissions: string[]) =>
  RequirePermissions(permissions, { requireAll: true });
