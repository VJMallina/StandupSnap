import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DecisionService } from './decision.service';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';
import { DecisionStatus } from '../entities/decision.entity';

@Controller('artifacts/decisions')
@UseGuards(JwtAuthGuard)
export class DecisionController {
  constructor(private readonly decisionService: DecisionService) {}

  @Post()
  async create(@Body() dto: CreateDecisionDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.decisionService.create(dto, userId);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('status') status?: DecisionStatus,
    @Query('ownerId') ownerId?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
  ) {
    return this.decisionService.findByProject(projectId, {
      status,
      ownerId,
      includeArchived: includeArchived === 'true',
      search,
    });
  }

  @Get('project/:projectId/export')
  async exportDecisions(
    @Param('projectId') projectId: string,
    @Query('format') format: 'csv' | 'excel' | 'pdf',
    @Query('status') status?: DecisionStatus,
    @Query('ownerId') ownerId?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
    @Res() res?: Response,
  ) {
    const decisions = await this.decisionService.findByProject(projectId, {
      status,
      ownerId,
      includeArchived: includeArchived === 'true',
      search,
    });

    if (format === 'csv') {
      const csv = await this.decisionService.exportToCSV(decisions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="decisions-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    if (format === 'excel' || format === 'pdf') {
      return res.status(HttpStatus.NOT_IMPLEMENTED).json({
        message: 'Excel and PDF export formats are not yet implemented. Please use CSV format.',
        format,
        decisionCount: decisions.length,
      });
    }

    return decisions;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.decisionService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDecisionDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.decisionService.update(id, dto, userId);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.decisionService.archive(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.decisionService.delete(id);
    return { message: 'Decision deleted successfully' };
  }
}
