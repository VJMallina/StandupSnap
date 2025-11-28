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
import { CreateRaciMatrixDto } from './dto/create-raci-matrix.dto';
import { AddTaskDto } from './dto/add-task.dto';
import { AddTeamMemberColumnDto } from './dto/add-team-member-column.dto';
import { SetRaciDto } from './dto/set-raci.dto';

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
    });

    return this.raciMatrixRepository.save(raciMatrix);
  }

  /**
   * Get RACI matrix by ID with all entries
   */
  async findById(id: string): Promise<RaciMatrix> {
    const raciMatrix = await this.raciMatrixRepository.findOne({
      where: { id },
      relations: ['project', 'entries', 'entries.teamMember'],
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
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Add a task (row) to the RACI matrix
   */
  async addTask(matrixId: string, addTaskDto: AddTaskDto): Promise<RaciMatrix> {
    const raciMatrix = await this.findById(matrixId);
    const { taskName, taskDescription, rowOrder } = addTaskDto;

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

    return this.findById(matrixId);
  }

  /**
   * Update a task name/description
   */
  async updateTask(
    matrixId: string,
    rowOrder: number,
    taskName?: string,
    taskDescription?: string,
  ): Promise<RaciMatrix> {
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

    return this.findById(matrixId);
  }

  /**
   * Delete a task (removes all entries for that row)
   */
  async deleteTask(matrixId: string, rowOrder: number): Promise<RaciMatrix> {
    const raciMatrix = await this.findById(matrixId);

    // Delete all entries for this row
    const entriesToDelete = raciMatrix.entries.filter(e => e.rowOrder === rowOrder);

    if (entriesToDelete.length === 0) {
      throw new NotFoundException(`Task at row ${rowOrder} not found`);
    }

    await this.raciEntryRepository.remove(entriesToDelete);

    return this.findById(matrixId);
  }

  /**
   * Add a team member column to the RACI matrix
   */
  async addTeamMemberColumn(
    matrixId: string,
    addTeamMemberColumnDto: AddTeamMemberColumnDto,
  ): Promise<RaciMatrix> {
    const raciMatrix = await this.findById(matrixId);
    const { teamMemberId } = addTeamMemberColumnDto;

    // Check if team member column already exists
    const columns = raciMatrix.teamMemberColumns || [];
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
      const userId = teamMemberId.replace('user-', '');

      // Verify this user is actually associated with the project
      const isProductOwner = project.productOwner?.id === userId;
      const isPMO = project.pmo?.id === userId;
      const isScrumMaster = project.members?.some(
        m => m.user?.id === userId && m.isActive && m.role.toLowerCase().includes('scrum')
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

    return this.findById(matrixId);
  }

  /**
   * Remove a team member column
   */
  async removeTeamMemberColumn(matrixId: string, teamMemberId: string): Promise<RaciMatrix> {
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

    return this.findById(matrixId);
  }

  /**
   * Set or update RACI assignment for a task-member cell
   */
  async setRaci(matrixId: string, setRaciDto: SetRaciDto): Promise<RaciMatrix> {
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

    return this.findById(matrixId);
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
    const teamMemberIds = raciMatrix.teamMemberColumns || [];

    // Separate regular team members and special roles
    const regularTeamMemberIds = teamMemberIds.filter(id => !id.startsWith('user-'));
    const specialRoleIds = teamMemberIds.filter(id => id.startsWith('user-'));

    // Fetch regular team members
    const regularTeamMembers = regularTeamMemberIds.length > 0
      ? await this.teamMemberRepository.findByIds(regularTeamMemberIds)
      : [];

    // Fetch project with special roles
    const project = await this.projectRepository.findOne({
      where: { id: raciMatrix.project.id },
      relations: ['productOwner', 'pmo', 'members', 'members.user'],
    });

    // Build team members list including special roles
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

    return {
      id: raciMatrix.id,
      name: raciMatrix.name,
      description: raciMatrix.description,
      tasks,
      teamMembers: teamMembersList,
      raciGrid,
    };
  }
}
