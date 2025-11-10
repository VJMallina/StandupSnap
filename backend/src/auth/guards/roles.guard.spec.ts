import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RoleName, Permission } from '../../entities/role.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
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
    it('should return true if no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if empty roles array is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockExecutionContext({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false if user is not authenticated', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([RoleName.SCRUM_MASTER]);
      const context = createMockExecutionContext(null);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false if user has no roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([RoleName.SCRUM_MASTER]);
      const context = createMockExecutionContext({ id: 'user-1', roles: null });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return true if user has the required role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([RoleName.SCRUM_MASTER]);
      const context = createMockExecutionContext({
        id: 'user-1',
        roles: [
          {
            name: RoleName.SCRUM_MASTER,
            permissions: [Permission.CREATE_PROJECT],
          },
        ],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has at least one of the required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([RoleName.SCRUM_MASTER, RoleName.PRODUCT_OWNER]);
      const context = createMockExecutionContext({
        id: 'user-1',
        roles: [
          {
            name: RoleName.PRODUCT_OWNER,
            permissions: [Permission.CREATE_PROJECT],
          },
        ],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false if user does not have any required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([RoleName.SCRUM_MASTER]);
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

    it('should return true if user has multiple roles including required one', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([RoleName.PRODUCT_OWNER]);
      const context = createMockExecutionContext({
        id: 'user-1',
        roles: [
          {
            name: RoleName.PMO,
            permissions: [Permission.VIEW_PROJECT],
          },
          {
            name: RoleName.PRODUCT_OWNER,
            permissions: [Permission.CREATE_PROJECT],
          },
        ],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle multiple required roles correctly', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([RoleName.SCRUM_MASTER, RoleName.PRODUCT_OWNER, RoleName.PMO]);
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

      expect(result).toBe(true);
    });
  });
});
