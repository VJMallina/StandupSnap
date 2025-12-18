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
import { ResourceService } from './resource.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { CreateResourceWorkloadDto } from './dto/resource-workload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../entities/role.entity';
import { ResourceRole } from '../entities/resource.entity';

@Controller('resources')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  /**
   * RT-UC01: Create Resource Entry
   * POST /api/resources
   */
  @Post()
  @RequirePermissions(Permission.CREATE_PROJECT) // Reusing project permission for MVP
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createResourceDto: CreateResourceDto) {
    return this.resourceService.create(createResourceDto);
  }

  /**
   * RT-UC04: View Resource Register Table
   * GET /api/resources?projectId=xxx&includeArchived=false
   */
  @Get()
  @RequirePermissions(Permission.VIEW_PROJECT)
  findAll(
    @Query('projectId') projectId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const includeArch = includeArchived === 'true';
    return this.resourceService.findAll(projectId, includeArch);
  }

  /**
   * RT-UC14: Filter Resources
   * GET /api/resources/filter?projectId=xxx&role=Developer&name=John&minLoad=80&maxLoad=100
   */
  @Get('filter')
  @RequirePermissions(Permission.VIEW_PROJECT)
  filter(
    @Query('projectId') projectId: string,
    @Query('role') role?: ResourceRole,
    @Query('name') name?: string,
    @Query('minLoad') minLoad?: string,
    @Query('maxLoad') maxLoad?: string,
    @Query('isArchived') isArchived?: string,
  ) {
    const filters: any = {};
    if (role) filters.role = role;
    if (name) filters.name = name;
    if (minLoad) filters.minLoad = parseFloat(minLoad);
    if (maxLoad) filters.maxLoad = parseFloat(maxLoad);
    if (isArchived !== undefined) filters.isArchived = isArchived === 'true';

    return this.resourceService.filter(projectId, filters);
  }

  /**
   * RT-UC16: View Resource Details
   * GET /api/resources/:id
   */
  @Get(':id')
  @RequirePermissions(Permission.VIEW_PROJECT)
  findOne(@Param('id') id: string) {
    return this.resourceService.findOne(id);
  }

  /**
   * RT-UC02: Edit Resource Details
   * PATCH /api/resources/:id
   */
  @Patch(':id')
  @RequirePermissions(Permission.EDIT_PROJECT) // Reusing project permission for MVP
  update(@Param('id') id: string, @Body() updateResourceDto: UpdateResourceDto) {
    return this.resourceService.update(id, updateResourceDto);
  }

  /**
   * RT-UC03 & RT-UC17: Archive Resource
   * PATCH /api/resources/:id/archive
   */
  @Patch(':id/archive')
  @RequirePermissions(Permission.EDIT_PROJECT)
  archive(@Param('id') id: string) {
    return this.resourceService.archive(id);
  }

  /**
   * Delete Resource (not in MVP, but useful for admin/testing)
   * DELETE /api/resources/:id
   */
  @Delete(':id')
  @RequirePermissions(Permission.DELETE_PROJECT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.resourceService.remove(id);
  }

  /**
   * RT-UC19: Manage Resource Workload (Create/Update Weekly Workload)
   * POST /api/resources/workload
   */
  @Post('workload')
  @RequirePermissions(Permission.EDIT_PROJECT)
  @HttpCode(HttpStatus.CREATED)
  createOrUpdateWorkload(@Body() createWorkloadDto: CreateResourceWorkloadDto) {
    return this.resourceService.createOrUpdateWeeklyWorkload(createWorkloadDto);
  }

  /**
   * Get Resource Workload Data (for populating the modal)
   * GET /api/resources/:id/workload
   */
  @Get(':id/workload')
  @RequirePermissions(Permission.VIEW_PROJECT)
  getResourceWorkload(@Param('id') id: string) {
    return this.resourceService.getResourceWorkload(id);
  }

  /**
   * RT-UC09/RT-UC10/RT-UC11: Get Heatmap Data
   * GET /api/resources/heatmap?projectId=xxx&startDate=2025-01-01&endDate=2025-12-31
   */
  @Get('heatmap/data')
  @RequirePermissions(Permission.VIEW_PROJECT)
  getHeatmapData(
    @Query('projectId') projectId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.resourceService.getHeatmapData(projectId, start, end);
  }

  /**
   * Get Resource Capacity Summary (Dashboard Widget)
   * GET /api/resources/summary?projectId=xxx
   */
  @Get('summary/capacity')
  @RequirePermissions(Permission.VIEW_PROJECT)
  getCapacitySummary(@Query('projectId') projectId: string) {
    return this.resourceService.getCapacitySummary(projectId);
  }
}
