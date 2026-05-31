import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CanvasReportService } from './canvas-report.service';
import { CreateCanvasReportDto } from './dto/create-canvas-report.dto';
import { UpdateCanvasReportDto } from './dto/update-canvas-report.dto';
import { GenerateTemplateDto } from './dto/generate-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { User } from '../entities/user.entity';

@Controller('canvas-reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CanvasReportController {
  constructor(private readonly service: CanvasReportService) {}

  /**
   * List all canvas reports for a project
   * GET /api/canvas-reports?projectId=
   */
  @Get()
  @RequirePermissions(PERMISSIONS.REPORT_VIEW)
  findAll(
    @Query('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(projectId, (user as any).organizationId);
  }

  /**
   * Create a new canvas report
   * POST /api/canvas-reports
   */
  @Post()
  @RequirePermissions(PERMISSIONS.REPORT_CREATE)
  create(
    @Body() dto: CreateCanvasReportDto,
    @CurrentUser() user: User,
  ) {
    return this.service.create(dto, user.id, (user as any).organizationId);
  }

  /**
   * Generate a report from a system template with live project data
   * POST /api/canvas-reports/generate-from-template
   */
  @Post('generate-from-template')
  @RequirePermissions(PERMISSIONS.REPORT_CREATE)
  generateFromTemplate(
    @Body() dto: GenerateTemplateDto,
    @CurrentUser() user: User,
  ) {
    return this.service.generateFromTemplate(dto, user.id, (user as any).organizationId);
  }

  /**
   * Get a single canvas report with all slide data
   * GET /api/canvas-reports/:id
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.REPORT_VIEW)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, (user as any).organizationId);
  }

  /**
   * Save slides & metadata
   * PUT /api/canvas-reports/:id
   */
  @Put(':id')
  @RequirePermissions(PERMISSIONS.REPORT_EDIT)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCanvasReportDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, dto, (user as any).organizationId);
  }

  /**
   * Duplicate a report
   * POST /api/canvas-reports/:id/duplicate
   */
  @Post(':id/duplicate')
  @RequirePermissions(PERMISSIONS.REPORT_CREATE)
  duplicate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.duplicate(id, (user as any).organizationId, user.id);
  }

  /**
   * Delete a canvas report
   * DELETE /api/canvas-reports/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.REPORT_DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, (user as any).organizationId, user.id);
  }
}
