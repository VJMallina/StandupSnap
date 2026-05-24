import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard, PERMISSIONS_KEY } from './permissions.guard';
import { PermissionResolverService } from '../services/permission-resolver.service';
import { PERMISSIONS } from '../../common/constants/permissions';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let permissionResolver: jest.Mocked<PermissionResolverService>;

  const mockPermissionResolver = {
    resolvePermissions: jest.fn(),
    hasPermission: jest.fn(),
    hasAnyPermission: jest.fn(),
    hasAllPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: PermissionResolverService,
          useValue: mockPermissionResolver,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    permissionResolver = module.get(PermissionResolverService);

    // Reset mocks
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    user: any,
    params: Record<string, any> = {},
    body: Record<string, any> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user, params, body }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should return true if no permissions are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockExecutionContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionResolver.resolvePermissions).not.toHaveBeenCalled();
    });

    it('should return false if user is not authenticated', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([PERMISSIONS.PROJECT_CREATE]);
      const context = createMockExecutionContext(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false if user has no organizationId', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([PERMISSIONS.PROJECT_CREATE]);
      const context = createMockExecutionContext({ id: 'user-1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return true if user is ORG_ADMIN', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([PERMISSIONS.PROJECT_CREATE]);

      mockPermissionResolver.resolvePermissions.mockResolvedValue({
        permissions: [],
        orgRole: 'ORG_ADMIN',
        isOrgAdmin: true,
      });

      const context = createMockExecutionContext({
        id: 'user-1',
        organizationId: 'org-1',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has the required permission', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([PERMISSIONS.PROJECT_CREATE]);

      mockPermissionResolver.resolvePermissions.mockResolvedValue({
        permissions: [PERMISSIONS.PROJECT_CREATE, PERMISSIONS.PROJECT_VIEW],
        orgRole: 'SCRUM_MASTER',
        isOrgAdmin: false,
      });

      const context = createMockExecutionContext({
        id: 'user-1',
        organizationId: 'org-1',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if user has at least one of the required permissions (OR logic)', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([PERMISSIONS.PROJECT_CREATE, PERMISSIONS.PROJECT_DELETE]);

      mockPermissionResolver.resolvePermissions.mockResolvedValue({
        permissions: [PERMISSIONS.PROJECT_CREATE], // Has one of the two
        orgRole: 'SCRUM_MASTER',
        isOrgAdmin: false,
      });

      const context = createMockExecutionContext({
        id: 'user-1',
        organizationId: 'org-1',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user does not have any required permissions', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([PERMISSIONS.PROJECT_CREATE]);

      mockPermissionResolver.resolvePermissions.mockResolvedValue({
        permissions: [PERMISSIONS.PROJECT_VIEW], // Has different permission
        orgRole: 'VIEWER',
        isOrgAdmin: false,
      });

      const context = createMockExecutionContext({
        id: 'user-1',
        organizationId: 'org-1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should handle single string permission', async () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(PERMISSIONS.PROJECT_CREATE);

      mockPermissionResolver.resolvePermissions.mockResolvedValue({
        permissions: [PERMISSIONS.PROJECT_CREATE],
        orgRole: 'SCRUM_MASTER',
        isOrgAdmin: false,
      });

      const context = createMockExecutionContext({
        id: 'user-1',
        organizationId: 'org-1',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle permission with options object', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        permissions: [PERMISSIONS.SPRINT_CLOSE],
        options: { projectScoped: true },
      });

      mockPermissionResolver.resolvePermissions.mockResolvedValue({
        permissions: [PERMISSIONS.SPRINT_CLOSE],
        orgRole: 'SCRUM_MASTER',
        isOrgAdmin: false,
      });

      const context = createMockExecutionContext(
        { id: 'user-1', organizationId: 'org-1' },
        { projectId: 'project-1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionResolver.resolvePermissions).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'project-1',
      );
    });

    it('should throw ForbiddenException if projectScoped but no projectId in request', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        permissions: [PERMISSIONS.SPRINT_CLOSE],
        options: { projectScoped: true },
      });

      const context = createMockExecutionContext(
        { id: 'user-1', organizationId: 'org-1' },
        {}, // No projectId
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should require ALL permissions when requireAll option is true', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        permissions: [PERMISSIONS.SNAP_VIEW_ALL, PERMISSIONS.SNAP_GENERATE_SUMMARY],
        options: { requireAll: true },
      });

      // User only has one of the two required permissions
      mockPermissionResolver.resolvePermissions.mockResolvedValue({
        permissions: [PERMISSIONS.SNAP_VIEW_ALL],
        orgRole: 'SCRUM_MASTER',
        isOrgAdmin: false,
      });

      const context = createMockExecutionContext({
        id: 'user-1',
        organizationId: 'org-1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should pass when user has ALL required permissions with requireAll option', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        permissions: [PERMISSIONS.SNAP_VIEW_ALL, PERMISSIONS.SNAP_GENERATE_SUMMARY],
        options: { requireAll: true },
      });

      mockPermissionResolver.resolvePermissions.mockResolvedValue({
        permissions: [PERMISSIONS.SNAP_VIEW_ALL, PERMISSIONS.SNAP_GENERATE_SUMMARY, PERMISSIONS.SNAP_LOCK_DAILY],
        orgRole: 'SCRUM_MASTER',
        isOrgAdmin: false,
      });

      const context = createMockExecutionContext({
        id: 'user-1',
        organizationId: 'org-1',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should extract projectId from body if not in params', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        permissions: [PERMISSIONS.CARD_CREATE],
        options: { projectScoped: true },
      });

      mockPermissionResolver.resolvePermissions.mockResolvedValue({
        permissions: [PERMISSIONS.CARD_CREATE],
        orgRole: 'MEMBER',
        isOrgAdmin: false,
      });

      const context = createMockExecutionContext(
        { id: 'user-1', organizationId: 'org-1' },
        {}, // No projectId in params
        { projectId: 'project-from-body' }, // projectId in body
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(permissionResolver.resolvePermissions).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'project-from-body',
      );
    });
  });
});
