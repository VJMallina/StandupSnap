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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RiskService } from './risk.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RiskImpact, RiskLikelihood, RiskStatus } from '../entities/risk.entity';

@Controller('artifacts/risks')
@UseGuards(JwtAuthGuard)
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Post()
  async create(@Body() dto: CreateRiskDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.riskService.create(dto, userId);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('status') status?: RiskStatus,
    @Query('impact') impact?: RiskImpact,
    @Query('likelihood') likelihood?: RiskLikelihood,
    @Query('ownerId') ownerId?: string,
    @Query('search') search?: string,
  ) {
    return this.riskService.findByProject(projectId, { status, impact, likelihood, ownerId, search });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.riskService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRiskDto, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.riskService.update(id, dto, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.riskService.delete(id);
    return { message: 'Risk deleted successfully' };
  }
}
