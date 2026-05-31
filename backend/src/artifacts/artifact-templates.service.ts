import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ArtifactTemplate } from '../entities/artifact-template.entity';
import { CreateArtifactTemplateDto } from './dto/create-artifact-template.dto';
import { UpdateArtifactTemplateDto } from './dto/update-artifact-template.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class ArtifactTemplatesService {
  constructor(private tenantService: TenantService) {}

  async create(createDto: CreateArtifactTemplateDto, projectId: string, userId: string): Promise<ArtifactTemplate> {
    const templateRepo = await this.tenantService.getRepository(ArtifactTemplate);
    const template = templateRepo.create({ ...createDto, projectId, createdById: userId });
    return templateRepo.save(template);
  }

  async findSystemTemplates(): Promise<ArtifactTemplate[]> {
    const templateRepo = await this.tenantService.getRepository(ArtifactTemplate);
    return templateRepo.find({
      where: { isSystemTemplate: true },
      relations: ['createdBy'],
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findByProject(projectId: string): Promise<ArtifactTemplate[]> {
    const templateRepo = await this.tenantService.getRepository(ArtifactTemplate);
    return templateRepo.find({
      where: { projectId },
      relations: ['createdBy'],
      order: { category: 'ASC', createdAt: 'DESC' },
    });
  }

  async findAll(projectId?: string): Promise<ArtifactTemplate[]> {
    if (projectId) {
      const templateRepo = await this.tenantService.getRepository(ArtifactTemplate);
      return templateRepo.find({
        where: [{ isSystemTemplate: true }, { projectId }],
        relations: ['createdBy'],
        order: { category: 'ASC', name: 'ASC' },
      });
    }
    return this.findSystemTemplates();
  }

  async findOne(id: string): Promise<ArtifactTemplate> {
    const templateRepo = await this.tenantService.getRepository(ArtifactTemplate);
    const template = await templateRepo.findOne({
      where: { id },
      relations: ['createdBy', 'project'],
    });
    if (!template) throw new NotFoundException(`Artifact template with ID ${id} not found`);
    return template;
  }

  async update(id: string, updateDto: UpdateArtifactTemplateDto, userId: string): Promise<ArtifactTemplate> {
    const templateRepo = await this.tenantService.getRepository(ArtifactTemplate);
    const template = await this.findOne(id);

    if (template.isSystemTemplate) throw new ForbiddenException('Cannot update system templates');
    if (template.createdById !== userId) throw new ForbiddenException('You can only update your own templates');

    Object.assign(template, updateDto);
    return templateRepo.save(template);
  }

  async remove(id: string, userId: string): Promise<void> {
    const templateRepo = await this.tenantService.getRepository(ArtifactTemplate);
    const template = await this.findOne(id);

    if (template.isSystemTemplate) throw new ForbiddenException('Cannot delete system templates');
    if (template.createdById !== userId) throw new ForbiddenException('You can only delete your own templates');

    await templateRepo.remove(template);
  }
}
