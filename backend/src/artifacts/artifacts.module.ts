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
import { Schedule } from '../entities/schedule.entity';
import { ScheduleTask } from '../entities/schedule-task.entity';
import { TaskDependency } from '../entities/task-dependency.entity';
import { WorkingCalendar } from '../entities/working-calendar.entity';
import { CalendarException } from '../entities/calendar-exception.entity';
import { ArtifactTemplate } from '../entities/artifact-template.entity';
import { ArtifactInstance } from '../entities/artifact-instance.entity';
import { ArtifactVersion } from '../entities/artifact-version.entity';
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
    TypeOrmModule.forFeature([
      RaciMatrix,
      RaciEntry,
      Project,
      TeamMember,
      Risk,
      RiskHistory,
      Assumption,
      Issue,
      Decision,
      Stakeholder,
      Change,
      User,
      Schedule,
      ScheduleTask,
      TaskDependency,
      WorkingCalendar,
      CalendarException,
      ArtifactTemplate,
      ArtifactInstance,
      ArtifactVersion,
    ]),
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
