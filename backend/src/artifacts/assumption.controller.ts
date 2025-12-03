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
import { AssumptionService } from './assumption.service';
import { CreateAssumptionDto } from './dto/create-assumption.dto';
import { UpdateAssumptionDto } from './dto/update-assumption.dto';
import { AssumptionStatus } from '../entities/assumption.entity';

@Controller('artifacts/assumptions')
@UseGuards(JwtAuthGuard)
export class AssumptionController {
  constructor(private readonly assumptionService: AssumptionService) {}

  @Post()
  async create(@Body() dto: CreateAssumptionDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.assumptionService.create(dto, userId);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('status') status?: AssumptionStatus,
    @Query('ownerId') ownerId?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.assumptionService.findByProject(projectId, {
      status,
      ownerId,
      includeArchived: includeArchived === 'true',
      search,
      startDate,
      endDate,
    });
  }

  @Get('project/:projectId/export')
  async exportAssumptions(
    @Param('projectId') projectId: string,
    @Query('format') format: 'csv' | 'excel' | 'pdf',
    @Query('status') status?: AssumptionStatus,
    @Query('ownerId') ownerId?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    // Get filtered assumptions
    const assumptions = await this.assumptionService.findByProject(projectId, {
      status,
      ownerId,
      includeArchived: includeArchived === 'true',
      search,
      startDate,
      endDate,
    });

    if (format === 'csv') {
      const csv = await this.assumptionService.exportToCSV(assumptions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="assumptions-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    if (format === 'excel' || format === 'pdf') {
      return res.status(HttpStatus.NOT_IMPLEMENTED).json({
        message: 'Excel and PDF export formats are not yet implemented. Please use CSV format.',
        format,
        assumptionCount: assumptions.length,
      });
    }

    return assumptions;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.assumptionService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAssumptionDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.assumptionService.update(id, dto, userId);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.assumptionService.archive(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.assumptionService.delete(id);
    return { message: 'Assumption deleted successfully' };
  }
}
