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
import { StakeholderService } from './stakeholder.service';
import { CreateStakeholderDto } from './dto/create-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';
import { PowerLevel, InterestLevel } from '../entities/stakeholder.entity';

@Controller('artifacts/stakeholders')
@UseGuards(JwtAuthGuard)
export class StakeholderController {
  constructor(private readonly stakeholderService: StakeholderService) {}

  @Post()
  async create(@Body() dto: CreateStakeholderDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.stakeholderService.create(dto, userId);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('powerLevel') powerLevel?: PowerLevel,
    @Query('interestLevel') interestLevel?: InterestLevel,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
  ) {
    return this.stakeholderService.findByProject(projectId, {
      powerLevel,
      interestLevel,
      includeArchived: includeArchived === 'true',
      search,
    });
  }

  @Get('project/:projectId/export')
  async exportStakeholders(
    @Param('projectId') projectId: string,
    @Query('format') format: 'csv' | 'excel' | 'pdf',
    @Query('powerLevel') powerLevel?: PowerLevel,
    @Query('interestLevel') interestLevel?: InterestLevel,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
    @Res() res?: Response,
  ) {
    const stakeholders = await this.stakeholderService.findByProject(projectId, {
      powerLevel,
      interestLevel,
      includeArchived: includeArchived === 'true',
      search,
    });

    if (format === 'csv') {
      const csv = await this.stakeholderService.exportToCSV(stakeholders);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="stakeholders-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    if (format === 'excel' || format === 'pdf') {
      return res.status(HttpStatus.NOT_IMPLEMENTED).json({
        message: 'Excel and PDF export formats are not yet implemented. Please use CSV format.',
        format,
        stakeholderCount: stakeholders.length,
      });
    }

    return stakeholders;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.stakeholderService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStakeholderDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.stakeholderService.update(id, dto, userId);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.stakeholderService.archive(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.stakeholderService.delete(id);
    return { message: 'Stakeholder deleted successfully' };
  }
}
