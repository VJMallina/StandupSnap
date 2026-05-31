import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanvasReport } from '../entities/canvas-report.entity';
import { CanvasReportService } from './canvas-report.service';
import { CanvasReportController } from './canvas-report.controller';
import { TemplateGeneratorService } from './template-generator.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CanvasReport]),
    AuthModule,
  ],
  controllers: [CanvasReportController],
  providers: [CanvasReportService, TemplateGeneratorService],
  exports: [CanvasReportService],
})
export class CanvasReportModule {}
