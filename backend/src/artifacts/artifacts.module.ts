import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaciMatrixController } from './raci-matrix.controller';
import { RaciMatrixService } from './raci-matrix.service';
import { RaciMatrix } from '../entities/raci-matrix.entity';
import { RaciEntry } from '../entities/raci-entry.entity';
import { Project } from '../entities/project.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Risk } from '../entities/risk.entity';
import { RiskHistory } from '../entities/risk-history.entity';
import { Assumption } from '../entities/assumption.entity';
import { Issue } from '../entities/issue.entity';
import { Decision } from '../entities/decision.entity';
import { Stakeholder } from '../entities/stakeholder.entity';
import { Change } from '../entities/change.entity';
import { User } from '../entities/user.entity';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';
import { AssumptionService } from './assumption.service';
import { AssumptionController } from './assumption.controller';
import { IssueService } from './issue.service';
import { IssueController } from './issue.controller';
import { DecisionService } from './decision.service';
import { DecisionController } from './decision.controller';
import { StakeholderService } from './stakeholder.service';
import { StakeholderController } from './stakeholder.controller';
import { ChangeService } from './change.service';
import { ChangeController } from './change.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RaciMatrix, RaciEntry, Project, TeamMember, Risk, RiskHistory, Assumption, Issue, Decision, Stakeholder, Change, User]),
  ],
  controllers: [RaciMatrixController, RiskController, AssumptionController, IssueController, DecisionController, StakeholderController, ChangeController],
  providers: [RaciMatrixService, RiskService, AssumptionService, IssueService, DecisionService, StakeholderService, ChangeService],
  exports: [RaciMatrixService, RiskService, AssumptionService, IssueService, DecisionService, StakeholderService, ChangeService],
})
export class ArtifactsModule {}
