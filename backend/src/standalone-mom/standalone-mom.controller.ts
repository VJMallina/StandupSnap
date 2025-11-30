import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StandaloneMomService } from './standalone-mom.service';
import { CreateStandaloneMomDto } from './dto/create-standalone-mom.dto';
import { UpdateStandaloneMomDto } from './dto/update-standalone-mom.dto';
import { FilterStandaloneMomDto } from './dto/filter-standalone-mom.dto';
import { GenerateStandaloneMomDto } from './dto/generate-ai.dto';
import { Response, Request } from 'express';

@Controller('standalone-mom')
@UseGuards(JwtAuthGuard)
export class StandaloneMomController {
  constructor(private readonly standaloneMomService: StandaloneMomService) {}

  @Post()
  async create(@Body() dto: CreateStandaloneMomDto, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.standaloneMomService.create(dto, userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStandaloneMomDto, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.standaloneMomService.update(id, dto, userId);
  }

  @Get()
  async findAll(@Query() query: FilterStandaloneMomDto) {
    return this.standaloneMomService.findAll(query);
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.standaloneMomService.archive(id, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.standaloneMomService.remove(id);
  }

  @Post('generate')
  async generate(@Body() dto: GenerateStandaloneMomDto) {
    return this.standaloneMomService.generateWithAI(dto);
  }

  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  async extract(@UploadedFile() file: any) {
    const text = await this.standaloneMomService.extractTranscript(file);
    return { text };
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Query('format') format: 'txt' | 'docx' = 'txt', @Res() res: Response) {
    const result = await this.standaloneMomService.download(id, format);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.standaloneMomService.findOne(id);
  }
}
