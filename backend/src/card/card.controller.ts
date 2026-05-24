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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CardService } from './card.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { CardRAG, CardStatus, CardPriority, CardType } from '../entities/card.entity';

@Controller('cards')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CARD_CREATE)
  create(@Body() dto: CreateCardDto, @Request() req: any) {
    return this.cardService.create(dto, req.user?.id);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CARD_VIEW)
  findAll(
    @Request() req: any,
    @Query('projectId')  projectId?: string,
    @Query('sprintId')   sprintId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('ragStatus')  ragStatus?: CardRAG,
    @Query('status')     status?: CardStatus,
    @Query('priority')   priority?: CardPriority,
    @Query('laneId')     laneId?: string,
    @Query('cardType')   cardType?: CardType,
    @Query('parentId')   parentId?: string,
    @Query('backlog')    backlog?: string,
    @Query('search')     search?: string,
  ) {
    const organizationId = req.user?.organizationId;
    return this.cardService.findAll({
      organizationId, projectId, sprintId, assigneeId, ragStatus, status, priority,
      laneId, cardType, parentId, backlog: backlog === 'true', search,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CARD_VIEW)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.cardService.findOne(id, req.user?.organizationId);
  }

  @Get(':id/activity')
  @RequirePermissions(PERMISSIONS.CARD_VIEW)
  getActivity(@Param('id') id: string) {
    return this.cardService.getCardActivity(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CARD_EDIT)
  update(@Param('id') id: string, @Body() dto: UpdateCardDto, @Request() req: any) {
    return this.cardService.update(id, dto, req.user?.id);
  }

  @Post(':id/complete')
  @RequirePermissions(PERMISSIONS.CARD_EDIT)
  markAsCompleted(@Param('id') id: string) {
    return this.cardService.markAsCompleted(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.CARD_DELETE)
  remove(@Param('id') id: string) {
    return this.cardService.remove(id);
  }

  // ── Comments ────────────────────────────────────────────────────────────────

  @Post(':id/comments')
  @RequirePermissions(PERMISSIONS.CARD_VIEW)
  addComment(
    @Param('id') id: string,
    @Body('body') body: string,
    @Request() req: any,
  ) {
    return this.cardService.addComment(id, body, req.user.id);
  }

  @Patch('comments/:commentId')
  @RequirePermissions(PERMISSIONS.CARD_VIEW)
  editComment(
    @Param('commentId') commentId: string,
    @Body('body') body: string,
    @Request() req: any,
  ) {
    return this.cardService.editComment(commentId, body, req.user.id);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.CARD_VIEW)
  deleteComment(@Param('commentId') commentId: string, @Request() req: any) {
    return this.cardService.deleteComment(commentId, req.user.id);
  }
}
