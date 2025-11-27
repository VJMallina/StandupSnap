import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../entities/role.entity';
import { StandupBookService } from './standup-book.service';
import { MomService } from './mom.service';
import { DailyLockService } from './daily-lock.service';
import { CreateMomDto } from './dto/create-mom.dto';
import { UpdateMomDto } from './dto/update-mom.dto';
import { GenerateMomDto } from './dto/generate-mom.dto';
import { LockDayDto } from './dto/lock-day.dto';
import { Response } from 'express';

@Controller('standup-book')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StandupBookController {
  constructor(
    private readonly standupBookService: StandupBookService,
    private readonly momService: MomService,
    private readonly dailyLockService: DailyLockService,
  ) {}

  /**
   * SB-UC01: Get active sprint for project
   */
  @Get('active-sprint/:projectId')
  @RequirePermissions(Permission.VIEW_SPRINT)
  getActiveSprint(@Param('projectId') projectId: string) {
    return this.standupBookService.getActiveSprint(projectId);
  }

  /**
   * SB-UC02: Get all sprint days
   */
  @Get('sprint-days/:sprintId')
  @RequirePermissions(Permission.VIEW_SPRINT)
  getSprintDays(@Param('sprintId') sprintId: string) {
    return this.standupBookService.getSprintDays(sprintId);
  }

  /**
   * SB-UC03: Get day metadata
   */
  @Get('day-metadata/:sprintId')
  @RequirePermissions(Permission.VIEW_SPRINT)
  getDayMetadata(
    @Param('sprintId') sprintId: string,
    @Query('date') date: string,
  ) {
    return this.standupBookService.getDayMetadata(sprintId, date);
  }

  /**
   * SB-UC04 & SB-UC05: Get snaps for a day
   */
  @Get('snaps/:sprintId')
  @RequirePermissions(Permission.VIEW_SPRINT)
  getSnapsForDay(
    @Param('sprintId') sprintId: string,
    @Query('date') date: string,
  ) {
    return this.standupBookService.getSnapsForDay(sprintId, date);
  }

  /**
   * SB-UC08 & SB-UC09: Get snaps grouped by slots
   */
  @Get('snaps-by-slots/:sprintId')
  @RequirePermissions(Permission.VIEW_SPRINT)
  getSnapsGroupedBySlots(
    @Param('sprintId') sprintId: string,
    @Query('date') date: string,
  ) {
    return this.standupBookService.getSnapsGroupedBySlots(sprintId, date);
  }

  /**
   * Lock a day and generate summary
   */
  @Post('lock-day')
  @RequirePermissions(Permission.EDIT_SPRINT)
  lockDay(@Body() lockDayDto: LockDayDto, @Req() req: any) {
    return this.dailyLockService.lockDay(lockDayDto, req.user.userId);
  }

  /**
   * Get daily lock status
   */
  @Get('daily-lock/:sprintId')
  @RequirePermissions(Permission.VIEW_SPRINT)
  getDailyLock(
    @Param('sprintId') sprintId: string,
    @Query('date') date: string,
  ) {
    return this.dailyLockService.getDailyLock(sprintId, date);
  }

  /**
   * SB-UC10: Create MOM
   */
  @Post('mom')
  @RequirePermissions(Permission.EDIT_SPRINT)
  createMom(@Body() createMomDto: CreateMomDto, @Req() req: any) {
    return this.momService.create(createMomDto, req.user.userId);
  }

  /**
   * SB-UC11: Update MOM
   */
  @Put('mom/:id')
  @RequirePermissions(Permission.EDIT_SPRINT)
  updateMom(
    @Param('id') id: string,
    @Body() updateMomDto: UpdateMomDto,
    @Req() req: any,
  ) {
    return this.momService.update(id, updateMomDto, req.user.userId);
  }

  /**
   * Get MOM for a specific day
   */
  @Get('mom/:sprintId')
  @RequirePermissions(Permission.VIEW_SPRINT)
  getMomByDate(
    @Param('sprintId') sprintId: string,
    @Query('date') date: string,
  ) {
    return this.momService.findBySprintAndDate(sprintId, date);
  }

  /**
   * Get all MOMs for a sprint
   */
  @Get('moms/:sprintId')
  @RequirePermissions(Permission.VIEW_SPRINT)
  getAllMoms(@Param('sprintId') sprintId: string) {
    return this.momService.findAllBySprint(sprintId);
  }

  /**
   * Delete MOM
   */
  @Delete('mom/:id')
  @RequirePermissions(Permission.EDIT_SPRINT)
  deleteMom(@Param('id') id: string) {
    return this.momService.remove(id);
  }

  /**
   * Generate MOM using AI
   */
  @Post('mom/generate')
  @RequirePermissions(Permission.EDIT_SPRINT)
  generateMom(@Body() generateMomDto: GenerateMomDto) {
    return this.momService.generateMomWithAI(generateMomDto);
  }

  /**
   * SB-UC12: Download MOM
   */
  @Get('mom/:id/download')
  @RequirePermissions(Permission.VIEW_SPRINT)
  async downloadMom(
    @Param('id') id: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const mom = await this.momService.findById(id);

    if (!mom) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'MOM not found' });
    }

    const formattedDate = new Date(mom.date).toISOString().split('T')[0];

    const content = `
Sprint MOM
Date: ${formattedDate}

Agenda:
${mom.agenda || 'N/A'}

Key Discussion Points:
${mom.keyDiscussionPoints || 'N/A'}

Decisions Taken:
${mom.decisionsTaken || 'N/A'}

Action Items:
${mom.actionItems || 'N/A'}
    `.trim();

    const fileName = `MOM_${formattedDate}.txt`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(content);
  }
}
