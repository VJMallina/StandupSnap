import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SprintService } from './sprint.service';
import { SprintController } from './sprint.controller';
import { Sprint } from '../entities/sprint.entity';
import { Project } from '../entities/project.entity';
import { CardModule } from '../card/card.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sprint, Project]),
    forwardRef(() => CardModule),
  ],
  controllers: [SprintController],
  providers: [SprintService],
  exports: [SprintService],
})
export class SprintModule {}
