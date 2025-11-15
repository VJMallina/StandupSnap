import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CardService } from './card.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../entities/role.entity';
import { CardRAG, CardStatus, CardPriority } from '../entities/card.entity';

@Controller('cards')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CardController {
  constructor(private readonly cardService: CardService) {}

  // M7-UC01: Create Card
  @Post()
  @RequirePermissions(Permission.CREATE_CARD)
  create(@Body() createCardDto: CreateCardDto) {
    return this.cardService.create(createCardDto);
  }

  // M7-UC05: Get all cards with filtering and search
  @Get()
  @RequirePermissions(Permission.VIEW_CARD)
  findAll(
    @Query('projectId') projectId?: string,
    @Query('sprintId') sprintId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('ragStatus') ragStatus?: CardRAG,
    @Query('status') status?: CardStatus,
    @Query('priority') priority?: CardPriority,
    @Query('search') search?: string,
  ) {
    return this.cardService.findAll(
      projectId,
      sprintId,
      assigneeId,
      ragStatus,
      status,
      priority,
      search,
    );
  }

  // M7-UC04: Get card by ID with details
  @Get(':id')
  @RequirePermissions(Permission.VIEW_CARD)
  findOne(@Param('id') id: string) {
    return this.cardService.findOne(id);
  }

  // M7-UC02: Update Card
  @Patch(':id')
  @RequirePermissions(Permission.EDIT_CARD)
  update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto) {
    return this.cardService.update(id, updateCardDto);
  }

  // M7-UC06: Mark card as completed
  @Post(':id/complete')
  @RequirePermissions(Permission.EDIT_CARD)
  markAsCompleted(@Param('id') id: string) {
    return this.cardService.markAsCompleted(id);
  }

  // M7-UC03: Delete Card
  @Delete(':id')
  @RequirePermissions(Permission.DELETE_CARD)
  remove(@Param('id') id: string) {
    return this.cardService.remove(id);
  }
}
