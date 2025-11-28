import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaciMatrixController } from './raci-matrix.controller';
import { RaciMatrixService } from './raci-matrix.service';
import { RaciMatrix } from '../entities/raci-matrix.entity';
import { RaciEntry } from '../entities/raci-entry.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RaciMatrix, RaciEntry, Project, TeamMember]),
  ],
  controllers: [RaciMatrixController],
  providers: [RaciMatrixService],
  exports: [RaciMatrixService],
})
export class ArtifactsModule {}
