import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RaciMatrix } from '../entities/raci-matrix.entity';
import { RaciEntry } from '../entities/raci-entry.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { randomUUID } from 'crypto';
import { CreateRaciMatrixDto } from './dto/create-raci-matrix.dto';
import { AddTaskDto } from './dto/add-task.dto';
import { AddTeamMemberColumnDto } from './dto/add-team-member-column.dto';
import { SetRaciDto } from './dto/set-raci.dto';
import { SetApprovedByDto } from './dto/set-approved-by.dto';

@Injectable()
export class RaciMatrixService {
  constructor(
    @InjectRepository(RaciMatrix)
    private raciMatrixRepository: Repository<RaciMatrix>,
    @InjectRepository(RaciEntry)
    private raciEntryRepository: Repository<RaciEntry>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
  ) {}

  /**
   * Create a new RACI matrix for a project
   */
  async create(createRaciMatrixDto: CreateRaciMatrixDto, userId: string): Promise<RaciMatrix> {
    const { projectId, name, description } = createRaciMatrixDto;

    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const raciMatrix = this.raciMatrixRepository.create({
      project: { id: projectId } as Project,
      name,
      description,
      teamMemberColumns: [],
      createdBy: { id: userId } as User,
      updatedBy: { id: userId } as User,
    });

    return this.raciMatrixRepository.save(raciMatrix);
  }

  /**
   * Get RACI matrix by ID with all entries
   */
  async findById(id: string): Promise<RaciMatrix> {
    // Load without entries.teamMember to avoid UUID parsing on external/special IDs
    const raciMatrix = await this.raciMatrixRepository.findOne({
      where: { id },
      relations: ['project', 'entries', 'createdBy', 'updatedBy', 'approvedBy'],
    });

    if (!raciMatrix) {
      throw new NotFoundException(`RACI matrix with ID ${id} not found`);
    }

    // Sort entries by rowOrder
    if (raciMatrix.entries) {
      raciMatrix.entries.sort((a, b) => a.rowOrder - b.rowOrder);
    }

    return raciMatrix;
  }

