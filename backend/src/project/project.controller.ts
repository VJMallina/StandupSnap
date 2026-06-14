import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { TeamMemberService } from '../team-member/team-member.service';
import { AddToProjectDto } from '../team-member/dto/add-to-project.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly teamMemberService: TeamMemberService,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECT_CREATE)
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto, req.user.id, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  findAll(
    @Request() req,
    @Query('isActive') isActive?: string,
    @Query('isArchived') isArchived?: string,
  ) {
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const isArchivedBool = isArchived === 'true' ? true : isArchived === 'false' ? false : undefined;
    return this.projectService.findAll(req.user.organizationId, isActiveBool, isArchivedBool);
  }

  @Get('admin/orphaned')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  findOrphaned() {
    return this.projectService.findOrphanedProjects();
  }

  @Post('admin/reassign-owner')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  reassignOwner(@Body() body: { fromUserId?: string; toUserId: string }) {
    return this.projectService.reassignOwner(body);
  }

  @Get('check-name')
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  async checkNameUniqueness(
    @Request() req,
    @Query('name') name: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const isUnique = await this.projectService.isNameUnique(name, req.user.organizationId, excludeId);
    return { isUnique };
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  findOne(@Request() req, @Param('id') id: string) {
    return this.projectService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Patch(':id/archive')
  @RequirePermissions(PERMISSIONS.PROJECT_ARCHIVE)
  archive(@Param('id') id: string) {
    return this.projectService.archive(id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PROJECT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.projectService.remove(id);
  }

  @Get(':id/members')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_VIEW)
  getMembers(@Param('id') id: string) {
    return this.projectService.getMembers(id);
  }

  @Post(':id/members')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_ADD)
  @HttpCode(HttpStatus.CREATED)
  addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.projectService.addMember(id, addMemberDto);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_REMOVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    await this.projectService.removeMember(id, memberId);
  }

  // Team Member endpoints
  @Get(':id/team')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_VIEW)
  getProjectTeam(@Param('id') id: string) {
    return this.teamMemberService.getProjectTeam(id);
  }

  @Get(':id/available-team')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_VIEW)
  getAvailableTeamMembers(@Param('id') id: string) {
    return this.teamMemberService.getAvailableTeamMembers(id);
  }

  @Post(':id/team')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_ADD)
  @HttpCode(HttpStatus.CREATED)
  addToTeam(@Param('id') id: string, @Body() addToProjectDto: AddToProjectDto) {
    return this.teamMemberService.addToProject(id, addToProjectDto);
  }

  @Patch(':id/team/:memberId')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_EDIT)
  updateTeamMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: { designationRole: string },
  ) {
    return this.teamMemberService.updateTeamMemberRole(id, memberId, body.designationRole);
  }

  @Delete(':id/team/:teamMemberId')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_REMOVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromTeam(@Param('id') id: string, @Param('teamMemberId') teamMemberId: string) {
    await this.teamMemberService.removeFromProject(id, teamMemberId);
  }
}
