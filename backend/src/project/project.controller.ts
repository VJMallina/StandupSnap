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
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../entities/role.entity';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @RequirePermissions(Permission.CREATE_PROJECT)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto);
  }

  @Get()
  @RequirePermissions(Permission.VIEW_PROJECT)
  findAll(@Query('isActive') isActive?: string) {
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.projectService.findAll(isActiveBool);
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
}
