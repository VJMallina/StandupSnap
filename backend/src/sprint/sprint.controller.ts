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
} from '@nestjs/common';
import { SprintService } from './sprint.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { GenerateSprintsDto } from './dto/generate-sprints.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../entities/role.entity';

@Controller('sprints')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SprintController {
  constructor(private readonly sprintService: SprintService) {}

  @Post()
  @RequirePermissions(Permission.CREATE_SPRINT)
  create(@Body() createSprintDto: CreateSprintDto) {
    return this.sprintService.create(createSprintDto);
  }

  @Post('generate')
  @RequirePermissions(Permission.CREATE_SPRINT)
  generateSprints(@Body() generateSprintsDto: GenerateSprintsDto) {
    return this.sprintService.generateSprints(generateSprintsDto);
  }

  @Get()
  @RequirePermissions(Permission.VIEW_SPRINT)
  findAll(@Query('projectId') projectId?: string) {
    return this.sprintService.findAll(projectId);
  }

  @Get(':id')
  @RequirePermissions(Permission.VIEW_SPRINT)
  findOne(@Param('id') id: string) {
    return this.sprintService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.EDIT_SPRINT)
  update(@Param('id') id: string, @Body() updateSprintDto: UpdateSprintDto) {
    return this.sprintService.update(id, updateSprintDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.DELETE_SPRINT)
  remove(@Param('id') id: string) {
    return this.sprintService.remove(id);
  }
}
