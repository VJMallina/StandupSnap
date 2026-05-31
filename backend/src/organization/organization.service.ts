import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Organization, OrganizationPlan, DomainPolicy } from '../entities/organization.entity';
import { OrgUser } from '../entities/org-user.entity';
import { OrgRole, SystemRoleName } from '../entities/org-role.entity';
import { OrgInvitation, OrgInvitationStatus } from '../entities/org-invitation.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import { CreateOrganizationDto, UpdateOrganizationDto, InviteMemberDto, UpdateMemberRoleDto } from './dto';
import { MailService } from '../mail/mail.service';
import { TenantService } from '../tenant/tenant.service';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrgUser)
    private readonly orgUserRepo: Repository<OrgUser>,
    @InjectRepository(OrgRole)
    private readonly orgRoleRepo: Repository<OrgRole>,
    @InjectRepository(OrgInvitation)
    private readonly invitationRepo: Repository<OrgInvitation>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * Create a new organization
   * The creating user becomes ORG_ADMIN automatically
   */
  async create(dto: CreateOrganizationDto, creatorId: string): Promise<Organization> {
    // Check if slug is already taken
    const existing = await this.orgRepo.findOne({
      where: { slug: dto.slug, deletedAt: IsNull() },
    });

    if (existing) {
      throw new ConflictException(`Organization slug "${dto.slug}" is already taken`);
    }

    // Create organization
    const org = this.orgRepo.create({
      name: dto.name,
      slug: dto.slug,
      domain: dto.domain,
      plan: dto.plan || OrganizationPlan.FREE,
      domainPolicy: dto.domainPolicy || DomainPolicy.INVITE_ONLY,
      description: dto.description,
      logoUrl: dto.logoUrl,
      createdById: creatorId,
    });

    const savedOrg = await this.orgRepo.save(org);

    // Get ORG_ADMIN system role
    const adminRole = await this.orgRoleRepo.findOne({
      where: { name: SystemRoleName.ORG_ADMIN, isSystem: true },
    });

    if (!adminRole) {
      throw new Error('ORG_ADMIN system role not found. Run seeders first.');
    }

    // Add creator as ORG_ADMIN
    const orgUser = this.orgUserRepo.create({
      organizationId: savedOrg.id,
      userId: creatorId,
      orgRoleId: adminRole.id,
      isActive: true,
    });

    await this.orgUserRepo.save(orgUser);

    // Provision the isolated PostgreSQL schema for this org.
    // Awaited so that the org is never returned without a working schema.
    await this.tenantService.createOrgSchema(savedOrg.slug);

    this.logger.log(`Organization "${savedOrg.name}" created by user ${creatorId}`);

    return savedOrg;
  }

  /**
   * Get organization by ID
   */
  async findById(orgId: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId, deletedAt: IsNull() },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  /**
   * Get organization by slug
   */
  async findBySlug(slug: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({
      where: { slug, deletedAt: IsNull() },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  /**
   * Update organization details
   * Only ORG_ADMIN can update
   */
  async update(orgId: string, dto: UpdateOrganizationDto, userId: string): Promise<Organization> {
    await this.assertOrgAdmin(userId, orgId);

    const org = await this.findById(orgId);

    // Check slug uniqueness if changing
    if (dto.slug && dto.slug !== org.slug) {
      const existing = await this.orgRepo.findOne({
        where: { slug: dto.slug, deletedAt: IsNull() },
      });

      if (existing) {
        throw new ConflictException(`Organization slug "${dto.slug}" is already taken`);
      }
    }

    // Update fields
    Object.assign(org, dto);
    org.updatedById = userId;

    return this.orgRepo.save(org);
  }

  /**
   * Soft delete organization
   * Only ORG_ADMIN can delete
   */
  async delete(orgId: string, userId: string): Promise<void> {
    await this.assertOrgAdmin(userId, orgId);

    const org = await this.findById(orgId);

    // Soft delete
    await this.orgRepo.softDelete(orgId);

    this.logger.log(`Organization "${org.name}" deleted by user ${userId}`);
  }

  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const memberships = await this.orgUserRepo.find({
      where: {
        userId,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['organization'],
    });

    return memberships
      .filter((m) => m.organization && !m.organization.deletedAt)
      .map((m) => m.organization);
  }

  /**
   * Get all members of an organization
   */
  async getMembers(orgId: string): Promise<OrgUser[]> {
    return this.orgUserRepo.find({
      where: {
        organizationId: orgId,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['user', 'orgRole'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Invite a user to the organization
   */
  async inviteMember(orgId: string, dto: InviteMemberDto, inviterId: string): Promise<OrgInvitation> {
    await this.assertOrgAdmin(inviterId, orgId);

    const org = await this.findById(orgId);

    // Check if user is already a member
    const existingUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingUser) {
      const existingMembership = await this.orgUserRepo.findOne({
        where: {
          organizationId: orgId,
          userId: existingUser.id,
          deletedAt: IsNull(),
        },
      });

      if (existingMembership) {
        throw new ConflictException('User is already a member of this organization');
      }
    }

    // Check for pending invitation
    const pendingInvite = await this.invitationRepo.findOne({
      where: {
        organizationId: orgId,
        email: dto.email,
        status: OrgInvitationStatus.PENDING,
      },
    });

    if (pendingInvite) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    // Verify the role exists
    const role = await this.orgRoleRepo.findOne({ where: { id: dto.orgRoleId } });
    if (!role) {
      throw new BadRequestException('Invalid role specified');
    }

    // Load the inviter so we can set the relation (populates invited_by_id FK column for display)
    const inviter = await this.userRepo.findOne({ where: { id: inviterId } });

    // Create invitation — set both scalar IDs (for acceptInvitation reads) and relation
    // objects (so organization_id / org_role_id / invited_by_id FK columns are populated,
    // enabling getInvitationByToken to load org name, role name, and inviter name).
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = this.invitationRepo.create({
      organizationId: orgId,
      organization: org,
      email: dto.email,
      orgRoleId: dto.orgRoleId,
      orgRole: role,
      projectId: dto.projectId || null,
      projectRoleId: dto.projectRoleId || null,
      token,
      status: OrgInvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      invitedById: inviterId,
      ...(inviter ? { invitedBy: inviter } : {}),
    });

    const savedInvitation = await this.invitationRepo.save(invitation);

    // Send invitation email
    try {
      await this.mailService.sendOrganizationInvite(dto.email, org.name, token);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${dto.email}:`, error);
    }

    this.logger.log(`Invitation sent to ${dto.email} for org ${org.name}`);

    return savedInvitation;
  }

  /**
   * Accept an organization invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<OrgUser> {
    const invitation = await this.invitationRepo.findOne({
      where: { token, status: OrgInvitationStatus.PENDING },
      relations: ['organization'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    if (invitation.expiresAt < new Date()) {
      await this.invitationRepo.update(invitation.id, { status: OrgInvitationStatus.EXPIRED });
      throw new BadRequestException('Invitation has expired');
    }

    // Check if user email matches invitation (case-insensitive)
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    // Check if already a member
    const existingMembership = await this.orgUserRepo.findOne({
      where: {
        organizationId: invitation.organizationId,
        userId,
        deletedAt: IsNull(),
      },
    });

    if (existingMembership) {
      // Update the role to match this invitation (covers re-invitation with a different role)
      await this.orgUserRepo.update(existingMembership.id, {
        orgRoleId: invitation.orgRoleId,
        isActive: true,
      });
      await this.invitationRepo.update(invitation.id, {
        status: OrgInvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      });
      // Bump permissionsVersion so stale JWTs are invalidated
      await this.userRepo.increment({ id: userId }, 'permissionsVersion', 1);
      this.logger.log(`Invitation ${invitation.id} already-member path — role updated to ${invitation.orgRoleId}, marked ACCEPTED`);
      return this.orgUserRepo.findOne({ where: { id: existingMembership.id } });
    }

    // Check for a previously soft-deleted membership (user was removed then re-invited).
    // Restoring avoids a unique-constraint violation on [organizationId, userId].
    const softDeletedMembership = await this.orgUserRepo
      .createQueryBuilder('ou')
      .withDeleted()
      .where('ou.organizationId = :orgId', { orgId: invitation.organizationId })
      .andWhere('ou.userId = :userId', { userId })
      .andWhere('ou.deletedAt IS NOT NULL')
      .getOne();

    if (softDeletedMembership) {
      await this.orgUserRepo.restore(softDeletedMembership.id);
      await this.orgUserRepo.update(softDeletedMembership.id, {
        orgRoleId: invitation.orgRoleId,
        isActive: true,
      });
      await this.invitationRepo.update(invitation.id, {
        status: OrgInvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      });
      await this.userRepo.increment({ id: userId }, 'permissionsVersion', 1);
      this.logger.log(`Invitation ${invitation.id} restored soft-deleted membership — role set to ${invitation.orgRoleId}`);
      return this.orgUserRepo.findOne({ where: { id: softDeletedMembership.id } });
    }

    // Create membership
    const orgUser = this.orgUserRepo.create({
      organizationId: invitation.organizationId,
      userId,
      orgRoleId: invitation.orgRoleId,
      isActive: true,
    });

    const savedMembership = await this.orgUserRepo.save(orgUser);
    this.logger.log(`OrgUser created: ${savedMembership.id} for user ${userId} in org ${invitation.organizationId}`);

    // Mark invitation as accepted using an explicit UPDATE to avoid relation cascade issues
    const updateResult = await this.invitationRepo.update(invitation.id, {
      status: OrgInvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
    });
    this.logger.log(`Invitation ${invitation.id} status update affected ${updateResult.affected} row(s)`);

    // Increment user's permission version to invalidate old tokens
    await this.userRepo.increment({ id: userId }, 'permissionsVersion', 1);

    this.logger.log(`User ${userId} joined organization ${invitation.organizationId}`);

    return savedMembership;
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    orgId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    updaterId: string,
  ): Promise<OrgUser> {
    await this.assertOrgAdmin(updaterId, orgId);

    const membership = await this.orgUserRepo.findOne({
      where: {
        organizationId: orgId,
        userId: memberId,
        deletedAt: IsNull(),
      },
      relations: ['orgRole'],
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Prevent demoting the last ORG_ADMIN
    if (membership.orgRole?.name === SystemRoleName.ORG_ADMIN) {
      const adminCount = await this.orgUserRepo.count({
        where: {
          organizationId: orgId,
          orgRole: { name: SystemRoleName.ORG_ADMIN },
          isActive: true,
          deletedAt: IsNull(),
        },
      });

      const newRole = await this.orgRoleRepo.findOne({ where: { id: dto.orgRoleId } });
      if (adminCount <= 1 && newRole?.name !== SystemRoleName.ORG_ADMIN) {
        throw new BadRequestException('Cannot remove the last organization admin');
      }
    }

    // Use a direct column UPDATE instead of save() to avoid TypeORM overwriting
    // orgRoleId with the stale orgRole relation object loaded above.
    await this.orgUserRepo.update({ id: membership.id }, { orgRoleId: dto.orgRoleId });

    // Increment user's permission version
    await this.userRepo.increment({ id: memberId }, 'permissionsVersion', 1);

    return this.orgUserRepo.findOne({ where: { id: membership.id } });
  }

  /**
   * Remove a member from the organization
   */
  async removeMember(orgId: string, memberId: string, removerId: string): Promise<void> {
    await this.assertOrgAdmin(removerId, orgId);

    // Prevent self-removal if last admin
    if (memberId === removerId) {
      const adminCount = await this.orgUserRepo.count({
        where: {
          organizationId: orgId,
          orgRole: { name: SystemRoleName.ORG_ADMIN },
          isActive: true,
          deletedAt: IsNull(),
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove yourself as the last organization admin');
      }
    }

    const membership = await this.orgUserRepo.findOne({
      where: {
        organizationId: orgId,
        userId: memberId,
        deletedAt: IsNull(),
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Soft delete membership
    await this.orgUserRepo.softDelete(membership.id);

    // Increment user's permission version
    await this.userRepo.increment({ id: memberId }, 'permissionsVersion', 1);

    this.logger.log(`User ${memberId} removed from organization ${orgId} by ${removerId}`);
  }

  /**
   * Get available roles for an organization
   * Returns system roles + custom roles created for this org, with permissions
   */
  async getAvailableRoles(orgId: string): Promise<OrgRole[]> {
    return this.orgRoleRepo.find({
      where: [
        { isSystem: true },
        { organizationId: orgId, deletedAt: IsNull() },
      ],
      relations: ['rolePermissions'],
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  async createCustomRole(
    orgId: string,
    dto: { name: string; description?: string; permissions: string[] },
    userId: string,
  ): Promise<OrgRole> {
    await this.assertOrgAdmin(userId, orgId);

    const existing = await this.orgRoleRepo.findOne({
      where: { organizationId: orgId, name: dto.name, deletedAt: IsNull() },
    });
    if (existing) throw new ConflictException(`Role "${dto.name}" already exists in this organization`);

    const role = this.orgRoleRepo.create({
      organizationId: orgId,
      name: dto.name,
      description: dto.description || null,
      isSystem: false,
      isEditable: true,
      createdById: userId,
    });
    const saved = await this.orgRoleRepo.save(role);

    if (dto.permissions.length > 0) {
      const perms = dto.permissions.map((key) =>
        this.rolePermissionRepo.create({ orgRoleId: saved.id, permissionKey: key }),
      );
      await this.rolePermissionRepo.save(perms);
    }

    return this.orgRoleRepo.findOne({ where: { id: saved.id }, relations: ['rolePermissions'] });
  }

  async updateCustomRole(
    orgId: string,
    roleId: string,
    dto: { name?: string; description?: string | null; permissions?: string[] },
    userId: string,
  ): Promise<OrgRole> {
    await this.assertOrgAdmin(userId, orgId);

    const role = await this.orgRoleRepo.findOne({
      where: { id: roleId, organizationId: orgId, isSystem: false, deletedAt: IsNull() },
    });
    if (!role) throw new NotFoundException('Custom role not found');
    if (!role.isEditable) throw new ForbiddenException('This role cannot be edited');

    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    await this.orgRoleRepo.save(role);

    if (dto.permissions !== undefined) {
      await this.rolePermissionRepo.delete({ orgRoleId: roleId });
      if (dto.permissions.length > 0) {
        const perms = dto.permissions.map((key) =>
          this.rolePermissionRepo.create({ orgRoleId: roleId, permissionKey: key }),
        );
        await this.rolePermissionRepo.save(perms);
      }
      // Increment permissionsVersion for all users with this role
      const orgUsers = await this.orgUserRepo.find({ where: { orgRoleId: roleId, isActive: true } });
      for (const ou of orgUsers) {
        await this.userRepo.increment({ id: ou.userId }, 'permissionsVersion', 1);
      }
    }

    return this.orgRoleRepo.findOne({ where: { id: roleId }, relations: ['rolePermissions'] });
  }

  async deleteCustomRole(orgId: string, roleId: string, userId: string): Promise<void> {
    await this.assertOrgAdmin(userId, orgId);

    const role = await this.orgRoleRepo.findOne({
      where: { id: roleId, organizationId: orgId, isSystem: false, deletedAt: IsNull() },
    });
    if (!role) throw new NotFoundException('Custom role not found');
    if (!role.isEditable) throw new ForbiddenException('System roles cannot be deleted');

    await this.orgRoleRepo.softDelete(roleId);
    this.logger.log(`Custom role ${roleId} deleted by user ${userId}`);
  }

  /**
   * Get paginated audit logs for an organization
   */
  async getAuditLogs(
    orgId: string,
    requesterId: string,
    filters: {
      actorId?: string;
      entityType?: string;
      action?: string;
      projectId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number }> {
    await this.assertOrgAdmin(requesterId, orgId);

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const skip = (page - 1) * limit;

    const auditLogRepo = await this.tenantService.getRepository(AuditLog);
    const qb = auditLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .leftJoinAndSelect('log.project', 'project')
      .where('log.organizationId = :orgId', { orgId })
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.actorId) {
      qb.andWhere('log.actorId = :actorId', { actorId: filters.actorId });
    }
    if (filters.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
    }
    if (filters.action) {
      qb.andWhere('log.action LIKE :action', { action: `${filters.action}%` });
    }
    if (filters.projectId) {
      qb.andWhere('log.projectId = :projectId', { projectId: filters.projectId });
    }
    if (filters.from) {
      qb.andWhere('log.createdAt >= :from', { from: new Date(filters.from) });
    }
    if (filters.to) {
      qb.andWhere('log.createdAt <= :to', { to: new Date(filters.to) });
    }

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total, page, limit };
  }

  /**
   * Check if user is ORG_ADMIN of the organization
   */
  private async assertOrgAdmin(userId: string, orgId: string): Promise<void> {
    const membership = await this.orgUserRepo.findOne({
      where: {
        organizationId: orgId,
        userId,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['orgRole'],
    });

    if (!membership || membership.orgRole?.name !== SystemRoleName.ORG_ADMIN) {
      throw new ForbiddenException('Only organization admins can perform this action');
    }
  }

  /**
   * Check if user is a member of the organization
   */
  async isMember(userId: string, orgId: string): Promise<boolean> {
    const membership = await this.orgUserRepo.findOne({
      where: {
        organizationId: orgId,
        userId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    return !!membership;
  }

  /**
   * Get invitation details by token (for the accept invitation page)
   */
  async getInvitationByToken(token: string): Promise<{
    id: string;
    email: string;
    orgName: string;
    orgId: string;
    roleName: string;
    projectName: string | null;
    inviterName: string | null;
    expiresAt: Date;
    status: string;
  }> {
    const invitation = await this.invitationRepo.findOne({
      where: { token },
      relations: ['organization', 'orgRole', 'invitedBy', 'project'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or has already been used');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      orgName: invitation.organization?.name || '',
      orgId: invitation.organizationId,
      roleName: invitation.orgRole?.name || '',
      projectName: invitation.project?.name || null,
      inviterName: invitation.invitedBy?.name || invitation.invitedBy?.username || null,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    };
  }

  /**
   * Get all pending invitations for an organization
   */
  async getPendingInvitations(orgId: string, requesterId: string): Promise<OrgInvitation[]> {
    await this.assertOrgAdmin(requesterId, orgId);

    return this.invitationRepo.find({
      where: {
        organizationId: orgId,
        status: OrgInvitationStatus.PENDING,
      },
      relations: ['orgRole', 'invitedBy', 'project'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvitation(orgId: string, invId: string, revokerId: string): Promise<void> {
    await this.assertOrgAdmin(revokerId, orgId);

    const invitation = await this.invitationRepo.findOne({
      where: { id: invId, organizationId: orgId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== OrgInvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    invitation.status = OrgInvitationStatus.REVOKED;
    await this.invitationRepo.save(invitation);

    this.logger.log(`Invitation ${invId} revoked by user ${revokerId}`);
  }
}
