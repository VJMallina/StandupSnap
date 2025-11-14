import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Permission } from '../entities/role.entity';

@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * Create a new invitation (SCRUM_MASTER only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.SEND_INVITE)
  async createInvitation(@Body() createInvitationDto: CreateInvitationDto) {
    const invitation = await this.invitationService.createInvitation(
      createInvitationDto,
    );

    // Return invitation with token for frontend to construct registration URL
    return {
      id: invitation.id,
      email: invitation.email,
      assignedRole: invitation.assignedRole,
      status: invitation.status,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      project: invitation.project
        ? {
            id: invitation.project.id,
            name: invitation.project.name,
          }
        : null,
      createdAt: invitation.createdAt,
    };
  }

  /**
   * Validate an invitation token (public endpoint)
   */
  @Public()
  @Get('validate/:token')
  async validateToken(@Param('token') token: string) {
    const invitation = await this.invitationService.validateToken(token);

    // Return relevant info for registration page
    return {
      email: invitation.email,
      assignedRole: invitation.assignedRole,
      projectName: invitation.project?.name || null,
      projectId: invitation.project?.id || null,
    };
  }

  /**
   * Get all invitations (SCRUM_MASTER only)
   * Optionally filter by projectId
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.SEND_INVITE)
  async getAllInvitations(@Query('projectId') projectId?: string) {
    const invitations = await this.invitationService.getAllInvitations(
      projectId,
    );

    // Format response
    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      assignedRole: invitation.assignedRole,
      status: invitation.status,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      project: invitation.project
        ? {
            id: invitation.project.id,
            name: invitation.project.name,
          }
        : null,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    }));
  }

  /**
   * Get invitation by ID (SCRUM_MASTER only)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.SEND_INVITE)
  async getInvitationById(@Param('id') id: string) {
    const invitation = await this.invitationService.getInvitationById(id);

    return {
      id: invitation.id,
      email: invitation.email,
      assignedRole: invitation.assignedRole,
      status: invitation.status,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      project: invitation.project
        ? {
            id: invitation.project.id,
            name: invitation.project.name,
          }
        : null,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }

  /**
   * Revoke an invitation (SCRUM_MASTER only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.SEND_INVITE)
  async revokeInvitation(@Param('id') id: string) {
    await this.invitationService.revokeInvitation(id);

    return {
      message: 'Invitation revoked successfully',
    };
  }
}
