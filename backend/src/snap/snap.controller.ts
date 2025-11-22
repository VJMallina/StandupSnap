import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SnapService } from './snap.service';
import { CreateSnapDto } from './dto/create-snap.dto';
import { UpdateSnapDto } from './dto/update-snap.dto';
import { LockDailySnapsDto } from './dto/lock-daily-snaps.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '../entities/role.entity';
import { User } from '../entities/user.entity';

@Controller('snaps')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SnapController {
  constructor(private readonly snapService: SnapService) {}

  /**
   * M8-UC01: Create Snap
   * POST /api/snaps
   * Required Permission: CREATE_SNAP (SM only)
   */
  @Post()
  @RequirePermissions(Permission.CREATE_SNAP)
  create(@Body() createSnapDto: CreateSnapDto, @CurrentUser() user: User) {
    return this.snapService.create(createSnapDto, user.id);
  }

  /**
   * Parse snap input with AI (without saving)
   * POST /api/snaps/parse
   * Required Permission: CREATE_SNAP (SM only)
   * Returns parsed done/toDo/blockers/suggestedRAG without creating the snap
   */
  @Post('parse')
  @RequirePermissions(Permission.CREATE_SNAP)
  parseOnly(@Body() dto: { cardId: string; rawInput: string }) {
    return this.snapService.parseOnly(dto.cardId, dto.rawInput);
  }

  /**
   * Get snap by ID
   * GET /api/snaps/:id
   * Required Permission: VIEW_SNAP
   */
  @Get(':id')
  @RequirePermissions(Permission.VIEW_SNAP)
  findOne(@Param('id') id: string) {
    return this.snapService.findOne(id);
  }

  /**
   * Get all snaps for a card
   * GET /api/snaps/card/:cardId
   * Required Permission: VIEW_SNAP
   * Returns snaps in reverse chronological order (newest first)
   */
  @Get('card/:cardId')
  @RequirePermissions(Permission.VIEW_SNAP)
  findByCard(@Param('cardId') cardId: string) {
    return this.snapService.findByCard(cardId);
  }

  /**
   * Get all snaps for a sprint on a specific date
   * GET /api/snaps/sprint/:sprintId/date/:date
   * Required Permission: VIEW_SNAP
   * Date format: YYYY-MM-DD
   */
  @Get('sprint/:sprintId/date/:date')
  @RequirePermissions(Permission.VIEW_SNAP)
  findBySprintAndDate(
    @Param('sprintId') sprintId: string,
    @Param('date') date: string,
  ) {
    return this.snapService.findBySprintAndDate(sprintId, date);
  }

  /**
   * M8-UC02: Update Snap
   * PATCH /api/snaps/:id
   * Required Permission: EDIT_OWN_SNAP or EDIT_ANY_SNAP
   * Only today's snaps can be edited
   */
  @Patch(':id')
  @RequirePermissions(Permission.EDIT_OWN_SNAP, Permission.EDIT_ANY_SNAP)
  update(
    @Param('id') id: string,
    @Body() updateSnapDto: UpdateSnapDto,
    @CurrentUser() user: User,
  ) {
    return this.snapService.update(id, updateSnapDto, user.id);
  }

  /**
   * M8-UC03: Delete Snap
   * DELETE /api/snaps/:id
   * Required Permission: DELETE_OWN_SNAP or DELETE_ANY_SNAP
   * Only today's snaps can be deleted
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.DELETE_OWN_SNAP, Permission.DELETE_ANY_SNAP)
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.snapService.remove(id, user.id);
  }

  /**
   * M8-UC04: Lock Daily Snaps
   * POST /api/snaps/lock-daily
   * Required Permission: LOCK_DAILY_SNAPS (SM only)
   * Locks all snaps for a specific date and triggers summary generation
   */
  @Post('lock-daily')
  @RequirePermissions(Permission.LOCK_DAILY_SNAPS)
  lockDaily(@Body() lockDto: LockDailySnapsDto, @CurrentUser() user: User) {
    return this.snapService.lockDailySnaps(lockDto, user.id);
  }

  /**
   * M8-UC05: Get Daily Summary
   * GET /api/snaps/summary/:sprintId/:date
   * Required Permission: VIEW_SNAP
   * Returns the daily overall standup summary
   */
  @Get('summary/:sprintId/:date')
  @RequirePermissions(Permission.VIEW_SNAP)
  getDailySummary(
    @Param('sprintId') sprintId: string,
    @Param('date') date: string,
  ) {
    return this.snapService.getDailySummary(sprintId, date);
  }

  /**
   * Generate Daily Summary (manual trigger)
   * POST /api/snaps/generate-summary
   * Required Permission: GENERATE_SUMMARY (SM only)
   * Usually triggered automatically after lock, but can be manually triggered
   */
  @Post('generate-summary')
  @RequirePermissions(Permission.GENERATE_SUMMARY)
  generateSummary(@Body() dto: { sprintId: string; date: string }) {
    return this.snapService.generateDailySummary(dto.sprintId, dto.date);
  }

  /**
   * Check if a date is locked
   * GET /api/snaps/is-locked/:sprintId/:date
   * Required Permission: VIEW_SNAP
   * Returns { isLocked: boolean }
   */
  @Get('is-locked/:sprintId/:date')
  @RequirePermissions(Permission.VIEW_SNAP)
  async isDayLocked(
    @Param('sprintId') sprintId: string,
    @Param('date') date: string,
  ) {
    const isLocked = await this.snapService.isDayLocked(sprintId, date);
    return { isLocked };
  }

  /**
   * Get all summaries for a project
   * GET /api/snaps/summaries/project/:projectId
   * Required Permission: VIEW_SNAP
   * Optional query params: sprintId, startDate, endDate
   */
  @Get('summaries/project/:projectId')
  @RequirePermissions(Permission.VIEW_SNAP)
  getSummariesByProject(
    @Param('projectId') projectId: string,
    @Query('sprintId') sprintId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.snapService.getSummariesByProject(projectId, sprintId, startDate, endDate);
  }
}
