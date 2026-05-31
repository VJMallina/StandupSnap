import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { RaciMatrixController } from './raci-matrix.controller';
import { RaciMatrixService } from './raci-matrix.service';
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
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { CriticalPathService } from './critical-path.service';
import { AutoScheduleService } from './auto-schedule.service';
import { CalendarService } from './calendar.service';
import { ArtifactTemplatesService } from './artifact-templates.service';
import { ArtifactTemplatesController } from './artifact-templates.controller';
import { ArtifactInstancesService } from './artifact-instances.service';
import { ArtifactInstancesController } from './artifact-instances.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [
    RaciMatrixController,
    RiskController,
    AssumptionController,
    IssueController,
    DecisionController,
    StakeholderController,
    ChangeController,
    ScheduleController,
    ArtifactTemplatesController,
    ArtifactInstancesController,
  ],
  providers: [
    RaciMatrixService,
    RiskService,
    AssumptionService,
    IssueService,
    DecisionService,
    StakeholderService,
    ChangeService,
    ScheduleService,
    CriticalPathService,
    AutoScheduleService,
    CalendarService,
    ArtifactTemplatesService,
    ArtifactInstancesService,
  ],
  exports: [
    RaciMatrixService,
    RiskService,
    AssumptionService,
    IssueService,
    DecisionService,
    StakeholderService,
    ChangeService,
    ScheduleService,
    CriticalPathService,
    AutoScheduleService,
    CalendarService,
    ArtifactTemplatesService,
    ArtifactInstancesService,
  ],
})
export class ArtifactsModule {}
