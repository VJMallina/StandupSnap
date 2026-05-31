import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowService } from './workflow.service';
import { LaneType } from '../entities/workflow-lane.entity';
import { TransitionMode } from '../entities/workflow-template.entity';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * GET /workflows/project/:projectId
   * All workflows for a project (with lanes)
   */
  @Get('project/:projectId')
  getProjectWorkflows(@Param('projectId') projectId: string) {
    return this.workflowService.getProjectWorkflows(projectId);
  }

  /**
   * GET /workflows/project/:projectId/default
   * Default workflow with ordered lanes
   */
  @Get('project/:projectId/default')
  getDefaultWorkflow(@Param('projectId') projectId: string) {
    return this.workflowService.getDefaultWorkflow(projectId);
  }

  /**
   * GET /workflows/:id
   * Single workflow with lanes
   */
  @Get(':id')
  getWorkflow(@Param('id') id: string) {
    return this.workflowService.getWorkflowWithLanes(id);
  }

  /**
   * POST /workflows/:id/lanes
   * Add a lane to a workflow
   */
  @Post(':id/lanes')
  addLane(
    @Param('id') id: string,
    @Body()
    dto: {
      name: string;
      order: number;
      color?: string;
      laneType: LaneType;
      isFinalLane?: boolean;
    },
  ) {
    return this.workflowService.addLane(id, dto);
  }

  /**
   * PATCH /workflows/lanes/:laneId
   * Update a lane
   */
  @Patch('lanes/:laneId')
  updateLane(
    @Param('laneId') laneId: string,
    @Body()
    dto: {
      name?: string;
      color?: string;
      laneType?: LaneType;
      isFinalLane?: boolean;
      order?: number;
    },
  ) {
    return this.workflowService.updateLane(laneId, dto);
  }

  /**
   * PATCH /workflows/:id/lanes/reorder
   * Reorder lanes — body: { laneIds: string[] }
   */
  @Patch(':id/lanes/reorder')
  reorderLanes(
    @Param('id') id: string,
    @Body() dto: { laneOrders: { laneId: string; order: number }[] },
  ) {
    return this.workflowService.reorderLanes(id, dto.laneOrders);
  }

  /**
   * DELETE /workflows/lanes/:laneId
   * Delete a lane (cards moved to first TODO lane)
   */
  @Delete('lanes/:laneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLane(@Param('laneId') laneId: string) {
    return this.workflowService.deleteLane(laneId);
  }

  /**
   * PATCH /workflows/:id
   * Update workflow-level settings (transitionMode)
   * Must be declared after more-specific PATCH routes to avoid shadowing them.
   */
  @Patch(':id')
  updateWorkflow(
    @Param('id') id: string,
    @Body() dto: { transitionMode?: TransitionMode },
  ) {
    return this.workflowService.updateWorkflow(id, dto);
  }
}
