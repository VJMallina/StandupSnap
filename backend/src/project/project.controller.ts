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
import { Permission } from '../entities/role.entity';
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
  @RequirePermissions(Permission.CREATE_PROJECT)
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    const userId = req.user.userId;
    return this.projectService.create(createProjectDto, userId);
  }

  @Get()
  @RequirePermissions(Permission.VIEW_PROJECT)
  findAll(
    @Query('isActive') isActive?: string,
    @Query('isArchived') isArchived?: string,
  ) {
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const isArchivedBool = isArchived === 'true' ? true : isArchived === 'false' ? false : undefined;
    return this.projectService.findAll(isActiveBool, isArchivedBool);
  }

  @Get('check-name')
  @RequirePermissions(Permission.VIEW_PROJECT)
  async checkNameUniqueness(
    @Query('name') name: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const isUnique = await this.projectService.isNameUnique(name, excludeId);
    return { isUnique };
  }

  @Get(':id')
  @RequirePermissions(Permission.VIEW_PROJECT)
  findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.EDIT_PROJECT)
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Patch(':id/archive')
  @RequirePermissions(Permission.EDIT_PROJECT)
  archive(@Param('id') id: string) {
    return this.projectService.archive(id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DELETE_PROJECT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.projectService.remove(id);
  }

  @Get(':id/members')
  @RequirePermissions(Permission.VIEW_TEAM_MEMBER)
  getMembers(@Param('id') id: string) {
    return this.projectService.getMembers(id);
  }

  @Post(':id/members')
  @RequirePermissions(Permission.ADD_TEAM_MEMBER)
  @HttpCode(HttpStatus.CREATED)
  addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.projectService.addMember(id, addMemberDto);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions(Permission.REMOVE_TEAM_MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    await this.projectService.removeMember(id, memberId);
  }

  // Team Member endpoints
  @Get(':id/team')
  @RequirePermissions(Permission.VIEW_TEAM_MEMBER)
  getProjectTeam(@Param('id') id: string) {
    return this.teamMemberService.getProjectTeam(id);
  }

  @Get(':id/available-team')
  @RequirePermissions(Permission.VIEW_TEAM_MEMBER)
  getAvailableTeamMembers(@Param('id') id: string) {
    return this.teamMemberService.getAvailableTeamMembers(id);
  }

  @Post(':id/team')
  @RequirePermissions(Permission.ADD_TEAM_MEMBER)
  @HttpCode(HttpStatus.CREATED)
  addToTeam(@Param('id') id: string, @Body() addToProjectDto: AddToProjectDto) {
    return this.teamMemberService.addToProject(id, addToProjectDto);
  }

  @Delete(':id/team/:teamMemberId')
  @RequirePermissions(Permission.REMOVE_TEAM_MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromTeam(@Param('id') id: string, @Param('teamMemberId') teamMemberId: string) {
    await this.teamMemberService.removeFromProject(id, teamMemberId);
  }
}
