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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FormBuilderService } from './form-builder.service';
import { CreateFormTemplateDto } from './dto/create-form-template.dto';
import { UpdateFormTemplateDto } from './dto/update-form-template.dto';
import { CreateFormInstanceDto } from './dto/create-form-instance.dto';
import { UpdateFormInstanceDto } from './dto/update-form-instance.dto';
import { UpdateFieldOrderDto } from './dto/update-field-order.dto';
import { TemplateStatus, TemplateCategory, FormField } from '../../entities/form-template.entity';
import { InstanceStatus } from '../../entities/form-instance.entity';

@Controller('artifacts/form-builder')
@UseGuards(JwtAuthGuard)
export class FormBuilderController {
  constructor(private readonly formBuilderService: FormBuilderService) {}

  // ========== TEMPLATE ENDPOINTS ==========

  @Post('templates')
  async createTemplate(@Body() dto: CreateFormTemplateDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.createTemplate(dto, userId);
  }

  @Get('templates/project/:projectId')
  async findTemplatesByProject(
    @Param('projectId') projectId: string,
    @Query('status') status?: TemplateStatus,
    @Query('category') category?: TemplateCategory,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
  ) {
    return this.formBuilderService.findTemplatesByProject(projectId, {
      status,
      category,
      includeArchived: includeArchived === 'true',
      search,
    });
  }

  @Get('templates/:id')
  async findTemplateById(@Param('id') id: string) {
    return this.formBuilderService.findTemplateById(id);
  }

  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateFormTemplateDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.updateTemplate(id, dto, userId);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id') id: string) {
    await this.formBuilderService.deleteTemplate(id);
  }

  @Patch('templates/:id/archive')
  async archiveTemplate(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.archiveTemplate(id, userId);
  }

  @Patch('templates/:id/restore')
  async restoreTemplate(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.restoreTemplate(id, userId);
  }

  @Patch('templates/:id/publish')
  async publishTemplate(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.publishTemplate(id, userId);
  }

  @Post('templates/:id/duplicate')
  async duplicateTemplate(
    @Param('id') id: string,
    @Body('name') newName: string,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.duplicateTemplate(id, userId, newName);
  }

  @Get('templates/:id/export')
  async exportTemplate(@Param('id') id: string) {
    const template = await this.formBuilderService.findTemplateById(id);
    return {
      ...template,
      exportedAt: new Date().toISOString(),
    };
  }

  // ========== FIELD MANAGEMENT ENDPOINTS ==========

  @Post('templates/:id/fields')
  async addField(@Param('id') id: string, @Body() field: FormField, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.addField(id, field, userId);
  }

  @Put('templates/:templateId/fields/:fieldId')
  async updateField(
    @Param('templateId') templateId: string,
    @Param('fieldId') fieldId: string,
    @Body() updatedField: Partial<FormField>,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.updateField(templateId, fieldId, updatedField, userId);
  }

  @Delete('templates/:templateId/fields/:fieldId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteField(
    @Param('templateId') templateId: string,
    @Param('fieldId') fieldId: string,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    await this.formBuilderService.deleteField(templateId, fieldId, userId);
  }

  @Patch('templates/:id/fields/reorder')
  async reorderFields(
    @Param('id') id: string,
    @Body() dto: UpdateFieldOrderDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.reorderFields(id, dto, userId);
  }

  // ========== INSTANCE ENDPOINTS ==========

  @Post('instances')
  async createInstance(@Body() dto: CreateFormInstanceDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.createInstance(dto, userId);
  }

  @Get('instances/project/:projectId')
  async findInstancesByProject(
    @Param('projectId') projectId: string,
    @Query('templateId') templateId?: string,
    @Query('status') status?: InstanceStatus,
    @Query('includeArchived') includeArchived?: string,
    @Query('search') search?: string,
  ) {
    return this.formBuilderService.findInstancesByProject(projectId, {
      templateId,
      status,
      includeArchived: includeArchived === 'true',
      search,
    });
  }

  @Get('instances/template/:templateId')
  async findInstancesByTemplate(@Param('templateId') templateId: string) {
    return this.formBuilderService.findInstancesByTemplate(templateId);
  }

  @Get('instances/:id')
  async findInstanceById(@Param('id') id: string) {
    return this.formBuilderService.findInstanceById(id);
  }

  @Put('instances/:id')
  async updateInstance(
    @Param('id') id: string,
    @Body() dto: UpdateFormInstanceDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.updateInstance(id, dto, userId);
  }

  @Patch('instances/:id/submit')
  async submitInstance(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.submitInstance(id, userId);
  }

  @Patch('instances/:id/approve')
  async approveInstance(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.approveInstance(id, userId, notes);
  }

  @Patch('instances/:id/reject')
  async rejectInstance(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.rejectInstance(id, userId, notes);
  }

  @Delete('instances/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInstance(@Param('id') id: string) {
    await this.formBuilderService.deleteInstance(id);
  }

  @Patch('instances/:id/archive')
  async archiveInstance(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.archiveInstance(id, userId);
  }

  @Patch('instances/:id/restore')
  async restoreInstance(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.restoreInstance(id, userId);
  }

  @Post('instances/:id/duplicate')
  async duplicateInstance(
    @Param('id') id: string,
    @Body('name') newName: string,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.formBuilderService.duplicateInstance(id, userId, newName);
  }

  @Get('instances/:id/export')
  async exportInstance(@Param('id') id: string, @Query('format') format: 'json' | 'pdf' | 'word') {
    const instance = await this.formBuilderService.findInstanceById(id);

    if (format === 'json') {
      return {
        ...instance,
        exportedAt: new Date().toISOString(),
      };
    }

    // PDF and Word exports will be implemented in Phase 2
    return {
      message: 'PDF and Word exports will be available in the next phase',
      format,
      instanceId: id,
    };
  }
}
