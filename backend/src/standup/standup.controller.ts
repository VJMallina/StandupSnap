import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { StandupService, GenerateStandupDto, StandupResponse } from './standup.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('standup')
export class StandupController {
  constructor(private readonly standupService: StandupService) {}

  @Public()
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateStandup(
    @Body() dto: GenerateStandupDto,
  ): Promise<StandupResponse> {
    return this.standupService.generateStandup(dto);
  }
}
