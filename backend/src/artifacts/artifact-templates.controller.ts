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
import { ArtifactTemplatesService } from './artifact-templates.service';
import { CreateArtifactTemplateDto } from './dto/create-artifact-template.dto';
import { UpdateArtifactTemplateDto } from './dto/update-artifact-template.dto';

@Controller('artifact-templates')
@UseGuards(JwtAuthGuard)
export class ArtifactTemplatesController {
  constructor(
    private readonly artifactTemplatesService: ArtifactTemplatesService,
  ) {}

  @Post()
  create(@Body() createDto: CreateArtifactTemplateDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.artifactTemplatesService.create(
      createDto,
      createDto.projectId,
      userId,
    );
  }

  @Get('system')
  findSystemTemplates() {
    return this.artifactTemplatesService.findSystemTemplates();
  }

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.artifactTemplatesService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artifactTemplatesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateArtifactTemplateDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.artifactTemplatesService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.artifactTemplatesService.remove(id, userId);
  }
}
