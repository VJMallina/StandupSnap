import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';
import { ScheduleTask, TaskStatus } from '../entities/schedule-task.entity';
import { TaskDependency, DependencyType } from '../entities/task-dependency.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { User } from '../entities/user.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private tenantService: TenantService,
  ) {}

  // ==================== SCHEDULE CRUD ====================

  async create(dto: CreateScheduleDto, userId: string): Promise<Schedule> {
    const [scheduleRepo, projectRepo] = await Promise.all([
      this.tenantService.getRepository(Schedule),
      this.tenantService.getRepository(Project),
    ]);

    const project = await projectRepo.findOne({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException(`Project with ID ${dto.projectId} not found`);

    const user = await this.userRepository.findOne({ where: { id: userId } });

    const schedule = scheduleRepo.create({ ...dto, project, createdBy: user, updatedBy: user });
    return scheduleRepo.save(schedule);
  }

  async findById(id: string): Promise<Schedule> {
    const scheduleRepo = await this.tenantService.getRepository(Schedule);
    const schedule = await scheduleRepo.findOne({
      where: { id },
      relations: ['project', 'createdBy', 'updatedBy'],
    });
    if (!schedule) throw new NotFoundException(`Schedule with ID ${id} not found`);
    return schedule;
  }

  async findByProject(projectId: string, includeArchived = false): Promise<Schedule[]> {
    const scheduleRepo = await this.tenantService.getRepository(Schedule);
    const where: any = { project: { id: projectId } };
    if (!includeArchived) where.isArchived = false;

    return scheduleRepo.find({
      where,
      relations: ['project', 'createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateScheduleDto, userId: string): Promise<Schedule> {
    const scheduleRepo = await this.tenantService.getRepository(Schedule);
    const schedule = await this.findById(id);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    Object.assign(schedule, dto);
    schedule.updatedBy = user;

    return scheduleRepo.save(schedule);
  }

  async archive(id: string, userId: string): Promise<Schedule> {
    const scheduleRepo = await this.tenantService.getRepository(Schedule);
    const schedule = await this.findById(id);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    schedule.isArchived = true;
    schedule.updatedBy = user;

    return scheduleRepo.save(schedule);
  }

  async delete(id: string): Promise<void> {
    const scheduleRepo = await this.tenantService.getRepository(Schedule);
    const schedule = await this.findById(id);
    await scheduleRepo.remove(schedule);
  }

  // ==================== TASK CRUD ====================

  async createTask(scheduleId: string, dto: CreateTaskDto, userId?: string): Promise<ScheduleTask> {
    const [taskRepo, teamMemberRepo] = await Promise.all([
      this.tenantService.getRepository(ScheduleTask),
      this.tenantService.getRepository(TeamMember),
    ]);

    const schedule = await this.findById(scheduleId);

    let parentTask: ScheduleTask | null = null;
    if (dto.parentTaskId) {
      parentTask = await taskRepo.findOne({ where: { id: dto.parentTaskId }, relations: ['schedule'] });
      if (!parentTask) throw new NotFoundException(`Parent task with ID ${dto.parentTaskId} not found`);
      if (parentTask.schedule.id !== scheduleId) throw new BadRequestException('Parent task must belong to the same schedule');
    }

    let assignee: TeamMember | null = null;
    if (dto.assigneeId) {
      assignee = await teamMemberRepo.findOne({ where: { id: dto.assigneeId } });
      if (!assignee) throw new NotFoundException(`Team member with ID ${dto.assigneeId} not found`);
    }

    const wbsCode = this.generateWbsCode(parentTask, dto.orderIndex);
    const level = this.calculateLevel(parentTask);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) throw new BadRequestException('End date must be greater than or equal to start date');
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const isMilestone = dto.isMilestone || false;

    const task = taskRepo.create({
      ...dto,
      schedule,
      parentTask,
      assignee,
      wbsCode,
      level,
      durationDays: isMilestone ? 0 : durationDays,
      status: dto.status || TaskStatus.NOT_STARTED,
      progress: dto.progress || 0,
      isMilestone,
    });

    const savedTask = await taskRepo.save(task);
    if (parentTask) await this.rollupParentDates(parentTask);

    return this.findTaskById(savedTask.id);
  }

  async findTaskById(taskId: string): Promise<ScheduleTask> {
    const taskRepo = await this.tenantService.getRepository(ScheduleTask);
    const task = await taskRepo.findOne({
      where: { id: taskId },
      relations: ['schedule', 'parentTask', 'children', 'assignee', 'predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
    });
    if (!task) throw new NotFoundException(`Task with ID ${taskId} not found`);
    return task;
  }

  async getScheduleTasks(scheduleId: string): Promise<ScheduleTask[]> {
    const taskRepo = await this.tenantService.getRepository(ScheduleTask);
    await this.findById(scheduleId);

    return taskRepo.find({
      where: { schedule: { id: scheduleId } },
      relations: ['parentTask', 'children', 'assignee', 'predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
      order: { wbsCode: 'ASC' },
    });
  }

  async updateTask(taskId: string, dto: UpdateTaskDto, userId?: string): Promise<ScheduleTask> {
    const [taskRepo, teamMemberRepo] = await Promise.all([
      this.tenantService.getRepository(ScheduleTask),
      this.tenantService.getRepository(TeamMember),
    ]);

    const task = await this.findTaskById(taskId);

    if (dto.parentTaskId !== undefined) {
      if (dto.parentTaskId) {
        const newParent = await this.findTaskById(dto.parentTaskId);
        if (await this.wouldCreateCircularHierarchy(taskId, dto.parentTaskId)) {
          throw new BadRequestException('Cannot set parent task: would create circular hierarchy');
        }
        task.parentTask = newParent;
        task.wbsCode = this.generateWbsCode(newParent, dto.orderIndex || task.orderIndex);
        task.level = this.calculateLevel(newParent);
      } else {
        task.parentTask = null;
        task.wbsCode = this.generateWbsCode(null, dto.orderIndex || task.orderIndex);
        task.level = 0;
      }
    }

    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId) {
        const assignee = await teamMemberRepo.findOne({ where: { id: dto.assigneeId } });
        if (!assignee) throw new NotFoundException(`Team member with ID ${dto.assigneeId} not found`);
        task.assignee = assignee;
      } else {
        task.assignee = null;
      }
    }

    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : task.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : task.endDate;
      if (endDate < startDate) throw new BadRequestException('End date must be greater than or equal to start date');
      task.startDate = startDate;
      task.endDate = endDate;
      task.durationDays = task.isMilestone ? 0 : Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.progress !== undefined) task.progress = dto.progress;
    if (dto.estimatedHours !== undefined) task.estimatedHours = dto.estimatedHours;
    if (dto.notes !== undefined) task.notes = dto.notes;
    if (dto.isMilestone !== undefined) {
      task.isMilestone = dto.isMilestone;
      if (dto.isMilestone) task.durationDays = 0;
    }

    const savedTask = await taskRepo.save(task);

    if (task.parentTask) await this.rollupParentDates(task.parentTask);
    if (dto.orderIndex !== undefined || dto.parentTaskId !== undefined) await this.updateChildWbsCodes(task);

    return this.findTaskById(savedTask.id);
  }

  async deleteTask(taskId: string): Promise<void> {
    const taskRepo = await this.tenantService.getRepository(ScheduleTask);
    const task = await this.findTaskById(taskId);
    const parentTask = task.parentTask;

    await taskRepo.remove(task);
    if (parentTask) await this.rollupParentDates(parentTask);
  }

  // ==================== WBS MANAGEMENT ====================

  private generateWbsCode(parentTask: ScheduleTask | null, orderIndex: number): string {
    if (!parentTask) return `${orderIndex}`;
    return `${parentTask.wbsCode}.${orderIndex}`;
  }

  private calculateLevel(parentTask: ScheduleTask | null): number {
    if (!parentTask) return 0;
    return parentTask.level + 1;
  }

  private async updateChildWbsCodes(parentTask: ScheduleTask): Promise<void> {
    const taskRepo = await this.tenantService.getRepository(ScheduleTask);
    const children = await taskRepo.find({
      where: { parentTask: { id: parentTask.id } },
      relations: ['children'],
      order: { orderIndex: 'ASC' },
    });

    for (const child of children) {
      child.wbsCode = this.generateWbsCode(parentTask, child.orderIndex);
      child.level = this.calculateLevel(parentTask);
      await taskRepo.save(child);
      if (child.children && child.children.length > 0) await this.updateChildWbsCodes(child);
    }
  }

  private async rollupParentDates(parentTask: ScheduleTask): Promise<void> {
    const taskRepo = await this.tenantService.getRepository(ScheduleTask);
    const children = await taskRepo.find({ where: { parentTask: { id: parentTask.id } } });
    if (children.length === 0) return;

    const startDates = children.map(c => new Date(c.startDate).getTime());
    const endDates = children.map(c => new Date(c.endDate).getTime());
    const minStart = new Date(Math.min(...startDates));
    const maxEnd = new Date(Math.max(...endDates));

    parentTask.startDate = minStart;
    parentTask.endDate = maxEnd;
    parentTask.durationDays = Math.ceil((maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    await taskRepo.save(parentTask);

    if (parentTask.parentTask) {
      const grandparent = await taskRepo.findOne({ where: { id: parentTask.parentTask.id }, relations: ['parentTask'] });
      if (grandparent) await this.rollupParentDates(grandparent);
    }
  }

  private async wouldCreateCircularHierarchy(taskId: string, newParentId: string): Promise<boolean> {
    const taskRepo = await this.tenantService.getRepository(ScheduleTask);
    let currentParentId: string | null = newParentId;

    while (currentParentId) {
      if (currentParentId === taskId) return true;
      const currentParent = await taskRepo.findOne({ where: { id: currentParentId }, relations: ['parentTask'] });
      currentParentId = currentParent?.parentTask?.id || null;
    }

    return false;
  }

  // ==================== DEPENDENCY MANAGEMENT ====================

  async addDependency(dto: CreateDependencyDto): Promise<TaskDependency> {
    const dependencyRepo = await this.tenantService.getRepository(TaskDependency);
    const predecessorTask = await this.findTaskById(dto.predecessorTaskId);
    const successorTask = await this.findTaskById(dto.successorTaskId);

    if (predecessorTask.schedule.id !== successorTask.schedule.id) {
      throw new BadRequestException('Tasks must belong to the same schedule');
    }
    if (dto.predecessorTaskId === dto.successorTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    const existing = await dependencyRepo.findOne({
      where: { predecessorTask: { id: dto.predecessorTaskId }, successorTask: { id: dto.successorTaskId } },
    });
    if (existing) throw new BadRequestException('This dependency already exists');

    await this.validateNoCyclicDependency(dto.predecessorTaskId, dto.successorTaskId);

    const dependency = dependencyRepo.create({
      predecessorTask,
      successorTask,
      dependencyType: dto.dependencyType,
      lagDays: dto.lagDays || 0,
    });

    return dependencyRepo.save(dependency);
  }

  async getDependencies(taskId: string): Promise<TaskDependency[]> {
    const dependencyRepo = await this.tenantService.getRepository(TaskDependency);
    await this.findTaskById(taskId);

    return dependencyRepo.find({
      where: [
        { predecessorTask: { id: taskId } },
        { successorTask: { id: taskId } },
      ],
      relations: ['predecessorTask', 'successorTask'],
    });
  }

  async deleteDependency(dependencyId: string): Promise<void> {
    const dependencyRepo = await this.tenantService.getRepository(TaskDependency);
    const dependency = await dependencyRepo.findOne({ where: { id: dependencyId } });
    if (!dependency) throw new NotFoundException(`Dependency with ID ${dependencyId} not found`);
    await dependencyRepo.remove(dependency);
  }

  private async validateNoCyclicDependency(predecessorId: string, successorId: string): Promise<void> {
    const dependencyRepo = await this.tenantService.getRepository(TaskDependency);
    const visited = new Set<string>();
    const stack: string[] = [successorId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (visited.has(currentId)) continue;
      if (currentId === predecessorId) throw new BadRequestException('Adding this dependency would create a circular dependency');

      visited.add(currentId);

      const successors = await dependencyRepo.find({
        where: { predecessorTask: { id: currentId } },
        relations: ['successorTask'],
      });

      for (const dep of successors) {
        if (!visited.has(dep.successorTask.id)) stack.push(dep.successorTask.id);
      }
    }
  }
}
