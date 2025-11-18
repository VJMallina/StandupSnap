import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AssigneeService,
  AssigneeListItem,
  AssigneeDetails,
  SnapsByDate
} from './assignee.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../entities/role.entity';

@Controller('assignees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssigneeController {
  constructor(private readonly assigneeService: AssigneeService) {}

  /**
   * M10-UC01: View All Assignees (Team Members List)
   * GET /api/assignees?projectId=xxx&sprintId=xxx
   * Shows all team members with aggregated stats
   */
  @Get()
  @RequirePermissions(Permission.VIEW_TEAM_MEMBER)
  getAssigneeList(
    @Query('projectId') projectId?: string,
    @Query('sprintId') sprintId?: string,
  ): Promise<AssigneeListItem[]> {
    return this.assigneeService.getAssigneeList(projectId, sprintId);
  }

  /**
   * M10-UC02: View Assignee Details
   * GET /api/assignees/:id?sprintId=xxx
   * Returns assignee details with cards and RAG
   */
  @Get(':id')
  @RequirePermissions(Permission.VIEW_TEAM_MEMBER)
  getAssigneeDetails(
    @Param('id') assigneeId: string,
    @Query('sprintId') sprintId?: string,
  ): Promise<AssigneeDetails> {
    return this.assigneeService.getAssigneeDetails(assigneeId, sprintId);
  }

  /**
   * M10-UC04: Get Assignee's Cards (with filtering)
   * GET /api/assignees/:id/cards?sprintId=xxx&status=xxx&rag=xxx&search=xxx
   */
  @Get(':id/cards')
  @RequirePermissions(Permission.VIEW_CARD)
  getAssigneeCards(
    @Param('id') assigneeId: string,
    @Query('sprintId') sprintId?: string,
    @Query('status') status?: string,
    @Query('rag') rag?: string,
    @Query('search') search?: string,
  ): Promise<any[]> {
    return this.assigneeService.getAssigneeCards(
      assigneeId,
      sprintId,
      status,
      rag,
      search,
    );
  }

  /**
   * M10-UC03: View Assignee's Snap History (Daily Grouped)
   * GET /api/assignees/:id/snaps?sprintId=xxx
   * Returns snaps grouped by date (today, yesterday, older)
   */
  @Get(':id/snaps')
  @RequirePermissions(Permission.VIEW_SNAP)
  getAssigneeSnaps(
    @Param('id') assigneeId: string,
    @Query('sprintId') sprintId?: string,
  ): Promise<SnapsByDate[]> {
    return this.assigneeService.getAssigneeSnapHistory(assigneeId, sprintId);
  }
}
