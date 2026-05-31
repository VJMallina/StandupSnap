import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { OrgUser } from '../../entities/org-user.entity';
import { OrgRole, SystemRoleName } from '../../entities/org-role.entity';
import { ProjectMember } from '../../entities/project-member.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { Project } from '../../entities/project.entity';
import { PERMISSIONS, ALL_PERMISSION_KEYS } from '../../common/constants/permissions';
import { TenantService } from '../../tenant/tenant.service';

export interface ResolvedPermissions {
  permissions: string[];
  orgRole: string;
  projectRole?: string;
  isOrgAdmin: boolean;
}

/**
 * PermissionResolverService - Core permission resolution logic
 *
 * Resolves user permissions based on:
 * 1. Org-level role (stored in OrgUser)
 * 2. Project-level role override (stored in ProjectMember)
 * 3. Special handling for ORG_ADMIN (bypasses all checks)
 * 4. Special handling for confidential projects (blocks PMO unless explicitly added)
 *
 * Based on StandupSnap_Enterprise_Architecture.md Section 8
 */
@Injectable()
export class PermissionResolverService {
  private readonly logger = new Logger(PermissionResolverService.name);

  constructor(
    @InjectRepository(OrgUser)
    private readonly orgUserRepo: Repository<OrgUser>,
    @InjectRepository(OrgRole)
    private readonly orgRoleRepo: Repository<OrgRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * Resolve permissions for a user in an organization, optionally for a specific project
   *
   * Resolution logic:
   * 1. If user is ORG_ADMIN -> return ALL permissions
   * 2. If no projectId -> return org role permissions
   * 3. If projectId provided:
   *    a. Check if project is confidential
   *    b. Check if user has project:view_all (PMO)
   *    c. Check if user has ProjectMember record
   *    d. Return appropriate permissions based on context
   */
  async resolvePermissions(
    userId: string,
    orgId: string,
    projectId?: string,
  ): Promise<ResolvedPermissions> {
    // Step 1: Get org membership and role
    const orgUser = await this.orgUserRepo.findOne({
      where: {
        userId,
        organizationId: orgId,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['orgRole'],
    });

    if (!orgUser || !orgUser.orgRole) {
      this.logger.warn(`User ${userId} not found in org ${orgId} or has no role`);
      return {
        permissions: [],
        orgRole: '',
        isOrgAdmin: false,
      };
    }

    const orgRole = orgUser.orgRole;

    // Step 2: ORG_ADMIN bypass - gets everything
    if (orgRole.name === SystemRoleName.ORG_ADMIN) {
      return {
        permissions: [...ALL_PERMISSION_KEYS],
        orgRole: orgRole.name,
        isOrgAdmin: true,
      };
    }

    // Step 3: Get org role permissions
    const orgRolePermissions = await this.getRolePermissions(orgRole.id);

    // Step 4: If no project context, return org permissions
    if (!projectId) {
      return {
        permissions: orgRolePermissions,
        orgRole: orgRole.name,
        isOrgAdmin: false,
      };
    }

    // Step 5: Project-scoped permission resolution
    return this.resolveProjectPermissions(
      userId,
      orgId,
      projectId,
      orgRole,
      orgRolePermissions,
    );
  }

  /**
   * Resolve permissions for a specific project context
   */
  private async resolveProjectPermissions(
    userId: string,
    orgId: string,
    projectId: string,
    orgRole: OrgRole,
    orgRolePermissions: string[],
  ): Promise<ResolvedPermissions> {
    const [projectRepo, projectMemberRepo] = await Promise.all([
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(ProjectMember),
    ]);

    // Check if project exists and get confidential flag
    const project = await projectRepo.findOne({
      where: {
        id: projectId,
        deletedAt: IsNull(),
      },
    });

    if (!project) {
      this.logger.warn(`Project ${projectId} not found in org ${orgId}`);
      return {
        permissions: [],
        orgRole: orgRole.name,
        isOrgAdmin: false,
      };
    }

    // Check for ProjectMember record
    const projectMember = await projectMemberRepo.findOne({
      where: {
        user: { id: userId },
        project: { id: projectId },
        organizationId: orgId,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['projectRole'],
    });

    // Case A: User has explicit project membership
    if (projectMember) {
      // Use project role if assigned, otherwise fall back to org role
      if (projectMember.projectRole) {
        const projectRolePermissions = await this.getRolePermissions(
          projectMember.projectRole.id,
        );
        return {
          permissions: projectRolePermissions,
          orgRole: orgRole.name,
          projectRole: projectMember.projectRole.name,
          isOrgAdmin: false,
        };
      }

      // No specific project role, use org role permissions
      return {
        permissions: orgRolePermissions,
        orgRole: orgRole.name,
        isOrgAdmin: false,
      };
    }

    // Case B: No explicit membership - check PMO/view_all access
    const hasViewAll = orgRolePermissions.includes(PERMISSIONS.PROJECT_VIEW_ALL);

    if (hasViewAll) {
      // Check confidential flag
      if (project.isConfidential) {
        // Confidential projects require explicit membership even for PMO
        this.logger.debug(
          `User ${userId} blocked from confidential project ${projectId} (no membership)`,
        );
        return {
          permissions: [],
          orgRole: orgRole.name,
          isOrgAdmin: false,
        };
      }

      // Non-confidential project, PMO gets org role permissions
      return {
        permissions: orgRolePermissions,
        orgRole: orgRole.name,
        isOrgAdmin: false,
      };
    }

    // Case C: No membership and no view_all permission
    return {
      permissions: [],
      orgRole: orgRole.name,
      isOrgAdmin: false,
    };
  }

  /**
   * Get all permission keys for a role from the junction table
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    const rolePermissions = await this.rolePermissionRepo.find({
      where: { orgRoleId: roleId },
      select: ['permissionKey'],
    });

    return rolePermissions.map((rp) => rp.permissionKey);
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    userId: string,
    orgId: string,
    permission: string,
    projectId?: string,
  ): Promise<boolean> {
    const resolved = await this.resolvePermissions(userId, orgId, projectId);
    return resolved.permissions.includes(permission);
  }

  /**
   * Check if a user has ANY of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    orgId: string,
    permissions: string[],
    projectId?: string,
  ): Promise<boolean> {
    const resolved = await this.resolvePermissions(userId, orgId, projectId);
    return permissions.some((p) => resolved.permissions.includes(p));
  }

  /**
   * Check if a user has ALL of the specified permissions
   */
  async hasAllPermissions(
    userId: string,
    orgId: string,
    permissions: string[],
    projectId?: string,
  ): Promise<boolean> {
    const resolved = await this.resolvePermissions(userId, orgId, projectId);
    return permissions.every((p) => resolved.permissions.includes(p));
  }

  /**
   * Get user's org role name
   */
  async getOrgRole(userId: string, orgId: string): Promise<string | null> {
    const orgUser = await this.orgUserRepo.findOne({
      where: {
        userId,
        organizationId: orgId,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['orgRole'],
    });

    return orgUser?.orgRole?.name || null;
  }

  /**
   * Get user's project role name
   */
  async getProjectRole(
    userId: string,
    orgId: string,
    projectId: string,
  ): Promise<string | null> {
    const projectMemberRepo = await this.tenantService.getRepository(ProjectMember);
    const projectMember = await projectMemberRepo.findOne({
      where: {
        user: { id: userId },
        project: { id: projectId },
        organizationId: orgId,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['projectRole'],
    });

    return projectMember?.projectRole?.name || null;
  }

  /**
   * Check if user is ORG_ADMIN
   */
  async isOrgAdmin(userId: string, orgId: string): Promise<boolean> {
    const orgRole = await this.getOrgRole(userId, orgId);
    return orgRole === SystemRoleName.ORG_ADMIN;
  }

  /**
   * Get all projects user has access to
   */
  async getAccessibleProjectIds(userId: string, orgId: string): Promise<string[]> {
    const resolved = await this.resolvePermissions(userId, orgId);

    const [projectRepo, projectMemberRepo] = await Promise.all([
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(ProjectMember),
    ]);

    // ORG_ADMIN or PMO (project:view_all) can see all non-confidential projects
    if (resolved.isOrgAdmin || resolved.permissions.includes(PERMISSIONS.PROJECT_VIEW_ALL)) {
      const projects = await projectRepo.find({
        where: {
          deletedAt: IsNull(),
          ...(resolved.isOrgAdmin ? {} : { isConfidential: false }),
        },
        select: ['id'],
      });

      const projectIds = projects.map((p) => p.id);

      // For PMO, also add any confidential projects they're explicitly assigned to
      if (!resolved.isOrgAdmin) {
        const explicitMemberships = await projectMemberRepo.find({
          where: {
            user: { id: userId },
            organizationId: orgId,
            isActive: true,
            deletedAt: IsNull(),
          },
          relations: ['project'],
        });

        const memberProjectIds = explicitMemberships
          .filter((pm) => pm.project && pm.project.isConfidential)
          .map((pm) => pm.project.id);

        return [...new Set([...projectIds, ...memberProjectIds])];
      }

      return projectIds;
    }

    // Regular users can only see projects they're assigned to
    const memberships = await projectMemberRepo.find({
      where: {
        user: { id: userId },
        organizationId: orgId,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['project'],
    });

    return memberships
      .filter((pm) => pm.project)
      .map((pm) => pm.project.id);
  }
}
