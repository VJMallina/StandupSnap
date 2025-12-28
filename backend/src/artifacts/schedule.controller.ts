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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScheduleService } from './schedule.service';
import { CriticalPathService } from './critical-path.service';
import { AutoScheduleService } from './auto-schedule.service';
import { CalendarService } from './calendar.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { CreateCalendarExceptionDto } from './dto/create-calendar-exception.dto';
import { UpdateCalendarExceptionDto } from './dto/update-calendar-exception.dto';

@Controller('artifacts/schedules')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly criticalPathService: CriticalPathService,
    private readonly autoScheduleService: AutoScheduleService,
    private readonly calendarService: CalendarService,
  ) {}

  // ==================== SCHEDULE ENDPOINTS ====================

  @Post()
  async createSchedule(@Body() dto: CreateScheduleDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.scheduleService.create(dto, userId);
  }

  @Get('project/:projectId')
  async getProjectSchedules(
    @Param('projectId') projectId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.scheduleService.findByProject(
      projectId,
      includeArchived === 'true',
    );
  }

  @Get(':id')
  async getSchedule(@Param('id') id: string) {
    return this.scheduleService.findById(id);
  }

  @Put(':id')
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.scheduleService.update(id, dto, userId);
  }

  @Patch(':id/archive')
  async archiveSchedule(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.scheduleService.archive(id, userId);
  }

  @Delete(':id')
  async deleteSchedule(@Param('id') id: string) {
    await this.scheduleService.delete(id);
    return { message: 'Schedule deleted successfully' };
  }

  // ==================== TASK ENDPOINTS ====================

  @Post(':id/tasks')
  async createTask(
    @Param('id') scheduleId: string,
    @Body() dto: CreateTaskDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.scheduleService.createTask(scheduleId, dto, userId);
  }

  @Get(':id/tasks')
  async getScheduleTasks(@Param('id') scheduleId: string) {
    return this.scheduleService.getScheduleTasks(scheduleId);
  }

  @Get('tasks/:taskId')
  async getTask(@Param('taskId') taskId: string) {
    return this.scheduleService.findTaskById(taskId);
  }

  @Put('tasks/:taskId')
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.scheduleService.updateTask(taskId, dto, userId);
  }

  @Delete('tasks/:taskId')
  async deleteTask(@Param('taskId') taskId: string) {
    await this.scheduleService.deleteTask(taskId);
    return { message: 'Task deleted successfully' };
  }

  // ==================== DEPENDENCY ENDPOINTS ====================

  @Post('tasks/:taskId/dependencies')
  async addDependency(
    @Param('taskId') taskId: string,
    @Body() dto: CreateDependencyDto,
  ) {
    return this.scheduleService.addDependency(dto);
  }

  @Get('tasks/:taskId/dependencies')
  async getTaskDependencies(@Param('taskId') taskId: string) {
    return this.scheduleService.getDependencies(taskId);
  }

  @Delete('dependencies/:dependencyId')
  async deleteDependency(@Param('dependencyId') dependencyId: string) {
    await this.scheduleService.deleteDependency(dependencyId);
    return { message: 'Dependency deleted successfully' };
  }

  // ==================== CRITICAL PATH ENDPOINTS ====================

  @Post(':id/calculate-critical-path')
  async calculateCriticalPath(@Param('id') id: string) {
    await this.criticalPathService.recalculateSchedule(id);
    return { message: 'Critical path calculated successfully' };
  }

  @Get(':id/critical-path-tasks')
  async getCriticalPathTasks(@Param('id') id: string) {
    return this.criticalPathService.getCriticalPathTasks(id);
  }

  // ==================== AUTO-SCHEDULE ENDPOINTS ====================

  @Post(':id/auto-schedule')
  async autoScheduleAll(@Param('id') id: string) {
    await this.autoScheduleService.autoScheduleAll(id);
    return { message: 'Schedule auto-scheduled successfully' };
  }

  @Post('tasks/:taskId/auto-schedule')
  async autoScheduleTask(@Param('taskId') taskId: string) {
    await this.autoScheduleService.autoScheduleTask(taskId);
    return { message: 'Task and successors auto-scheduled successfully' };
  }

  // ==================== CALENDAR ENDPOINTS ====================

  @Post('calendars')
  async createCalendar(@Body() dto: CreateCalendarDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.calendarService.createCalendar(dto.projectId, dto, userId);
  }

  @Get('project/:projectId/calendars')
  async getProjectCalendars(@Param('projectId') projectId: string) {
    return this.calendarService.getCalendarsByProject(projectId);
  }

  @Get('calendars/:calendarId')
  async getCalendar(@Param('calendarId') calendarId: string) {
    return this.calendarService.getCalendarById(calendarId);
  }

  @Put('calendars/:calendarId')
  async updateCalendar(
    @Param('calendarId') calendarId: string,
    @Body() dto: UpdateCalendarDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.calendarService.updateCalendar(calendarId, dto, userId);
  }

  @Delete('calendars/:calendarId')
  async deleteCalendar(@Param('calendarId') calendarId: string) {
    await this.calendarService.deleteCalendar(calendarId);
    return { message: 'Calendar deleted successfully' };
  }

  @Post('calendars/:calendarId/default')
  async createDefaultCalendar(
    @Param('calendarId') projectId: string,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.calendarService.createDefaultCalendar(projectId, userId);
  }

  // ==================== CALENDAR EXCEPTION ENDPOINTS ====================

  @Post('calendars/exceptions')
  async addCalendarException(
    @Body() dto: CreateCalendarExceptionDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.calendarService.addException(
      dto.calendarId,
      {
        date: new Date(dto.date),
        type: dto.type,
        name: dto.name,
        description: dto.description,
        isRecurring: dto.isRecurring,
        workingHours: dto.workingHours,
      },
      userId,
    );
  }

  @Get('calendars/:calendarId/exceptions')
  async getCalendarExceptions(@Param('calendarId') calendarId: string) {
    return this.calendarService.getExceptions(calendarId);
  }

  @Put('calendars/exceptions/:exceptionId')
  async updateCalendarException(
    @Param('exceptionId') exceptionId: string,
    @Body() dto: UpdateCalendarExceptionDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    const updateData: any = {};
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.type) updateData.type = dto.type;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.workingHours !== undefined) updateData.workingHours = dto.workingHours;
    return this.calendarService.updateException(exceptionId, updateData, userId);
  }

  @Delete('calendars/exceptions/:exceptionId')
  async deleteCalendarException(@Param('exceptionId') exceptionId: string) {
    await this.calendarService.deleteException(exceptionId);
    return { message: 'Calendar exception deleted successfully' };
  }
}
