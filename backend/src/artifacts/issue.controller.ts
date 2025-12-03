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
import { IssueService } from './issue.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssueStatus, IssueSeverity } from '../entities/issue.entity';

@Controller('artifacts/issues')
@UseGuards(JwtAuthGuard)
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @Post()
  async create(@Body() dto: CreateIssueDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.issueService.create(dto, userId);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('status') status?: IssueStatus,
    @Query('severity') severity?: IssueSeverity,
    @Query('ownerId') ownerId?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
  ) {
    return this.issueService.findByProject(projectId, {
      status,
      severity,
      ownerId,
      includeArchived: includeArchived === 'true',
      search,
    });
  }

  @Get('project/:projectId/export')
  async exportIssues(
    @Param('projectId') projectId: string,
    @Query('format') format: 'csv' | 'excel' | 'pdf',
    @Query('status') status?: IssueStatus,
    @Query('severity') severity?: IssueSeverity,
    @Query('ownerId') ownerId?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
    @Res() res?: Response,
  ) {
    const issues = await this.issueService.findByProject(projectId, {
      status,
      severity,
      ownerId,
      includeArchived: includeArchived === 'true',
      search,
    });

    if (format === 'csv') {
      const csv = await this.issueService.exportToCSV(issues);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="issues-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    if (format === 'excel' || format === 'pdf') {
      return res.status(HttpStatus.NOT_IMPLEMENTED).json({
        message: 'Excel and PDF export formats are not yet implemented. Please use CSV format.',
        format,
        issueCount: issues.length,
      });
    }

    return issues;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.issueService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateIssueDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.issueService.update(id, dto, userId);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.issueService.archive(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.issueService.delete(id);
    return { message: 'Issue deleted successfully' };
  }
}
