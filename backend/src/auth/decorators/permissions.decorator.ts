import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../entities/role.entity';

/**
 * Decorator to require specific permissions for a route handler.
 * Used with PermissionsGuard to restrict access based on user permissions.
 *
 * @example
 * @RequirePermissions(Permission.CREATE_PROJECT, Permission.EDIT_PROJECT)
 * @Post()
 * createProject() { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata('permissions', permissions);
