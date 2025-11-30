import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RaciMatrixService } from './raci-matrix.service';
import { CreateRaciMatrixDto } from './dto/create-raci-matrix.dto';
import { AddTaskDto } from './dto/add-task.dto';
import { AddTeamMemberColumnDto } from './dto/add-team-member-column.dto';
import { SetRaciDto } from './dto/set-raci.dto';
import { SetApprovedByDto } from './dto/set-approved-by.dto';

@Controller('artifacts/raci-matrix')
@UseGuards(JwtAuthGuard)
export class RaciMatrixController {
  constructor(private readonly raciMatrixService: RaciMatrixService) {}

  /**
   * Create a new RACI matrix
   * POST /artifacts/raci-matrix
   */
  @Post()
  async create(@Body() createRaciMatrixDto: CreateRaciMatrixDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.raciMatrixService.create(createRaciMatrixDto, userId);
  }

  /**
   * Get all RACI matrices for a project
   * GET /artifacts/raci-matrix/project/:projectId
   */
  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.raciMatrixService.findByProject(projectId);
  }

  /**
   * Get RACI matrix by ID with formatted data
   * GET /artifacts/raci-matrix/:id
   */
  @Get(':id')
  async getFormattedMatrix(@Param('id') id: string) {
    return this.raciMatrixService.getFormattedMatrix(id);
  }

  /**
   * Add a task (row) to the RACI matrix
   * POST /artifacts/raci-matrix/:id/task
   */
  @Post(':id/task')
  async addTask(
    @Param('id') matrixId: string,
    @Body() addTaskDto: AddTaskDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.raciMatrixService.addTask(matrixId, addTaskDto, userId);
  }

  /**
   * Update a task
   * PUT /artifacts/raci-matrix/:id/task/:rowOrder
   */
  @Put(':id/task/:rowOrder')
  async updateTask(
    @Param('id') matrixId: string,
    @Param('rowOrder') rowOrder: string,
    @Body() updateDto: { taskName?: string; taskDescription?: string },
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.raciMatrixService.updateTask(
      matrixId,
      parseInt(rowOrder, 10),
      updateDto.taskName,
      updateDto.taskDescription,
      userId,
    );
  }

  /**
   * Delete a task (row)
   * DELETE /artifacts/raci-matrix/:id/task/:rowOrder
   */
  @Delete(':id/task/:rowOrder')
  async deleteTask(
    @Param('id') matrixId: string,
    @Param('rowOrder') rowOrder: string,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.raciMatrixService.deleteTask(matrixId, parseInt(rowOrder, 10), userId);
  }

  /**
   * Add a team member column
   * POST /artifacts/raci-matrix/:id/team-member
   */
  @Post(':id/team-member')
  async addTeamMemberColumn(
    @Param('id') matrixId: string,
    @Body() addTeamMemberColumnDto: AddTeamMemberColumnDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.raciMatrixService.addTeamMemberColumn(
      matrixId,
      addTeamMemberColumnDto,
      userId,
    );
  }

  /**
   * Remove a team member column
   * DELETE /artifacts/raci-matrix/:id/team-member/:teamMemberId
   */
  @Delete(':id/team-member/:teamMemberId')
  async removeTeamMemberColumn(
    @Param('id') matrixId: string,
    @Param('teamMemberId') teamMemberId: string,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.raciMatrixService.removeTeamMemberColumn(matrixId, teamMemberId, userId);
  }

  /**
   * Set or update RACI assignment
   * PUT /artifacts/raci-matrix/:id/raci
   */
  @Put(':id/raci')
  async setRaci(
    @Param('id') matrixId: string,
    @Body() setRaciDto: SetRaciDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.raciMatrixService.setRaci(matrixId, setRaciDto, userId);
  }

  /**
   * Set approved by user (must be PO/PMO/Scrum Master)
   * PUT /artifacts/raci-matrix/:id/approved-by
   */
  @Put(':id/approved-by')
  async setApprovedBy(
    @Param('id') matrixId: string,
    @Body() setApprovedByDto: SetApprovedByDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.raciMatrixService.setApprovedBy(matrixId, setApprovedByDto.approverId, userId);
  }

  /**
   * Delete a RACI matrix
   * DELETE /artifacts/raci-matrix/:id
   */
  @Delete(':id')
  async delete(@Param('id') matrixId: string) {
    await this.raciMatrixService.delete(matrixId);
    return { message: 'RACI matrix deleted successfully' };
  }
}
