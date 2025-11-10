import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Permission, RoleName } from '../../entities/role.entity';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should return true if no permissions are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if empty permissions array is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockExecutionContext({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false if user is not authenticated', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.CREATE_PROJECT]);
      const context = createMockExecutionContext(null);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false if user has no roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.CREATE_PROJECT]);
      const context = createMockExecutionContext({ id: 'user-1', roles: null });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return true if user has the required permission', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.CREATE_PROJECT]);
      const context = createMockExecutionContext({
        id: 'user-1',
        roles: [
          {
            name: RoleName.SCRUM_MASTER,
            permissions: [
              Permission.CREATE_PROJECT,
              Permission.VIEW_PROJECT,
            ],
          },
        ],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has at least one of the required permissions', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.CREATE_PROJECT, Permission.DELETE_PROJECT]);
      const context = createMockExecutionContext({
        id: 'user-1',
        roles: [
          {
            name: RoleName.PMO,
            permissions: [Permission.VIEW_PROJECT],
          },
          {
            name: RoleName.PRODUCT_OWNER,
            permissions: [Permission.CREATE_PROJECT, Permission.VIEW_PROJECT],
          },
        ],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false if user does not have any required permissions', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.CREATE_PROJECT]);
      const context = createMockExecutionContext({
        id: 'user-1',
        roles: [
          {
            name: RoleName.PMO,
            permissions: [Permission.VIEW_PROJECT],
          },
        ],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle roles with no permissions property', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.CREATE_PROJECT]);
      const context = createMockExecutionContext({
        id: 'user-1',
        roles: [
          {
            name: RoleName.PMO,
          },
        ],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle roles with non-array permissions', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.CREATE_PROJECT]);
      const context = createMockExecutionContext({
        id: 'user-1',
        roles: [
          {
            name: RoleName.PMO,
            permissions: 'invalid',
          },
        ],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should correctly aggregate permissions from multiple roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.MANAGE_ROLES]);
      const context = createMockExecutionContext({
        id: 'user-1',
        roles: [
          {
            name: RoleName.SCRUM_MASTER,
            permissions: [
              Permission.CREATE_PROJECT,
              Permission.MANAGE_ROLES,
            ],
          },
          {
            name: RoleName.PRODUCT_OWNER,
            permissions: [Permission.VIEW_PROJECT],
          },
        ],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
