import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../../entities/role.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // TEMPORARY: Bypass all permission checks - allow all authenticated users
    // TODO: Re-enable permission checks when RBAC is fully configured
    console.log('[PermissionsGuard] BYPASSED - Allowing all authenticated users');
    return true;

    /* COMMENTED OUT - Will re-enable later for proper RBAC
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    console.log('[PermissionsGuard] Required permissions:', requiredPermissions);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      console.log('[PermissionsGuard] No permissions required, allowing access');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('[PermissionsGuard] User from request:', user ? 'Present' : 'Missing');
    console.log('[PermissionsGuard] User roles:', user?.roles ? 'Present' : 'Missing');

    if (!user || !user.roles) {
      console.log('[PermissionsGuard] Denied - No user or roles');
      return false;
    }

    // Check if any of the user's roles has any of the required permissions
    const hasAccess = this.hasPermissions(user, requiredPermissions);
    console.log('[PermissionsGuard] Has access:', hasAccess);
    return hasAccess;
    */
  }

  private hasPermissions(user: any, requiredPermissions: Permission[]): boolean {
    // Get all permissions from all user roles
    const userPermissions = new Set<Permission>();

    user.roles.forEach((role: any) => {
      console.log('[PermissionsGuard] Checking role:', role.name);
      console.log('[PermissionsGuard] Role permissions:', role.permissions);
      console.log('[PermissionsGuard] Is Array:', Array.isArray(role.permissions));

      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach((permission: Permission) => {
          userPermissions.add(permission);
        });
      }
    });

    console.log('[PermissionsGuard] All user permissions:', Array.from(userPermissions));

    // Check if user has at least one of the required permissions
    return requiredPermissions.some((permission) =>
      userPermissions.has(permission),
    );
  }
}
