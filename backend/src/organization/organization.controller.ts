import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { OrganizationService } from './organization.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  /**
   * Create a new organization
   * POST /organizations
   */
  @Post()
  async create(@Body() dto: CreateOrganizationDto, @Request() req: any) {
    const org = await this.orgService.create(dto, req.user.id);
    return {
      message: 'Organization created successfully',
      organization: org,
    };
  }

  /**
   * Get current user's organizations
   * GET /organizations
   */
  @Get()
  async getMyOrganizations(@Request() req: any) {
    const organizations = await this.orgService.getUserOrganizations(req.user.id);
    return { organizations };
  }

  /**
   * Get organization by ID
   * GET /organizations/:id
   */
  @Get(':id')
  async getById(@Param('id') id: string, @Request() req: any) {
    // Check membership
    const isMember = await this.orgService.isMember(req.user.id, id);
    if (!isMember) {
      return { error: 'You are not a member of this organization' };
    }

    const organization = await this.orgService.findById(id);
    return { organization };
  }

  /**
   * Get organization by slug
   * GET /organizations/slug/:slug
   */
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const organization = await this.orgService.findBySlug(slug);
    return { organization };
  }

  /**
   * Update organization
   * PUT /organizations/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @Request() req: any,
  ) {
    const organization = await this.orgService.update(id, dto, req.user.id);
    return {
      message: 'Organization updated successfully',
      organization,
    };
  }

  /**
   * Delete organization (soft delete)
   * DELETE /organizations/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.orgService.delete(id, req.user.id);
  }

  // ==================== Member Management ====================

  /**
   * Get organization members
   * GET /organizations/:id/members
   */
  @Get(':id/members')
  async getMembers(@Param('id') id: string, @Request() req: any) {
    const isMember = await this.orgService.isMember(req.user.id, id);
    if (!isMember) {
      return { error: 'You are not a member of this organization' };
    }

    const members = await this.orgService.getMembers(id);
    return {
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: m.user
          ? {
              id: m.user.id,
              username: m.user.username,
              email: m.user.email,
              name: m.user.name,
            }
          : null,
        role: m.orgRole
          ? {
              id: m.orgRole.id,
              name: m.orgRole.name,
              isSystem: m.orgRole.isSystem,
            }
          : null,
        isActive: m.isActive,
        joinedAt: m.createdAt,
      })),
    };
  }

  /**
   * Invite a member to the organization
   * POST /organizations/:id/members/invite
   */
  @Post(':id/members/invite')
  async inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @Request() req: any,
  ) {
    const invitation = await this.orgService.inviteMember(id, dto, req.user.id);
    return {
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  /**
   * Accept an organization invitation
   * POST /organizations/invitations/:token/accept
   */
  @Post('invitations/:token/accept')
  async acceptInvitation(@Param('token') token: string, @Request() req: any) {
    const membership = await this.orgService.acceptInvitation(token, req.user.id);
    return {
      message: 'Invitation accepted successfully',
      membership: {
        id: membership.id,
        organizationId: membership.organizationId,
      },
    };
  }

  /**
   * Update a member's role
   * PUT /organizations/:id/members/:memberId/role
   */
  @Put(':id/members/:memberId/role')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Request() req: any,
  ) {
    const membership = await this.orgService.updateMemberRole(id, memberId, dto, req.user.id);
    return {
      message: 'Member role updated successfully',
      membership: {
        id: membership.id,
        orgRoleId: membership.orgRoleId,
      },
    };
  }

  /**
   * Remove a member from the organization
   * DELETE /organizations/:id/members/:memberId
   */
  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ) {
    await this.orgService.removeMember(id, memberId, req.user.id);
  }

  // ==================== Roles ====================

  /**
   * Get invitation details by token (for accept invitation page)
   * GET /organizations/invitations/:token
   * Public — no auth required so unauthenticated users can preview invite details
   */
  @Public()
  @Get('invitations/:token')
  async getInvitationByToken(@Param('token') token: string) {
    const details = await this.orgService.getInvitationByToken(token);
    return { invitation: details };
  }

  /**
   * Get pending invitations for the organization
   * GET /organizations/:id/invitations
   */
  @Get(':id/invitations')
  async getPendingInvitations(@Param('id') id: string, @Request() req: any) {
    const invitations = await this.orgService.getPendingInvitations(id, req.user.id);
    return {
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.orgRole ? { id: inv.orgRole.id, name: inv.orgRole.name } : null,
        projectName: (inv as any).project?.name || null,
        invitedBy: inv.invitedBy
          ? { name: inv.invitedBy.name || inv.invitedBy.username }
          : null,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        status: inv.status,
      })),
    };
  }

  /**
   * Revoke a pending invitation
   * DELETE /organizations/:id/invitations/:invId
   */
  @Delete(':id/invitations/:invId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvitation(
    @Param('id') id: string,
    @Param('invId') invId: string,
    @Request() req: any,
  ) {
    await this.orgService.revokeInvitation(id, invId, req.user.id);
  }

  /**
   * Get available roles for the organization (with permissions)
   * GET /organizations/:id/roles
   */
  @Get(':id/roles')
  async getAvailableRoles(@Param('id') id: string, @Request() req: any) {
    const isMember = await this.orgService.isMember(req.user.id, id);
    if (!isMember) {
      return { error: 'You are not a member of this organization' };
    }

    const roles = await this.orgService.getAvailableRoles(id);
    return {
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        isEditable: r.isEditable,
        organizationId: r.organizationId,
        permissions: (r.rolePermissions || []).map((rp) => rp.permissionKey),
      })),
    };
  }

  /**
   * Create a custom role for the organization
   * POST /organizations/:id/roles
   */
  @Post(':id/roles')
  async createRole(
    @Param('id') id: string,
    @Body() dto: { name: string; description?: string; permissions: string[] },
    @Request() req: any,
  ) {
    const role = await this.orgService.createCustomRole(id, dto, req.user.id);
    return {
      message: 'Role created successfully',
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isEditable: role.isEditable,
        organizationId: role.organizationId,
        permissions: (role.rolePermissions || []).map((rp) => rp.permissionKey),
      },
    };
  }

  /**
   * Update a custom role
   * PATCH /organizations/:id/roles/:roleId
   */
  @Patch(':id/roles/:roleId')
  async updateRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Body() dto: { name?: string; description?: string | null; permissions?: string[] },
    @Request() req: any,
  ) {
    const role = await this.orgService.updateCustomRole(id, roleId, dto, req.user.id);
    return {
      message: 'Role updated successfully',
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isEditable: role.isEditable,
        organizationId: role.organizationId,
        permissions: (role.rolePermissions || []).map((rp) => rp.permissionKey),
      },
    };
  }

  /**
   * Delete a custom role
   * DELETE /organizations/:id/roles/:roleId
   */
  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Request() req: any,
  ) {
    await this.orgService.deleteCustomRole(id, roleId, req.user.id);
  }

  // ==================== Audit Logs ====================

  /**
   * Get paginated audit logs for an organization (ORG_ADMIN only)
   * GET /organizations/:id/audit-logs
   */
  @Get(':id/audit-logs')
  async getAuditLogs(
    @Param('id') id: string,
    @Query('actorId') actorId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('projectId') projectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const result = await this.orgService.getAuditLogs(id, req.user.id, {
      actorId,
      entityType,
      action,
      projectId,
      from,
      to,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    return {
      logs: result.logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actorId: log.actorId,
        actorRole: log.actorRole,
        actorName: log.actor ? (log.actor.name || log.actor.username) : null,
        actorEmail: log.actor?.email || null,
        projectId: log.projectId,
        projectName: log.project?.name || null,
        description: log.description,
        before: log.before,
        after: log.after,
        createdAt: log.createdAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }
}
