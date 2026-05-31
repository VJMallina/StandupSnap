import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import { WorkflowTemplate, TransitionMode } from '../entities/workflow-template.entity';
import { WorkflowLane, LaneType, DEFAULT_LANES } from '../entities/workflow-lane.entity';
import { Card } from '../entities/card.entity';
import { Project } from '../entities/project.entity';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class WorkflowService {
  constructor(private tenantService: TenantService) {}

  async seedDefaultWorkflow(projectId: string, organizationId: string): Promise<WorkflowTemplate> {
    const [templateRepo, laneRepo] = await Promise.all([
      this.tenantService.getRepository(WorkflowTemplate),
      this.tenantService.getRepository(WorkflowLane),
    ]);

    const template = templateRepo.create({ projectId, organizationId, name: 'Default', isDefault: true });
    const saved = await templateRepo.save(template);

    const lanes = DEFAULT_LANES.map((l) => laneRepo.create({ ...l, workflowTemplateId: saved.id }));
    await laneRepo.save(lanes);

    return this.getWorkflowWithLanes(saved.id);
  }

  async getProjectWorkflows(projectId: string): Promise<WorkflowTemplate[]> {
    const templateRepo = await this.tenantService.getRepository(WorkflowTemplate);
    const templates = await templateRepo.find({
      where: { projectId, deletedAt: IsNull() },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
    return Promise.all(templates.map((t) => this.getWorkflowWithLanes(t.id)));
  }

  async getDefaultWorkflow(projectId: string): Promise<WorkflowTemplate> {
    const [templateRepo, projectRepo] = await Promise.all([
      this.tenantService.getRepository(WorkflowTemplate),
      this.tenantService.getRepository(Project),
    ]);

    let template = await templateRepo.findOne({ where: { projectId, isDefault: true, deletedAt: IsNull() } });
    if (!template) {
      const project = await projectRepo.findOne({ where: { id: projectId } });
      const orgId = project?.organizationId ?? null;
      return this.seedDefaultWorkflow(projectId, orgId);
    }

    return this.getWorkflowWithLanes(template.id);
  }

  async getWorkflowWithLanes(templateId: string): Promise<WorkflowTemplate> {
    const [templateRepo, laneRepo] = await Promise.all([
      this.tenantService.getRepository(WorkflowTemplate),
      this.tenantService.getRepository(WorkflowLane),
    ]);

    const template = await templateRepo.findOne({ where: { id: templateId, deletedAt: IsNull() } });
    if (!template) throw new NotFoundException('Workflow not found');

    const lanes = await laneRepo.find({
      where: { workflowTemplateId: templateId, deletedAt: IsNull() },
      order: { order: 'ASC' },
    });

    template.lanes = lanes;
    return template;
  }

  async addLane(
    templateId: string,
    dto: { name: string; order: number; color?: string; laneType: LaneType; isFinalLane?: boolean },
  ): Promise<WorkflowLane> {
    const [templateRepo, laneRepo] = await Promise.all([
      this.tenantService.getRepository(WorkflowTemplate),
      this.tenantService.getRepository(WorkflowLane),
    ]);

    const template = await templateRepo.findOne({ where: { id: templateId, deletedAt: IsNull() } });
    if (!template) throw new NotFoundException('Workflow not found');

    if (dto.isFinalLane) {
      await laneRepo.update({ workflowTemplateId: templateId, isFinalLane: true }, { isFinalLane: false });
    }

    const lane = laneRepo.create({
      workflowTemplateId: templateId,
      name: dto.name,
      order: dto.order,
      color: dto.color || '#6B7280',
      laneType: dto.laneType,
      isFinalLane: dto.isFinalLane ?? false,
    });

    return laneRepo.save(lane);
  }

  async updateLane(
    laneId: string,
    dto: { name?: string; color?: string; laneType?: LaneType; isFinalLane?: boolean; order?: number },
  ): Promise<WorkflowLane> {
    const laneRepo = await this.tenantService.getRepository(WorkflowLane);
    const lane = await laneRepo.findOne({ where: { id: laneId, deletedAt: IsNull() } });
    if (!lane) throw new NotFoundException('Lane not found');

    if (dto.isFinalLane && !lane.isFinalLane) {
      await laneRepo.update({ workflowTemplateId: lane.workflowTemplateId, isFinalLane: true }, { isFinalLane: false });
    }

    Object.assign(lane, dto);
    return laneRepo.save(lane);
  }

  async reorderLanes(templateId: string, laneOrders: { laneId: string; order: number }[]): Promise<WorkflowLane[]> {
    const laneRepo = await this.tenantService.getRepository(WorkflowLane);
    const lanes = await laneRepo.find({ where: { workflowTemplateId: templateId, deletedAt: IsNull() } });
    const laneMap = new Map(lanes.map((l) => [l.id, l]));

    for (const { laneId, order } of laneOrders) {
      const lane = laneMap.get(laneId);
      if (lane) { lane.order = order; await laneRepo.save(lane); }
    }

    return laneRepo.find({ where: { workflowTemplateId: templateId, deletedAt: IsNull() }, order: { order: 'ASC' } });
  }

  async deleteLane(laneId: string): Promise<void> {
    const [laneRepo, cardRepo] = await Promise.all([
      this.tenantService.getRepository(WorkflowLane),
      this.tenantService.getRepository(Card),
    ]);

    const lane = await laneRepo.findOne({ where: { id: laneId, deletedAt: IsNull() } });
    if (!lane) throw new NotFoundException('Lane not found');

    const laneCount = await laneRepo.count({ where: { workflowTemplateId: lane.workflowTemplateId, deletedAt: IsNull() } });
    if (laneCount <= 2) throw new BadRequestException('A workflow must have at least 2 lanes');

    const fallbackLane = await laneRepo.findOne({
      where: { workflowTemplateId: lane.workflowTemplateId, laneType: LaneType.TODO, deletedAt: IsNull() },
      order: { order: 'ASC' },
    });

    if (fallbackLane) await cardRepo.update({ laneId }, { laneId: fallbackLane.id });
    await laneRepo.softDelete(laneId);
  }

  async updateWorkflow(id: string, dto: { transitionMode?: TransitionMode }): Promise<WorkflowTemplate> {
    const templateRepo = await this.tenantService.getRepository(WorkflowTemplate);
    const template = await templateRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!template) throw new NotFoundException('Workflow not found');
    Object.assign(template, dto);
    await templateRepo.save(template);
    return this.getWorkflowWithLanes(id);
  }

  async getLane(laneId: string): Promise<WorkflowLane> {
    const laneRepo = await this.tenantService.getRepository(WorkflowLane);
    const lane = await laneRepo.findOne({ where: { id: laneId, deletedAt: IsNull() } });
    if (!lane) throw new NotFoundException('Lane not found');
    return lane;
  }
}
