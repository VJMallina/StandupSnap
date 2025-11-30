import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaciMatrixController } from './raci-matrix.controller';
import { RaciMatrixService } from './raci-matrix.service';
import { RaciMatrix } from '../entities/raci-matrix.entity';
import { RaciEntry } from '../entities/raci-entry.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Risk } from '../entities/risk.entity';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RaciMatrix, RaciEntry, Project, TeamMember, Risk]),
  ],
  controllers: [RaciMatrixController, RiskController],
  providers: [RaciMatrixService, RiskService],
  exports: [RaciMatrixService, RiskService],
})
export class ArtifactsModule {}
