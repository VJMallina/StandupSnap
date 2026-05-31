import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CanvasReport } from '../entities/canvas-report.entity';
import { CreateCanvasReportDto } from './dto/create-canvas-report.dto';
import { UpdateCanvasReportDto } from './dto/update-canvas-report.dto';
import { GenerateTemplateDto } from './dto/generate-template.dto';
import { TemplateGeneratorService } from './template-generator.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CanvasReportService {
  constructor(
    @InjectRepository(CanvasReport)
    private readonly repo: Repository<CanvasReport>,
    private readonly templateGenerator: TemplateGeneratorService,
  ) {}

  async create(
    dto: CreateCanvasReportDto,
    userId: string,
    orgId: string,
  ): Promise<CanvasReport> {
    const report = this.repo.create({
      ...dto,
      organizationId: orgId,
      createdById: userId,
      slides: dto.slides ?? [],
      reportType: dto.reportType ?? 'custom',
    });
    return this.repo.save(report);
  }

  async findAll(
    projectId: string,
    orgId: string,
  ): Promise<CanvasReport[]> {
    return this.repo.find({
      where: { projectId, organizationId: orgId },
      order: { updatedAt: 'DESC' },
      select: ['id', 'name', 'description', 'reportType', 'createdById', 'createdAt', 'updatedAt'],
    });
  }

  async findOne(id: string, orgId: string): Promise<CanvasReport> {
    const report = await this.repo.findOne({
      where: { id, organizationId: orgId },
    });
    if (!report) throw new NotFoundException('Canvas report not found');
    return report;
  }

  async update(
    id: string,
    dto: UpdateCanvasReportDto,
    orgId: string,
  ): Promise<CanvasReport> {
    const report = await this.findOne(id, orgId);
    Object.assign(report, dto);
    return this.repo.save(report);
  }

  async remove(id: string, orgId: string, userId: string): Promise<void> {
    const report = await this.findOne(id, orgId);
    if (report.createdById !== userId) {
      throw new ForbiddenException('Only the report creator can delete it');
    }
    await this.repo.softDelete(id);
  }

  async duplicate(
    id: string,
    orgId: string,
    userId: string,
  ): Promise<CanvasReport> {
    const original = await this.findOne(id, orgId);
    const copy = this.repo.create({
      organizationId: orgId,
      projectId: original.projectId,
      name: `${original.name} (Copy)`,
      description: original.description,
      reportType: original.reportType,
      createdById: userId,
      slides: original.slides.map((s) => ({ ...s, id: uuidv4() })),
    });
    return this.repo.save(copy);
  }

  async generateFromTemplate(
    dto: GenerateTemplateDto,
    userId: string,
    orgId: string,
  ): Promise<CanvasReport> {
    const reportType = dto.reportType ?? 'custom';
    const name = dto.name ?? this.defaultReportName(reportType);

    const slides = await this.templateGenerator.generate(
      dto.projectId,
      orgId,
      reportType,
      dto.startDate,
      dto.endDate,
    );

    const report = this.repo.create({
      organizationId: orgId,
      projectId: dto.projectId,
      name,
      reportType,
      slides,
      createdById: userId,
    });

    return this.repo.save(report);
  }

  private defaultReportName(type: string): string {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();
    const typeMap: Record<string, string> = {
      weekly: `Weekly Report – ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      biweekly: `Bi-Weekly Report – ${month} ${year}`,
      monthly: `Monthly Report – ${month} ${year}`,
      custom: `Status Report – ${month} ${year}`,
    };
    return typeMap[type] ?? `Status Report – ${month} ${year}`;
  }
}
