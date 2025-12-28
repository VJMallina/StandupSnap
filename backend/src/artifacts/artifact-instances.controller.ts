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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArtifactInstancesService } from './artifact-instances.service';
import { CreateArtifactInstanceDto } from './dto/create-artifact-instance.dto';
import { UpdateArtifactInstanceDto } from './dto/update-artifact-instance.dto';
import { CreateArtifactVersionDto } from './dto/create-artifact-version.dto';

@Controller('artifact-instances')
@UseGuards(JwtAuthGuard)
export class ArtifactInstancesController {
  constructor(
    private readonly artifactInstancesService: ArtifactInstancesService,
  ) {}

  @Post()
  create(@Body() createDto: CreateArtifactInstanceDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.artifactInstancesService.create(
      createDto,
      createDto.projectId,
      userId,
    );
  }

  @Get()
  findByProject(@Query('projectId') projectId: string) {
    return this.artifactInstancesService.findByProject(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artifactInstancesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateArtifactInstanceDto) {
    return this.artifactInstancesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.artifactInstancesService.remove(id);
  }

  // Update current version data without creating new version
  @Put(':id/data')
  updateCurrentVersionData(
    @Param('id') id: string,
    @Body() body: { data: any },
  ) {
    return this.artifactInstancesService.updateCurrentVersionData(id, body.data);
  }

  // Version management
  @Post(':id/versions')
  createVersion(
    @Param('id') id: string,
    @Body() createVersionDto: CreateArtifactVersionDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.artifactInstancesService.createVersion(
      id,
      createVersionDto,
      userId,
    );
  }

  @Get(':id/versions')
  getVersions(@Param('id') id: string) {
    return this.artifactInstancesService.getVersions(id);
  }

  @Get(':id/versions/:versionId')
  getVersion(@Param('versionId') versionId: string) {
    return this.artifactInstancesService.getVersion(versionId);
  }

  @Post(':id/versions/:versionId/restore')
  restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.artifactInstancesService.restoreVersion(
      id,
      versionId,
      userId,
    );
  }
}