  /**
   * Get all RACI matrices for a project
   */
  async findByProject(projectId: string): Promise<RaciMatrix[]> {
    return this.raciMatrixRepository.find({
      where: { project: { id: projectId } },
      relations: ['project', 'createdBy', 'updatedBy', 'approvedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Add a task (row) to the RACI matrix
   */
  async addTask(matrixId: string, addTaskDto: AddTaskDto, userId?: string): Promise<any> {
    const raciMatrix = await this.findById(matrixId);
    const { taskName, taskDescription, rowOrder } = addTaskDto;

    if (taskName && taskName.length > 50) {
      throw new BadRequestException('Task name must be 50 characters or fewer');
    }
    if (taskDescription && taskDescription.length > 100) {
      throw new BadRequestException('Task description must be 100 characters or fewer');
    }

    // Determine rowOrder if not provided
    const finalRowOrder = rowOrder !== undefined
      ? rowOrder
      : raciMatrix.entries.length > 0
        ? Math.max(...raciMatrix.entries.map(e => e.rowOrder)) + 1
        : 0;

    // Create entry for task (no team member yet)
    const entry = this.raciEntryRepository.create({
      raciMatrix: { id: matrixId } as RaciMatrix,
      rowOrder: finalRowOrder,
      taskName,
      taskDescription,
      teamMember: null,
      raciRole: null,
    });

    await this.raciEntryRepository.save(entry);
    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  /**
   * Update a task name/description
   */
  async updateTask(
    matrixId: string,
    rowOrder: number,
    taskName?: string,
    taskDescription?: string,
    userId?: string,
  ): Promise<any> {
    if (taskName && taskName.length > 50) {
      throw new BadRequestException('Task name must be 50 characters or fewer');
    }
    if (taskDescription && taskDescription.length > 100) {
      throw new BadRequestException('Task description must be 100 characters or fewer');
    }

    const raciMatrix = await this.findById(matrixId);

    // Find the task entry (one with no memberId for this row)
    const taskEntry = raciMatrix.entries.find(
      e => e.rowOrder === rowOrder && !e.memberId
    );

    if (!taskEntry) {
      throw new NotFoundException(`Task at row ${rowOrder} not found`);
    }

    if (taskName !== undefined) {
      taskEntry.taskName = taskName;
    }

    if (taskDescription !== undefined) {
      taskEntry.taskDescription = taskDescription;
    }

    await this.raciEntryRepository.save(taskEntry);
    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  /**
   * Delete a task (removes all entries for that row)
   */
  async deleteTask(matrixId: string, rowOrder: number, userId?: string): Promise<any> {
    const raciMatrix = await this.findById(matrixId);

    // Delete all entries for this row
    const entriesToDelete = raciMatrix.entries.filter(e => e.rowOrder === rowOrder);

    if (entriesToDelete.length === 0) {
      throw new NotFoundException(`Task at row ${rowOrder} not found`);
    }

    await this.raciEntryRepository.remove(entriesToDelete);
    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  /**
   * Add a team member column to the RACI matrix
   */
  async addTeamMemberColumn(
    matrixId: string,
    addTeamMemberColumnDto: AddTeamMemberColumnDto,
    userId?: string,
  ): Promise<any> {
    const raciMatrix = await this.findById(matrixId);
    const { teamMemberId } = addTeamMemberColumnDto;

    const columns = (raciMatrix.teamMemberColumns || [])
      .map(id => (id || '').toString().trim())
      .filter(Boolean);

    // Check if team member column already exists
    if (columns.includes(teamMemberId)) {
      throw new BadRequestException('Team member column already exists');
    }

    // Check if it's a special role (user-{id}) or regular team member
    if (teamMemberId.startsWith('user-')) {
      // Special role - just verify it exists by loading the project with relations
      const project = await this.projectRepository.findOne({
        where: { id: raciMatrix.project.id },
        relations: ['productOwner', 'pmo', 'members', 'members.user'],
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // Extract user ID from the special ID format
      const specialUserId = teamMemberId.replace('user-', '');

      // Verify this user is actually associated with the project
      const isProductOwner = project.productOwner?.id === specialUserId;
      const isPMO = project.pmo?.id === specialUserId;
      const isScrumMaster = project.members?.some(
        m => m.user?.id === specialUserId && m.isActive && m.role.toLowerCase().includes('scrum')
      );

      const isValidSpecialRole = isProductOwner || isPMO || isScrumMaster;

      if (!isValidSpecialRole) {
        throw new BadRequestException('User is not a valid PO, PMO, or Scrum Master for this project');
      }
    } else {
      // Regular team member - verify exists and belongs to project
      const teamMember = await this.teamMemberRepository.findOne({
        where: { id: teamMemberId },
        relations: ['projects'],
      });

      if (!teamMember) {
        throw new NotFoundException(`Team member with ID ${teamMemberId} not found`);
      }

      // Check if team member is part of the project
      const isInProject = teamMember.projects?.some(p => p.id === raciMatrix.project.id);

      if (!isInProject) {
        throw new BadRequestException('Team member is not part of this project');
      }
    }

    // Add team member to columns
    raciMatrix.teamMemberColumns = [...columns, teamMemberId];
    await this.raciMatrixRepository.save(raciMatrix);
    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  /**
   * Remove a team member column
   */
  async removeTeamMemberColumn(matrixId: string, teamMemberId: string, userId?: string): Promise<any> {
    const raciMatrix = await this.findById(matrixId);

    const columns = raciMatrix.teamMemberColumns || [];
    if (!columns.includes(teamMemberId)) {
      throw new NotFoundException('Team member column not found');
    }

    // Remove from columns
    raciMatrix.teamMemberColumns = columns.filter(id => id !== teamMemberId);
    await this.raciMatrixRepository.save(raciMatrix);

    // Delete all RACI entries for this team member using memberId
    const entriesToDelete = raciMatrix.entries.filter(
      e => e.memberId === teamMemberId
    );

    if (entriesToDelete.length > 0) {
      await this.raciEntryRepository.remove(entriesToDelete);
    }

    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  /**
   * Set or update RACI assignment for a task-member cell
   */
  async setRaci(matrixId: string, setRaciDto: SetRaciDto, userId?: string): Promise<any> {
    const raciMatrix = await this.findById(matrixId);
    const { rowOrder, teamMemberId, raciRole } = setRaciDto;

    // Verify team member column exists
    const columns = raciMatrix.teamMemberColumns || [];
    if (!columns.includes(teamMemberId)) {
      throw new BadRequestException('Team member column does not exist');
    }

    // Verify task row exists
    const taskEntry = raciMatrix.entries.find(
      e => e.rowOrder === rowOrder && !e.memberId
    );

    if (!taskEntry) {
      throw new NotFoundException(`Task at row ${rowOrder} not found`);
    }

    // Find existing RACI entry for this cell using memberId
    let raciEntry = raciMatrix.entries.find(
      e => e.rowOrder === rowOrder && e.memberId === teamMemberId
    );

    if (!raciRole) {
      // If raciRole is null/undefined, remove the RACI assignment
      if (raciEntry) {
        await this.raciEntryRepository.remove(raciEntry);
      }
    } else {
      if (raciEntry) {
        // Update existing entry
        raciEntry.raciRole = raciRole;
        await this.raciEntryRepository.save(raciEntry);
      } else {
        // Create new entry
        if (teamMemberId.startsWith('user-')) {
          // Special role - no teamMember relation
          raciEntry = this.raciEntryRepository.create({
            raciMatrix: { id: matrixId } as RaciMatrix,
            rowOrder,
            taskName: taskEntry.taskName,
            taskDescription: taskEntry.taskDescription,
            memberId: teamMemberId,
            teamMember: null,
            raciRole,
          });
        } else {
          // Regular team member - include teamMember relation
          raciEntry = this.raciEntryRepository.create({
            raciMatrix: { id: matrixId } as RaciMatrix,
            rowOrder,
            taskName: taskEntry.taskName,
            taskDescription: taskEntry.taskDescription,
            memberId: teamMemberId,
            teamMember: { id: teamMemberId } as TeamMember,
            raciRole,
          });
        }

        await this.raciEntryRepository.save(raciEntry);
      }
    }

    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  async setApprovedBy(matrixId: string, approverId: string, userId?: string): Promise<any> {
    const raciMatrix = await this.findById(matrixId);

    const project = await this.projectRepository.findOne({
      where: { id: raciMatrix.project.id },
      relations: ['productOwner', 'pmo', 'members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isPO = project.productOwner?.id === approverId;
    const isPMO = project.pmo?.id === approverId;
    const scrumMember = project.members?.find(
      m => m.user?.id === approverId && m.isActive && m.role.toLowerCase().includes('scrum'),
    );

    if (!isPO && !isPMO && !scrumMember) {
      throw new BadRequestException('Approver must be PO, PMO, or Scrum Master for this project');
    }

    raciMatrix.approvedBy = { id: approverId } as User;
    await this.raciMatrixRepository.save(raciMatrix);
    await this.touchUpdatedBy(matrixId, userId);

    return this.getFormattedMatrix(matrixId);
  }

  /**
   * Delete a RACI matrix
   */
  async delete(matrixId: string): Promise<void> {
    const raciMatrix = await this.raciMatrixRepository.findOne({
      where: { id: matrixId },
    });

    if (!raciMatrix) {
      throw new NotFoundException(`RACI matrix with ID ${matrixId} not found`);
    }

    await this.raciMatrixRepository.remove(raciMatrix);
  }

  /**
   * Get formatted RACI matrix data for display
   */
  async getFormattedMatrix(matrixId: string): Promise<any> {
    const raciMatrix = await this.findById(matrixId);

    // Get unique tasks (rows) - tasks have no memberId
    const taskEntries = raciMatrix.entries.filter(e => !e.memberId);
    const tasks = taskEntries.map(e => ({
      rowOrder: e.rowOrder,
      taskName: e.taskName,
      taskDescription: e.taskDescription,
    }));

    // Get team member columns
    const teamMemberIds = (raciMatrix.teamMemberColumns || [])
      .map(id => (id || '').toString().trim())
      .filter(id => !!id && !id.startsWith('external-'));

    // Separate IDs
    const specialRoleIds = teamMemberIds.filter(id => id.startsWith('user-'));

    // Only UUIDs go to DB
    const uuidMemberIds = teamMemberIds.filter(id =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    const hasNonUuidRegular = uuidMemberIds.length !== (teamMemberIds.length - specialRoleIds.length);
    const regularTeamMembers: TeamMember[] = !hasNonUuidRegular && uuidMemberIds.length > 0
      ? await this.teamMemberRepository.findByIds(uuidMemberIds)
      : [];

    // Fetch project with special roles
    const project = await this.projectRepository.findOne({
      where: { id: raciMatrix.project.id },
      relations: ['productOwner', 'pmo', 'members', 'members.user'],
    });

    // Build team members list including special roles and external
    const teamMembersList: any[] = [];

    // Add regular team members (maintaining order from teamMemberColumns)
    for (const tmId of teamMemberIds) {
      if (tmId.startsWith('user-')) {
        // Special role
        const userId = tmId.replace('user-', '');

        // Find which special role this is
        if (project.productOwner?.id === userId) {
          teamMembersList.push({
            id: tmId,
            fullName: project.productOwner.name,
            displayName: project.productOwner.name,
            designationRole: 'Product Owner',
          });
        } else if (project.pmo?.id === userId) {
          teamMembersList.push({
            id: tmId,
            fullName: project.pmo.name,
            displayName: project.pmo.name,
            designationRole: 'PMO',
          });
        } else if (project.members) {
          // Check if it's a Scrum Master
          const scrumMaster = project.members.find(
            m => m.user?.id === userId && m.role.toLowerCase().includes('scrum') && m.isActive
          );
          if (scrumMaster && scrumMaster.user) {
            teamMembersList.push({
              id: tmId,
              fullName: scrumMaster.user.name,
              displayName: scrumMaster.user.name,
              designationRole: 'Scrum Master',
            });
          }
        }
      } else {
        // Regular team member
        const tm = regularTeamMembers.find(t => t.id === tmId);
        if (tm) {
          teamMembersList.push({
            id: tm.id,
            fullName: tm.fullName,
            displayName: tm.displayName,
            designationRole: tm.designationRole,
          });
        }
      }
    }

    // Build RACI assignments grid
    const raciGrid: Record<number, Record<string, string>> = {};

    for (const task of tasks) {
      raciGrid[task.rowOrder] = {};
      for (const tmId of teamMemberIds) {
        const entry = raciMatrix.entries.find(
          e => e.rowOrder === task.rowOrder && e.memberId === tmId
        );
        raciGrid[task.rowOrder][tmId] = entry?.raciRole || '';
      }
    }

    // Build approver options (PO, PMO, Scrum Master)
    const approvers: { id: string; name: string; role: string }[] = [];
    if (project.productOwner) {
      approvers.push({
        id: project.productOwner.id,
        name: project.productOwner.name,
        role: 'Product Owner',
      });
    }
    if (project.pmo) {
      approvers.push({
        id: project.pmo.id,
        name: project.pmo.name,
        role: 'PMO',
      });
    }
    if (project.members) {
      const scrum = project.members.find(
        m => m.user && m.role.toLowerCase().includes('scrum') && m.isActive,
      );
      if (scrum?.user) {
        approvers.push({
          id: scrum.user.id,
          name: scrum.user.name,
          role: 'Scrum Master',
        });
      }
    }

    return {
      id: raciMatrix.id,
      name: raciMatrix.name,
      description: raciMatrix.description,
      createdAt: raciMatrix.createdAt,
      updatedAt: raciMatrix.updatedAt,
      createdBy: raciMatrix.createdBy
        ? {
            id: raciMatrix.createdBy.id,
            name: raciMatrix.createdBy.name || raciMatrix.createdBy.username,
          }
        : null,
      updatedBy: raciMatrix.updatedBy
        ? {
            id: raciMatrix.updatedBy.id,
            name: raciMatrix.updatedBy.name || raciMatrix.updatedBy.username,
          }
        : null,
      approvedBy: raciMatrix.approvedBy
        ? {
            id: raciMatrix.approvedBy.id,
            name: raciMatrix.approvedBy.name || raciMatrix.approvedBy.username,
          }
        : null,
      approvers,
      tasks,
      teamMembers: teamMembersList,
      raciGrid,
    };
  }

  private async touchUpdatedBy(matrixId: string, userId?: string): Promise<void> {
    if (!userId) return;
    const matrix = await this.raciMatrixRepository.findOne({
      where: { id: matrixId },
      relations: ['createdBy', 'updatedBy'],
    });
    if (!matrix) return;

    const payload: Partial<RaciMatrix> = {
      updatedBy: { id: userId } as User,
    };

    if (!matrix.createdBy) {
      payload.createdBy = { id: userId } as User;
    }

    await this.raciMatrixRepository.update({ id: matrixId }, payload);
  }
}
