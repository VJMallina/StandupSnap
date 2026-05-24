import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TeamMemberService } from './team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { AddToProjectDto } from './dto/add-to-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@Controller('team-members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamMemberController {
  constructor(private readonly teamMemberService: TeamMemberService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_ADD)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTeamMemberDto: CreateTeamMemberDto) {
    return this.teamMemberService.create(createTeamMemberDto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_VIEW)
  findAll() {
    return this.teamMemberService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_VIEW)
  findOne(@Param('id') id: string) {
    return this.teamMemberService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_EDIT)
  update(@Param('id') id: string, @Body() updateTeamMemberDto: UpdateTeamMemberDto) {
    return this.teamMemberService.update(id, updateTeamMemberDto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.TEAM_MEMBER_REMOVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.teamMemberService.remove(id);
  }
}
