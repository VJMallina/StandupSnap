import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../../entities/role.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      return false;
    }

    return this.hasRoles(user, requiredRoles);
  }

  private hasRoles(user: any, requiredRoles: RoleName[]): boolean {
    // Get all role names from user
    const userRoleNames = user.roles.map((role: any) => role.name);

    // Check if user has at least one of the required roles
    return requiredRoles.some((roleName) => userRoleNames.includes(roleName));
  }
}
