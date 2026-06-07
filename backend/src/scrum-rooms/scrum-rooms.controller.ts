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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScrumRoomsService } from './scrum-rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomDataDto } from './dto/update-room-data.dto';
import { RoomType, RoomStatus } from '../entities/scrum-room.entity';

@Controller('scrum-rooms')
@UseGuards(JwtAuthGuard)
export class ScrumRoomsController {
  constructor(private readonly scrumRoomsService: ScrumRoomsService) {}

  @Post()
  async createRoom(@Body() dto: CreateRoomDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    const organizationId = req.user.organizationId;
    return this.scrumRoomsService.createRoom(dto, userId, organizationId);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('projectId') projectId?: string,
    @Query('type') type?: RoomType,
    @Query('status') status?: RoomStatus,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const organizationId = req.user.organizationId;
    return this.scrumRoomsService.findAll({
      organizationId,
      projectId,
      type,
      status,
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Request() req) {
    const organizationId = req.user.organizationId;
    return this.scrumRoomsService.findById(id, organizationId);
  }

  @Put(':id')
  async updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.scrumRoomsService.updateRoom(id, dto, userId);
  }

  @Patch(':id/data')
  async updateRoomData(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDataDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    return this.scrumRoomsService.updateRoomData(id, dto, userId);
  }

  @Patch(':id/archive')
  async archiveRoom(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.scrumRoomsService.archiveRoom(id, userId);
  }

  @Patch(':id/restore')
  async restoreRoom(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.scrumRoomsService.restoreRoom(id, userId);
  }

  @Patch(':id/complete')
  async completeRoom(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.scrumRoomsService.completeRoom(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoom(@Param('id') id: string) {
    await this.scrumRoomsService.deleteRoom(id);
  }

}
