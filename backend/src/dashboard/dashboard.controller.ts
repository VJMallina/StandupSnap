import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService, DashboardData } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../entities/role.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * M11-UC01: Get complete dashboard data
   * GET /api/dashboard?projectId=xxx (optional)
   * Returns all dashboard widgets for the selected/default project
   */
  @Get()
  @RequirePermissions(Permission.VIEW_PROJECT)
  async getDashboard(
    @Request() req,
    @Query('projectId') projectId?: string,
  ): Promise<DashboardData> {
    const userId = req.user.userId;
    return this.dashboardService.getDashboardData(userId, projectId);
  }

  /**
   * M11-UC02: Get user's assigned projects
   * GET /api/dashboard/projects
   * Returns list of projects the user has access to
   */
  @Get('projects')
  @RequirePermissions(Permission.VIEW_PROJECT)
  async getUserProjects(@Request() req) {
    const userId = req.user.userId;
    return this.dashboardService.getUserProjects(userId);
  }
}
