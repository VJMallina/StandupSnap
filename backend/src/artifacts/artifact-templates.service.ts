import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArtifactTemplate } from '../entities/artifact-template.entity';
import { CreateArtifactTemplateDto } from './dto/create-artifact-template.dto';
import { UpdateArtifactTemplateDto } from './dto/update-artifact-template.dto';

@Injectable()
export class ArtifactTemplatesService {
  constructor(
    @InjectRepository(ArtifactTemplate)
    private artifactTemplatesRepository: Repository<ArtifactTemplate>,
  ) {}

  async create(
    createDto: CreateArtifactTemplateDto,
    projectId: string,
    userId: string,
  ): Promise<ArtifactTemplate> {
    const template = this.artifactTemplatesRepository.create({
      ...createDto,
      projectId,
      createdById: userId,
    });

    return this.artifactTemplatesRepository.save(template);
  }

  async findSystemTemplates(): Promise<ArtifactTemplate[]> {
    return this.artifactTemplatesRepository.find({
      where: { isSystemTemplate: true },
      relations: ['createdBy'],
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findByProject(projectId: string): Promise<ArtifactTemplate[]> {
    return this.artifactTemplatesRepository.find({
      where: { projectId },
      relations: ['createdBy'],
      order: { category: 'ASC', createdAt: 'DESC' },
    });
  }

  async findAll(projectId?: string): Promise<ArtifactTemplate[]> {
    if (projectId) {
      // Return both system templates and project templates
      return this.artifactTemplatesRepository.find({
        where: [{ isSystemTemplate: true }, { projectId }],
        relations: ['createdBy'],
        order: { category: 'ASC', name: 'ASC' },
      });
    }

    return this.findSystemTemplates();
  }

  async findOne(id: string): Promise<ArtifactTemplate> {
    const template = await this.artifactTemplatesRepository.findOne({
      where: { id },
      relations: ['createdBy', 'project'],
    });

    if (!template) {
      throw new NotFoundException(`Artifact template with ID ${id} not found`);
    }

    return template;
  }

  async update(
    id: string,
    updateDto: UpdateArtifactTemplateDto,
    userId: string,
  ): Promise<ArtifactTemplate> {
    const template = await this.findOne(id);

    // Check if user owns this template or if it's not a system template
    if (template.isSystemTemplate) {
      throw new ForbiddenException('Cannot update system templates');
    }

    if (template.createdById !== userId) {
      throw new ForbiddenException('You can only update your own templates');
    }

    Object.assign(template, updateDto);
    return this.artifactTemplatesRepository.save(template);
  }

  async remove(id: string, userId: string): Promise<void> {
    const template = await this.findOne(id);

    if (template.isSystemTemplate) {
      throw new ForbiddenException('Cannot delete system templates');
    }

    if (template.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own templates');
    }

    await this.artifactTemplatesRepository.remove(template);
  }
}
