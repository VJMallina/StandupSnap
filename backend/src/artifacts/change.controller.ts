import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangeService } from './change.service';
import { CreateChangeDto } from './dto/create-change.dto';
import { UpdateChangeDto } from './dto/update-change.dto';

@Controller('changes')
@UseGuards(JwtAuthGuard)
export class ChangeController {
  constructor(private readonly changeService: ChangeService) {}

  @Post()
  create(@Body() dto: CreateChangeDto, @Request() req: any) {
    return this.changeService.create(dto, req.user.userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChangeDto, @Request() req: any) {
    return this.changeService.update(id, dto, req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.changeService.findOne(id);
  }

  @Get('project/:projectId')
  findByProject(
    @Param('projectId') projectId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const include = includeArchived === 'true';
    return this.changeService.findByProject(projectId, include);
  }

  @Put(':id/archive')
  archive(@Param('id') id: string, @Request() req: any) {
    return this.changeService.archive(id, req.user.userId);
  }

  @Get('project/:projectId/export')
  async exportCsv(@Param('projectId') projectId: string, @Res() res: Response) {
    const csv = await this.changeService.exportCsv(projectId);
    const filename = `changes-${projectId}-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
