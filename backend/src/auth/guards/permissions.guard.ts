import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../../entities/role.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      return false;
    }

    // Check if any of the user's roles has any of the required permissions
    return this.hasPermissions(user, requiredPermissions);
  }

  private hasPermissions(user: any, requiredPermissions: Permission[]): boolean {
    // Get all permissions from all user roles
    const userPermissions = new Set<Permission>();

    user.roles.forEach((role: any) => {
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach((permission: Permission) => {
          userPermissions.add(permission);
        });
      }
    });

    // Check if user has at least one of the required permissions
    return requiredPermissions.some((permission) =>
      userPermissions.has(permission),
    );
  }
}
