import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, Request, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { IncidentService } from './incident.service';
import { DeclareIncidentDto } from './dto/declare-incident.dto';
import { AddTimelineEntryDto } from './dto/add-timeline-entry.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import { PushToRaidDto } from './dto/push-to-raid.dto';
import { IncidentStatus } from '../entities/incident.entity';

@Controller('incidents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.INCIDENT_DECLARE)
  declare(@Request() req, @Body() dto: DeclareIncidentDto) {
    const userName = req.user.name || req.user.username;
    return this.incidentService.declare(dto, req.user.id, userName, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.INCIDENT_VIEW)
  findAll(
    @Request() req,
    @Query('projectId') projectId?: string,
    @Query('status') status?: IncidentStatus,
  ) {
    return this.incidentService.findAll(req.user.organizationId, projectId, status);
  }

  @Get('active-count')
  @RequirePermissions(PERMISSIONS.INCIDENT_VIEW)
  getActiveCount(@Request() req) {
    return this.incidentService.getActiveCount(req.user.organizationId).then(count => ({ count }));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INCIDENT_VIEW)
  findOne(@Request() req, @Param('id') id: string) {
    return this.incidentService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.INCIDENT_MANAGE)
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateIncidentDto) {
    return this.incidentService.update(id, dto, req.user.organizationId);
  }

  @Post(':id/timeline')
  @RequirePermissions(PERMISSIONS.INCIDENT_VIEW)
  addTimeline(@Request() req, @Param('id') id: string, @Body() dto: AddTimelineEntryDto) {
    const userName = req.user.name || req.user.username;
    return this.incidentService.addTimelineEntry(id, dto, req.user.id, userName, req.user.organizationId);
  }

  @Post(':id/roles')
  @RequirePermissions(PERMISSIONS.INCIDENT_MANAGE)
  assignRole(@Request() req, @Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.incidentService.assignRole(id, dto, req.user.id, req.user.organizationId);
  }

  @Patch(':id/runbook/:stepId')
  @RequirePermissions(PERMISSIONS.INCIDENT_MANAGE)
  completeStep(
    @Request() req,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() body: { isCompleted: boolean },
  ) {
    const userName = req.user.name || req.user.username;
    return this.incidentService.completeRunbookStep(id, stepId, body.isCompleted, req.user.id, userName, req.user.organizationId);
  }

  @Post(':id/resolve')
  @RequirePermissions(PERMISSIONS.INCIDENT_RESOLVE)
  resolve(@Request() req, @Param('id') id: string, @Body() dto: ResolveIncidentDto) {
    const userName = req.user.name || req.user.username;
    return this.incidentService.resolve(id, dto, req.user.id, userName, req.user.organizationId);
  }

  @Post(':id/push-to-raid')
  @RequirePermissions(PERMISSIONS.INCIDENT_MANAGE)
  pushToRaid(@Request() req, @Param('id') id: string, @Body() dto: PushToRaidDto) {
    return this.incidentService.pushToRaid(id, dto, req.user.id, req.user.organizationId);
  }
}
