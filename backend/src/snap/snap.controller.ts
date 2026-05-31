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
import { PERMISSIONS } from '../common/constants/permissions';
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
  @RequirePermissions(PERMISSIONS.SNAP_CREATE)
  create(@Body() createSnapDto: CreateSnapDto, @CurrentUser() user: User) {
    return this.snapService.create(createSnapDto, user.id, (user as any).organizationId);
  }

  /**
   * Parse snap input with AI (without saving)
   * POST /api/snaps/parse
   * Required Permission: SNAP_CREATE (SM only)
   * Returns parsed done/toDo/blockers/suggestedRAG without creating the snap
   */
  @Post('parse')
  @RequirePermissions(PERMISSIONS.SNAP_CREATE)
  parseOnly(@Body() dto: { cardId: string; rawInput: string }) {
    return this.snapService.parseOnly(dto.cardId, dto.rawInput);
  }

  /**
   * Get snap by ID
   * GET /api/snaps/:id
   * Required Permission: SNAP_VIEW_OWN or SNAP_VIEW_ALL
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.SNAP_VIEW_OWN, PERMISSIONS.SNAP_VIEW_ALL)
  findOne(@Param('id') id: string) {
    return this.snapService.findOne(id);
  }

  /**
   * Get all snaps for a card
   * GET /api/snaps/card/:cardId
   * Required Permission: SNAP_VIEW_OWN or SNAP_VIEW_ALL
   * Returns snaps in reverse chronological order (newest first)
   */
  @Get('card/:cardId')
  @RequirePermissions(PERMISSIONS.SNAP_VIEW_OWN, PERMISSIONS.SNAP_VIEW_ALL)
  findByCard(@Param('cardId') cardId: string) {
    return this.snapService.findByCard(cardId);
  }

  /**
   * Get all snaps for a sprint on a specific date
   * GET /api/snaps/sprint/:sprintId/date/:date
   * Required Permission: SNAP_VIEW_OWN or SNAP_VIEW_ALL
   * Date format: YYYY-MM-DD
   */
  @Get('sprint/:sprintId/date/:date')
  @RequirePermissions(PERMISSIONS.SNAP_VIEW_OWN, PERMISSIONS.SNAP_VIEW_ALL)
  findBySprintAndDate(
    @Param('sprintId') sprintId: string,
    @Param('date') date: string,
  ) {
    return this.snapService.findBySprintAndDate(sprintId, date);
  }

  /**
   * M8-UC02: Update Snap
   * PATCH /api/snaps/:id
   * Required Permission: SNAP_EDIT_OWN or SNAP_EDIT_ANY
   * Only today's snaps can be edited
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SNAP_EDIT_OWN, PERMISSIONS.SNAP_EDIT_ANY)
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
   * Required Permission: SNAP_DELETE_OWN or SNAP_DELETE_ANY
   * Only today's snaps can be deleted
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.SNAP_DELETE_OWN, PERMISSIONS.SNAP_DELETE_ANY)
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.snapService.remove(id, user.id);
  }

  /**
   * M8-UC04: Lock Daily Snaps
   * POST /api/snaps/lock-daily
   * Required Permission: SNAP_LOCK_DAILY (SM only)
   * Locks all snaps for a specific date and triggers summary generation
   */
  @Post('lock-daily')
  @RequirePermissions(PERMISSIONS.SNAP_LOCK_DAILY)
  lockDaily(@Body() lockDto: LockDailySnapsDto, @CurrentUser() user: User) {
    return this.snapService.lockDailySnaps(lockDto, user.id);
  }

  /**
   * M8-UC05: Get Daily Summary
   * GET /api/snaps/summary/:sprintId/:date
   * Required Permission: SNAP_VIEW_OWN or SNAP_VIEW_ALL
   * Returns the daily overall standup summary
   */
  @Get('summary/:sprintId/:date')
  @RequirePermissions(PERMISSIONS.SNAP_VIEW_OWN, PERMISSIONS.SNAP_VIEW_ALL)
  getDailySummary(
    @Param('sprintId') sprintId: string,
    @Param('date') date: string,
  ) {
    return this.snapService.getDailySummary(sprintId, date);
  }

  /**
   * Generate Daily Summary (manual trigger)
   * POST /api/snaps/generate-summary
   * Required Permission: SNAP_GENERATE_SUMMARY (SM only)
   * Usually triggered automatically after lock, but can be manually triggered
   */
  @Post('generate-summary')
  @RequirePermissions(PERMISSIONS.SNAP_GENERATE_SUMMARY)
  generateSummary(@Body() dto: { sprintId: string; date: string }) {
    return this.snapService.generateDailySummary(dto.sprintId, dto.date);
  }

  /**
   * Check if a date is locked
   * GET /api/snaps/is-locked/:sprintId/:date
   * Required Permission: SNAP_VIEW_OWN or SNAP_VIEW_ALL
   * Returns { isLocked: boolean }
   */
  @Get('is-locked/:sprintId/:date')
  @RequirePermissions(PERMISSIONS.SNAP_VIEW_OWN, PERMISSIONS.SNAP_VIEW_ALL)
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
   * Required Permission: SNAP_VIEW_OWN or SNAP_VIEW_ALL
   * Optional query params: sprintId, startDate, endDate
   */
  @Get('summaries/project/:projectId')
  @RequirePermissions(PERMISSIONS.SNAP_VIEW_OWN, PERMISSIONS.SNAP_VIEW_ALL)
  getSummariesByProject(
    @Param('projectId') projectId: string,
    @Query('sprintId') sprintId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.snapService.getSummariesByProject(projectId, sprintId, startDate, endDate);
  }
}
