import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StandaloneMomController } from './standalone-mom.controller';
import { StandaloneMomService } from './standalone-mom.service';
import { StandaloneMom } from '../entities/standalone-mom.entity';
import { Project } from '../entities/project.entity';
import { Sprint } from '../entities/sprint.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StandaloneMom, Project, Sprint])],
  controllers: [StandaloneMomController],
  providers: [StandaloneMomService],
})
export class StandaloneMomModule {}
