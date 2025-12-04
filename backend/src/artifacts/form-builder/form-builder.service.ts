import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormTemplate, TemplateStatus, FormField } from '../../entities/form-template.entity';
import { FormInstance, InstanceStatus } from '../../entities/form-instance.entity';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { CreateFormTemplateDto } from './dto/create-form-template.dto';
import { UpdateFormTemplateDto } from './dto/update-form-template.dto';
import { CreateFormInstanceDto } from './dto/create-form-instance.dto';
import { UpdateFormInstanceDto } from './dto/update-form-instance.dto';
import { UpdateFieldOrderDto } from './dto/update-field-order.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FormBuilderService {
  constructor(
    @InjectRepository(FormTemplate)
    private readonly templateRepository: Repository<FormTemplate>,
    @InjectRepository(FormInstance)
    private readonly instanceRepository: Repository<FormInstance>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  // ========== TEMPLATE MANAGEMENT ==========

  async createTemplate(dto: CreateFormTemplateDto, userId: string): Promise<FormTemplate> {
    // Validate project if provided
    if (dto.projectId) {
      const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    // Initialize with empty fields if not provided
    const fields = dto.fields || [];

    const template = this.templateRepository.create({
      name: dto.name,
      description: dto.description,
      category: dto.category,
      status: dto.status || TemplateStatus.DRAFT,
      visibility: dto.visibility,
      version: 1,
      fields,
      settings: dto.settings || {},
      project: dto.projectId ? ({ id: dto.projectId } as Project) : null,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.templateRepository.save(template);
    return this.findTemplateById(saved.id);
  }

  async findTemplateById(id: string): Promise<FormTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['project', 'createdBy', 'updatedBy'],
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async findTemplatesByProject(
    projectId: string,
    filters?: {
      status?: TemplateStatus;
      category?: string;
      includeArchived?: boolean;
      search?: string;
    },
  ): Promise<FormTemplate[]> {
    const qb = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .leftJoinAndSelect('template.updatedBy', 'updatedBy')
      .leftJoinAndSelect('template.project', 'project')
      .where('(template.project_id = :projectId OR template.project_id IS NULL)', { projectId });

    // By default, exclude archived templates
    if (!filters?.includeArchived) {
      qb.andWhere('template.isArchived = :isArchived', { isArchived: false });
    }

    // Apply filters
    if (filters?.status) {
      qb.andWhere('template.status = :status', { status: filters.status });
    }

    if (filters?.category) {
      qb.andWhere('template.category = :category', { category: filters.category });
    }

    if (filters?.search) {
      qb.andWhere('(template.name ILIKE :search OR template.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('template.createdAt', 'DESC');
    return qb.getMany();
  }

  async updateTemplate(
    id: string,
    dto: UpdateFormTemplateDto,
    userId: string,
  ): Promise<FormTemplate> {
    const template = await this.findTemplateById(id);

    // Check if template is published and being modified
    const isStructureChange = dto.fields !== undefined;
    if (template.status === TemplateStatus.PUBLISHED && isStructureChange) {
      // Increment version when modifying published template structure
      template.version += 1;
    }

    // Update fields
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.category !== undefined) template.category = dto.category;
    if (dto.status !== undefined) {
      template.status = dto.status;
      if (dto.status === TemplateStatus.PUBLISHED && !template.publishedAt) {
        template.publishedAt = new Date();
      }
    }
    if (dto.visibility !== undefined) template.visibility = dto.visibility;
    if (dto.fields !== undefined) template.fields = dto.fields;
    if (dto.settings !== undefined) template.settings = dto.settings;

    template.updatedBy = { id: userId } as User;

    await this.templateRepository.save(template);
    return this.findTemplateById(id);
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = await this.findTemplateById(id);

    // Check if template has instances
    const instanceCount = await this.instanceRepository.count({
      where: { template: { id } },
    });

    if (instanceCount > 0) {
      throw new BadRequestException(
        'Cannot delete template with existing instances. Archive it instead.',
      );
    }

    await this.templateRepository.delete(id);
  }

  async archiveTemplate(id: string, userId: string): Promise<FormTemplate> {
    const template = await this.findTemplateById(id);

    template.isArchived = true;
    template.archivedAt = new Date();
    template.status = TemplateStatus.ARCHIVED;
    template.updatedBy = { id: userId } as User;

    await this.templateRepository.save(template);
    return this.findTemplateById(id);
  }

  async restoreTemplate(id: string, userId: string): Promise<FormTemplate> {
    const template = await this.findTemplateById(id);

    if (!template.isArchived) {
      throw new BadRequestException('Template is not archived');
    }

    template.isArchived = false;
    template.archivedAt = null;
    template.status = TemplateStatus.DRAFT;
    template.updatedBy = { id: userId } as User;

    await this.templateRepository.save(template);
    return this.findTemplateById(id);
  }

  async publishTemplate(id: string, userId: string): Promise<FormTemplate> {
    const template = await this.findTemplateById(id);

    if (template.status === TemplateStatus.ARCHIVED) {
      throw new BadRequestException('Cannot publish archived template');
    }

    if (!template.fields || template.fields.length === 0) {
      throw new BadRequestException('Cannot publish template with no fields');
    }

    template.status = TemplateStatus.PUBLISHED;
    template.publishedAt = new Date();
    template.updatedBy = { id: userId } as User;

    await this.templateRepository.save(template);
    return this.findTemplateById(id);
  }

  async duplicateTemplate(id: string, userId: string, newName?: string): Promise<FormTemplate> {
    const original = await this.findTemplateById(id);

    const duplicate = this.templateRepository.create({
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      category: original.category,
      visibility: original.visibility,
      status: TemplateStatus.DRAFT,
      version: 1,
      fields: JSON.parse(JSON.stringify(original.fields)), // Deep copy
      settings: JSON.parse(JSON.stringify(original.settings)), // Deep copy
      project: original.project,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.templateRepository.save(duplicate);
    return this.findTemplateById(saved.id);
  }

  async addField(templateId: string, field: FormField, userId: string): Promise<FormTemplate> {
    const template = await this.findTemplateById(templateId);

    // Ensure field has an ID
    if (!field.id) {
      field.id = uuidv4();
    }

    // Set order if not provided
    if (!field.order && field.order !== 0) {
      field.order = template.fields.length;
    }

    template.fields.push(field);
    template.updatedBy = { id: userId } as User;

    await this.templateRepository.save(template);
    return this.findTemplateById(templateId);
  }

  async updateField(
    templateId: string,
    fieldId: string,
    updatedField: Partial<FormField>,
    userId: string,
  ): Promise<FormTemplate> {
    const template = await this.findTemplateById(templateId);

    const fieldIndex = template.fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex === -1) {
      throw new NotFoundException('Field not found');
    }

    template.fields[fieldIndex] = {
      ...template.fields[fieldIndex],
      ...updatedField,
    };

    template.updatedBy = { id: userId } as User;

    await this.templateRepository.save(template);
    return this.findTemplateById(templateId);
  }

  async deleteField(templateId: string, fieldId: string, userId: string): Promise<FormTemplate> {
    const template = await this.findTemplateById(templateId);

    template.fields = template.fields.filter((f) => f.id !== fieldId);
    template.updatedBy = { id: userId } as User;

    await this.templateRepository.save(template);
    return this.findTemplateById(templateId);
  }

  async reorderFields(
    templateId: string,
    dto: UpdateFieldOrderDto,
    userId: string,
  ): Promise<FormTemplate> {
    const template = await this.findTemplateById(templateId);

    // Create a map of current fields
    const fieldMap = new Map(template.fields.map((f) => [f.id, f]));

    // Reorder based on provided IDs
    const reorderedFields = dto.fieldIds
      .map((id, index) => {
        const field = fieldMap.get(id);
        if (field) {
          return { ...field, order: index };
        }
        return null;
      })
      .filter((f) => f !== null) as FormField[];

    template.fields = reorderedFields;
    template.updatedBy = { id: userId } as User;

    await this.templateRepository.save(template);
    return this.findTemplateById(templateId);
  }

  // ========== INSTANCE MANAGEMENT ==========

  async createInstance(dto: CreateFormInstanceDto, userId: string): Promise<FormInstance> {
    // Validate template exists and is published
    const template = await this.findTemplateById(dto.templateId);

    if (template.status === TemplateStatus.ARCHIVED) {
      throw new BadRequestException('Cannot create instance from archived template');
    }

    // Validate project exists
    const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const instance = this.instanceRepository.create({
      name: dto.name,
      template: { id: dto.templateId } as FormTemplate,
      project: { id: dto.projectId } as Project,
      templateVersion: template.version,
      values: dto.values || {},
      status: dto.status || InstanceStatus.DRAFT,
      version: 1,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.instanceRepository.save(instance);
    return this.findInstanceById(saved.id);
  }

  async findInstanceById(id: string): Promise<FormInstance> {
    const instance = await this.instanceRepository.findOne({
      where: { id },
      relations: ['template', 'project', 'createdBy', 'updatedBy', 'submittedBy', 'approvedBy'],
    });
    if (!instance) {
      throw new NotFoundException('Instance not found');
    }
    return instance;
  }

  async findInstancesByProject(
    projectId: string,
    filters?: {
      templateId?: string;
      status?: InstanceStatus;
      includeArchived?: boolean;
      search?: string;
    },
  ): Promise<FormInstance[]> {
    const qb = this.instanceRepository
      .createQueryBuilder('instance')
      .leftJoinAndSelect('instance.template', 'template')
      .leftJoinAndSelect('instance.project', 'project')
      .leftJoinAndSelect('instance.createdBy', 'createdBy')
      .leftJoinAndSelect('instance.updatedBy', 'updatedBy')
      .leftJoinAndSelect('instance.submittedBy', 'submittedBy')
      .where('instance.project_id = :projectId', { projectId });

    // By default, exclude archived instances
    if (!filters?.includeArchived) {
      qb.andWhere('instance.isArchived = :isArchived', { isArchived: false });
    }

    // Apply filters
    if (filters?.templateId) {
      qb.andWhere('instance.template_id = :templateId', { templateId: filters.templateId });
    }

    if (filters?.status) {
      qb.andWhere('instance.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      qb.andWhere('instance.name ILIKE :search', { search: `%${filters.search}%` });
    }

    qb.orderBy('instance.createdAt', 'DESC');
    return qb.getMany();
  }

  async findInstancesByTemplate(templateId: string): Promise<FormInstance[]> {
    return this.instanceRepository.find({
      where: { template: { id: templateId } },
      relations: ['project', 'createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateInstance(
    id: string,
    dto: UpdateFormInstanceDto,
    userId: string,
  ): Promise<FormInstance> {
    const instance = await this.findInstanceById(id);

    // Prevent editing submitted/approved instances
    if (instance.status === InstanceStatus.SUBMITTED || instance.status === InstanceStatus.APPROVED) {
      throw new BadRequestException(
        'Cannot edit submitted or approved instance. Create a new version instead.',
      );
    }

    // Update fields
    if (dto.name !== undefined) instance.name = dto.name;
    if (dto.values !== undefined) instance.values = dto.values;
    if (dto.status !== undefined) {
      instance.status = dto.status;
      if (dto.status === InstanceStatus.SUBMITTED && !instance.submittedAt) {
        instance.submittedAt = new Date();
        instance.submittedBy = { id: userId } as User;
      }
    }

    instance.updatedBy = { id: userId } as User;

    await this.instanceRepository.save(instance);
    return this.findInstanceById(id);
  }

  async submitInstance(id: string, userId: string): Promise<FormInstance> {
    const instance = await this.findInstanceById(id);

    if (instance.status !== InstanceStatus.DRAFT) {
      throw new BadRequestException('Only draft instances can be submitted');
    }

    instance.status = InstanceStatus.SUBMITTED;
    instance.submittedAt = new Date();
    instance.submittedBy = { id: userId } as User;
    instance.updatedBy = { id: userId } as User;

    await this.instanceRepository.save(instance);
    return this.findInstanceById(id);
  }

  async approveInstance(id: string, userId: string, notes?: string): Promise<FormInstance> {
    const instance = await this.findInstanceById(id);

    if (instance.status !== InstanceStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted instances can be approved');
    }

    instance.status = InstanceStatus.APPROVED;
    instance.approvedAt = new Date();
    instance.approvedBy = { id: userId } as User;
    instance.approvalNotes = notes;
    instance.updatedBy = { id: userId } as User;

    await this.instanceRepository.save(instance);
    return this.findInstanceById(id);
  }

  async rejectInstance(id: string, userId: string, notes?: string): Promise<FormInstance> {
    const instance = await this.findInstanceById(id);

    if (instance.status !== InstanceStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted instances can be rejected');
    }

    instance.status = InstanceStatus.REJECTED;
    instance.approvalNotes = notes;
    instance.updatedBy = { id: userId } as User;

    await this.instanceRepository.save(instance);
    return this.findInstanceById(id);
  }

  async deleteInstance(id: string): Promise<void> {
    const instance = await this.findInstanceById(id);

    // Prevent deletion of approved instances
    if (instance.status === InstanceStatus.APPROVED) {
      throw new BadRequestException('Cannot delete approved instance. Archive it instead.');
    }

    await this.instanceRepository.delete(id);
  }

  async archiveInstance(id: string, userId: string): Promise<FormInstance> {
    const instance = await this.findInstanceById(id);

    instance.isArchived = true;
    instance.archivedAt = new Date();
    instance.updatedBy = { id: userId } as User;

    await this.instanceRepository.save(instance);
    return this.findInstanceById(id);
  }

  async restoreInstance(id: string, userId: string): Promise<FormInstance> {
    const instance = await this.findInstanceById(id);

    if (!instance.isArchived) {
      throw new BadRequestException('Instance is not archived');
    }

    instance.isArchived = false;
    instance.archivedAt = null;
    instance.updatedBy = { id: userId } as User;

    await this.instanceRepository.save(instance);
    return this.findInstanceById(id);
  }

  async duplicateInstance(id: string, userId: string, newName?: string): Promise<FormInstance> {
    const original = await this.findInstanceById(id);

    const duplicate = this.instanceRepository.create({
      name: newName || `${original.name} (Copy)`,
      template: original.template,
      project: original.project,
      templateVersion: original.templateVersion,
      values: JSON.parse(JSON.stringify(original.values)), // Deep copy
      status: InstanceStatus.DRAFT,
      version: 1,
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    const saved = await this.instanceRepository.save(duplicate);
    return this.findInstanceById(saved.id);
  }
}
