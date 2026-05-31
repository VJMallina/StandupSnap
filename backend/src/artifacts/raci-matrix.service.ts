import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RaciMatrix } from '../entities/raci-matrix.entity';
import { RaciEntry } from '../entities/raci-entry.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateRaciMatrixDto } from './dto/create-raci-matrix.dto';
import { AddTaskDto } from './dto/add-task.dto';
import { AddTeamMemberColumnDto } from './dto/add-team-member-column.dto';
import { SetRaciDto } from './dto/set-raci.dto';
import { SetApprovedByDto } from './dto/set-approved-by.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class RaciMatrixService {
  constructor(private tenantService: TenantService) {}

  async create(createRaciMatrixDto: CreateRaciMatrixDto, userId: string, orgId?: string): Promise<RaciMatrix> {
    const { projectId, name, description } = createRaciMatrixDto;
    const [raciMatrixRepo, projectRepo] = await Promise.all([
      this.tenantService.getRepository(RaciMatrix),
      this.tenantService.getRepository(Project),
    ]);

    const project = await projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);

    const raciMatrix = raciMatrixRepo.create({
      project: { id: projectId } as Project,
      name,
      description,
      teamMemberColumns: [],
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
      ...(orgId ? { organizationId: orgId } : {}),
    });

    return raciMatrixRepo.save(raciMatrix);
  }

  async findById(id: string): Promise<RaciMatrix> {
    const raciMatrixRepo = await this.tenantService.getRepository(RaciMatrix);
    const raciMatrix = await raciMatrixRepo.findOne({
      where: { id },
      relations: ['project', 'entries', 'createdBy', 'updatedBy', 'approvedBy'],
    });

    if (!raciMatrix) throw new NotFoundException(`RACI matrix with ID ${id} not found`);

    if (raciMatrix.entries) {
      raciMatrix.entries.sort((a, b) => a.rowOrder - b.rowOrder);
    }

    return raciMatrix;
  }

  async findByProject(projectId: string): Promise<RaciMatrix[]> {
    const raciMatrixRepo = await this.tenantService.getRepository(RaciMatrix);
    return raciMatrixRepo.find({
      where: { project: { id: projectId } },
      relations: ['project', 'createdBy', 'updatedBy', 'approvedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async addTask(matrixId: string, addTaskDto: AddTaskDto, userId?: string): Promise<any> {
    const raciEntryRepo = await this.tenantService.getRepository(RaciEntry);
    const raciMatrix = await this.findById(matrixId);
    const { taskName, taskDescription, rowOrder } = addTaskDto;

    if (taskName && taskName.length > 50) throw new BadRequestException('Task name must be 50 characters or fewer');
    if (taskDescription && taskDescription.length > 100) throw new BadRequestException('Task description must be 100 characters or fewer');

    const finalRowOrder = rowOrder !== undefined
      ? rowOrder
      : raciMatrix.entries.length > 0
        ? Math.max(...raciMatrix.entries.map(e => e.rowOrder)) + 1
        : 0;

    const entry = raciEntryRepo.create({
      raciMatrix: { id: matrixId } as RaciMatrix,
      rowOrder: finalRowOrder,
      taskName,
      taskDescription,
      teamMember: null,
      raciRole: null,
    });

    await raciEntryRepo.save(entry);
    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  async updateTask(matrixId: string, rowOrder: number, taskName?: string, taskDescription?: string, userId?: string): Promise<any> {
    if (taskName && taskName.length > 50) throw new BadRequestException('Task name must be 50 characters or fewer');
    if (taskDescription && taskDescription.length > 100) throw new BadRequestException('Task description must be 100 characters or fewer');

    const raciEntryRepo = await this.tenantService.getRepository(RaciEntry);
    const raciMatrix = await this.findById(matrixId);

    const taskEntry = raciMatrix.entries.find(e => e.rowOrder === rowOrder && !e.memberId);
    if (!taskEntry) throw new NotFoundException(`Task at row ${rowOrder} not found`);

    if (taskName !== undefined) taskEntry.taskName = taskName;
    if (taskDescription !== undefined) taskEntry.taskDescription = taskDescription;

    await raciEntryRepo.save(taskEntry);
    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  async deleteTask(matrixId: string, rowOrder: number, userId?: string): Promise<any> {
    const raciEntryRepo = await this.tenantService.getRepository(RaciEntry);
    const raciMatrix = await this.findById(matrixId);

    const entriesToDelete = raciMatrix.entries.filter(e => e.rowOrder === rowOrder);
    if (entriesToDelete.length === 0) throw new NotFoundException(`Task at row ${rowOrder} not found`);

    await raciEntryRepo.remove(entriesToDelete);
    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  async addTeamMemberColumn(matrixId: string, addTeamMemberColumnDto: AddTeamMemberColumnDto, userId?: string): Promise<any> {
    const [raciMatrixRepo, projectRepo, teamMemberRepo] = await Promise.all([
      this.tenantService.getRepository(RaciMatrix),
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(TeamMember),
    ]);

    const raciMatrix = await this.findById(matrixId);
    const { teamMemberId } = addTeamMemberColumnDto;

    const columns = (raciMatrix.teamMemberColumns || [])
      .map(id => (id || '').toString().trim())
      .filter(Boolean);

    if (columns.includes(teamMemberId)) throw new BadRequestException('Team member column already exists');

    if (teamMemberId.startsWith('user-')) {
      const project = await projectRepo.findOne({
        where: { id: raciMatrix.project.id },
        relations: ['productOwner', 'pmo', 'members', 'members.user'],
      });
      if (!project) throw new NotFoundException('Project not found');

      const specialUserId = teamMemberId.replace('user-', '');
      const isProductOwner = project.productOwner?.id === specialUserId;
      const isPMO = project.pmo?.id === specialUserId;
      const isScrumMaster = project.members?.some(
        m => m.user?.id === specialUserId && m.isActive && m.role.toLowerCase().includes('scrum')
      );

      if (!isProductOwner && !isPMO && !isScrumMaster) {
        throw new BadRequestException('User is not a valid PO, PMO, or Scrum Master for this project');
      }
    } else {
      const teamMember = await teamMemberRepo.findOne({ where: { id: teamMemberId }, relations: ['projects'] });
      if (!teamMember) throw new NotFoundException(`Team member with ID ${teamMemberId} not found`);

      const isInProject = teamMember.projects?.some(p => p.id === raciMatrix.project.id);
      if (!isInProject) throw new BadRequestException('Team member is not part of this project');
    }

    raciMatrix.teamMemberColumns = [...columns, teamMemberId];
    await raciMatrixRepo.save(raciMatrix);
    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  async removeTeamMemberColumn(matrixId: string, teamMemberId: string, userId?: string): Promise<any> {
    const [raciMatrixRepo, raciEntryRepo] = await Promise.all([
      this.tenantService.getRepository(RaciMatrix),
      this.tenantService.getRepository(RaciEntry),
    ]);

    const raciMatrix = await this.findById(matrixId);

    const columns = raciMatrix.teamMemberColumns || [];
    if (!columns.includes(teamMemberId)) throw new NotFoundException('Team member column not found');

    raciMatrix.teamMemberColumns = columns.filter(id => id !== teamMemberId);
    await raciMatrixRepo.save(raciMatrix);

    const entriesToDelete = raciMatrix.entries.filter(e => e.memberId === teamMemberId);
    if (entriesToDelete.length > 0) await raciEntryRepo.remove(entriesToDelete);

    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  async setRaci(matrixId: string, setRaciDto: SetRaciDto, userId?: string): Promise<any> {
    const raciEntryRepo = await this.tenantService.getRepository(RaciEntry);
    const raciMatrix = await this.findById(matrixId);
    const { rowOrder, teamMemberId, raciRole } = setRaciDto;

    const columns = raciMatrix.teamMemberColumns || [];
    if (!columns.includes(teamMemberId)) throw new BadRequestException('Team member column does not exist');

    const taskEntry = raciMatrix.entries.find(e => e.rowOrder === rowOrder && !e.memberId);
    if (!taskEntry) throw new NotFoundException(`Task at row ${rowOrder} not found`);

    let raciEntry = raciMatrix.entries.find(e => e.rowOrder === rowOrder && e.memberId === teamMemberId);

    if (!raciRole) {
      if (raciEntry) await raciEntryRepo.remove(raciEntry);
    } else {
      if (raciEntry) {
        raciEntry.raciRole = raciRole;
        await raciEntryRepo.save(raciEntry);
      } else {
        if (teamMemberId.startsWith('user-')) {
          raciEntry = raciEntryRepo.create({
            raciMatrix: { id: matrixId } as RaciMatrix,
            rowOrder,
            taskName: taskEntry.taskName,
            taskDescription: taskEntry.taskDescription,
            memberId: teamMemberId,
            teamMember: null,
            raciRole,
          });
        } else {
          raciEntry = raciEntryRepo.create({
            raciMatrix: { id: matrixId } as RaciMatrix,
            rowOrder,
            taskName: taskEntry.taskName,
            taskDescription: taskEntry.taskDescription,
            memberId: teamMemberId,
            teamMember: { id: teamMemberId } as TeamMember,
            raciRole,
          });
        }
        await raciEntryRepo.save(raciEntry);
      }
    }

    await this.touchUpdatedBy(matrixId, userId);
    return this.getFormattedMatrix(matrixId);
  }

  async setApprovedBy(matrixId: string, approverId: string, userId?: string): Promise<any> {
    const [raciMatrixRepo, projectRepo] = await Promise.all([
      this.tenantService.getRepository(RaciMatrix),
      this.tenantService.getRepository(Project),
    ]);

    const raciMatrix = await this.findById(matrixId);

    const project = await projectRepo.findOne({
      where: { id: raciMatrix.project.id },
      relations: ['productOwner', 'pmo', 'members', 'members.user'],
    });
    if (!project) throw new NotFoundException('Project not found');

    const isPO = project.productOwner?.id === approverId;
    const isPMO = project.pmo?.id === approverId;
    const scrumMember = project.members?.find(m => m.user?.id === approverId && m.isActive && m.role.toLowerCase().includes('scrum'));

    if (!isPO && !isPMO && !scrumMember) {
      throw new BadRequestException('Approver must be PO, PMO, or Scrum Master for this project');
    }

    raciMatrix.approvedBy = { id: approverId } as User;
    await raciMatrixRepo.save(raciMatrix);
    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  async delete(matrixId: string): Promise<void> {
    const raciMatrixRepo = await this.tenantService.getRepository(RaciMatrix);
    const raciMatrix = await raciMatrixRepo.findOne({ where: { id: matrixId } });
    if (!raciMatrix) throw new NotFoundException(`RACI matrix with ID ${matrixId} not found`);
    await raciMatrixRepo.remove(raciMatrix);
  }

  async getFormattedMatrix(matrixId: string): Promise<any> {
    const [teamMemberRepo, projectRepo] = await Promise.all([
      this.tenantService.getRepository(TeamMember),
      this.tenantService.getRepository(Project),
    ]);

    const raciMatrix = await this.findById(matrixId);

    const taskEntries = raciMatrix.entries.filter(e => !e.memberId);
    const tasks = taskEntries.map(e => ({
      rowOrder: e.rowOrder,
      taskName: e.taskName,
      taskDescription: e.taskDescription,
    }));

    const teamMemberIds = (raciMatrix.teamMemberColumns || [])
      .map(id => (id || '').toString().trim())
      .filter(id => !!id && !id.startsWith('external-'));

    const specialRoleIds = teamMemberIds.filter(id => id.startsWith('user-'));
    const uuidMemberIds = teamMemberIds.filter(id =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    const hasNonUuidRegular = uuidMemberIds.length !== (teamMemberIds.length - specialRoleIds.length);
    const regularTeamMembers: TeamMember[] = !hasNonUuidRegular && uuidMemberIds.length > 0
      ? await teamMemberRepo.findByIds(uuidMemberIds)
      : [];

    const project = await projectRepo.findOne({
      where: { id: raciMatrix.project.id },
      relations: ['productOwner', 'pmo', 'members', 'members.user'],
    });

    const teamMembersList: any[] = [];

    for (const tmId of teamMemberIds) {
      if (tmId.startsWith('user-')) {
        const userId = tmId.replace('user-', '');
        if (project.productOwner?.id === userId) {
          teamMembersList.push({ id: tmId, fullName: project.productOwner.name, displayName: project.productOwner.name, designationRole: 'Product Owner' });
        } else if (project.pmo?.id === userId) {
          teamMembersList.push({ id: tmId, fullName: project.pmo.name, displayName: project.pmo.name, designationRole: 'PMO' });
        } else if (project.members) {
          const scrumMaster = project.members.find(m => m.user?.id === userId && m.role.toLowerCase().includes('scrum') && m.isActive);
          if (scrumMaster?.user) {
            teamMembersList.push({ id: tmId, fullName: scrumMaster.user.name, displayName: scrumMaster.user.name, designationRole: 'Scrum Master' });
          }
        }
      } else {
        const tm = regularTeamMembers.find(t => t.id === tmId);
        if (tm) teamMembersList.push({ id: tm.id, fullName: tm.fullName, displayName: tm.displayName, designationRole: tm.designationRole });
      }
    }

    const raciGrid: Record<number, Record<string, string>> = {};
    for (const task of tasks) {
      raciGrid[task.rowOrder] = {};
      for (const tmId of teamMemberIds) {
        const entry = raciMatrix.entries.find(e => e.rowOrder === task.rowOrder && e.memberId === tmId);
        raciGrid[task.rowOrder][tmId] = entry?.raciRole || '';
      }
    }

    const approvers: { id: string; name: string; role: string }[] = [];
    if (project.productOwner) approvers.push({ id: project.productOwner.id, name: project.productOwner.name, role: 'Product Owner' });
    if (project.pmo) approvers.push({ id: project.pmo.id, name: project.pmo.name, role: 'PMO' });
    if (project.members) {
      const scrum = project.members.find(m => m.user && m.role.toLowerCase().includes('scrum') && m.isActive);
      if (scrum?.user) approvers.push({ id: scrum.user.id, name: scrum.user.name, role: 'Scrum Master' });
    }

    return {
      id: raciMatrix.id,
      name: raciMatrix.name,
      description: raciMatrix.description,
      createdAt: raciMatrix.createdAt,
      updatedAt: raciMatrix.updatedAt,
      createdBy: raciMatrix.createdBy ? { id: raciMatrix.createdBy.id, name: raciMatrix.createdBy.name || raciMatrix.createdBy.username } : null,
      updatedBy: raciMatrix.updatedBy ? { id: raciMatrix.updatedBy.id, name: raciMatrix.updatedBy.name || raciMatrix.updatedBy.username } : null,
      approvedBy: raciMatrix.approvedBy ? { id: raciMatrix.approvedBy.id, name: raciMatrix.approvedBy.name || raciMatrix.approvedBy.username } : null,
      approvers,
      tasks,
      teamMembers: teamMembersList,
      raciGrid,
    };
  }

  private async touchUpdatedBy(matrixId: string, userId?: string): Promise<void> {
    if (!userId) return;
    const raciMatrixRepo = await this.tenantService.getRepository(RaciMatrix);
    const matrix = await raciMatrixRepo.findOne({ where: { id: matrixId }, relations: ['createdBy', 'updatedBy'] });
    if (!matrix) return;

    const payload: Partial<RaciMatrix> = { updatedBy: { id: userId } as User };
    if (!matrix.createdBy) payload.createdBy = { id: userId } as User;

    await raciMatrixRepo.update({ id: matrixId }, payload);
  }
}
