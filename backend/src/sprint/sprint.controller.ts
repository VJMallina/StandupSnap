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
  Request,
} from '@nestjs/common';
import { SprintService } from './sprint.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { GenerateSprintsDto, PreviewSprintsDto } from './dto/generate-sprints.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { SprintStatus } from '../entities/sprint.entity';

@Controller('sprints')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.SPRINT_CREATE)
  create(@Request() req, @Body() createSprintDto: CreateSprintDto) {
    return this.sprintService.create(createSprintDto, req.user.organizationId);
  }

  @Post('preview')
  @RequirePermissions(PERMISSIONS.SPRINT_VIEW)
  previewSprints(@Body() previewDto: PreviewSprintsDto) {
    return this.sprintService.previewSprints(previewDto);
  }

  @Post('generate')
  @RequirePermissions(PERMISSIONS.SPRINT_CREATE)
  generateSprints(@Request() req, @Body() generateSprintsDto: GenerateSprintsDto) {
    return this.sprintService.generateSprints(generateSprintsDto, req.user.organizationId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SPRINT_VIEW)
  findAll(
    @Request() req,
    @Query('projectId') projectId: string,
    @Query('status') status?: SprintStatus,
    @Query('search') search?: string,
  ) {
    return this.sprintService.findAll(projectId, status, search, req.user.organizationId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SPRINT_VIEW)
  findOne(@Param('id') id: string, @Request() req) {
    return this.sprintService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SPRINT_EDIT)
  update(@Param('id') id: string, @Body() updateSprintDto: UpdateSprintDto, @Request() req) {
    return this.sprintService.update(id, updateSprintDto, req.user.organizationId);
  }

  @Post(':id/close')
  @RequirePermissions(PERMISSIONS.SPRINT_CLOSE)
  closeSprint(@Param('id') id: string, @Request() req) {
    return this.sprintService.closeSprint(id, req.user.organizationId);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SPRINT_DELETE)
  remove(@Param('id') id: string, @Request() req) {
    return this.sprintService.remove(id, req.user.organizationId);
  }
}
