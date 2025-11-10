import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../../entities/role.entity';

/**
 * Decorator to require specific roles for a route handler.
 * Used with RolesGuard to restrict access based on user roles.
 *
 * @example
 * @RequireRoles(RoleName.SCRUM_MASTER, RoleName.PRODUCT_OWNER)
 * @Delete(':id')
 * deleteProject(@Param('id') id: string) { ... }
 */
export const RequireRoles = (...roles: RoleName[]) =>
  SetMetadata('roles', roles);
