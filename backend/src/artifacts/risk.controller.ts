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
import { RiskService } from './risk.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import {
  RiskStatus,
  RiskSeverity,
  RiskStrategy,
  RiskType,
} from '../entities/risk.entity';

@Controller('artifacts/risks')
@UseGuards(JwtAuthGuard)
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Post()
  async create(@Body() dto: CreateRiskDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.riskService.create(dto, userId);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('status') status?: RiskStatus,
    @Query('category') category?: string,
    @Query('severity') severity?: RiskSeverity,
    @Query('ownerId') ownerId?: string,
    @Query('strategy') strategy?: RiskStrategy,
    @Query('riskType') riskType?: RiskType,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
  ) {
    return this.riskService.findByProject(projectId, {
      status,
      category,
      severity,
      ownerId,
      strategy,
      riskType,
      includeArchived: includeArchived === 'true',
      search,
    });
  }

  @Get('project/:projectId/export')
  async exportRisks(
    @Param('projectId') projectId: string,
    @Query('format') format: 'csv' | 'excel' | 'pdf',
    @Query('status') status?: RiskStatus,
    @Query('category') category?: string,
    @Query('severity') severity?: RiskSeverity,
    @Query('ownerId') ownerId?: string,
    @Query('strategy') strategy?: RiskStrategy,
    @Query('riskType') riskType?: RiskType,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
    @Res() res?: Response,
  ) {
    // Get filtered risks
    const risks = await this.riskService.findByProject(projectId, {
      status,
      category,
      severity,
      ownerId,
      strategy,
      riskType,
      includeArchived: includeArchived === 'true',
      search,
    });

    if (format === 'csv') {
      const csv = await this.riskService.exportToCSV(risks);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="risks-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    if (format === 'excel' || format === 'pdf') {
      return res.status(HttpStatus.NOT_IMPLEMENTED).json({
        message: 'Excel and PDF export formats are not yet implemented. Please use CSV format.',
        format,
        riskCount: risks.length,
      });
    }

    return risks;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.riskService.findById(id);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.riskService.getHistory(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRiskDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.riskService.update(id, dto, userId);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.riskService.archive(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.riskService.delete(id);
    return { message: 'Risk deleted successfully' };
  }
}
