import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IncidentGateway } from './incident.gateway';
import { Incident, IncidentSeverity, IncidentStatus } from '../entities/incident.entity';
import { IncidentRole, IncidentRoleType } from '../entities/incident-role.entity';
import { IncidentTimelineEntry, TimelineEntryType } from '../entities/incident-timeline-entry.entity';
import { IncidentRunbookStep, RunbookPhase } from '../entities/incident-runbook-step.entity';
import { Issue, IssueSeverity, IssueStatus } from '../entities/issue.entity';
import { Risk, RiskType, ProbabilityLevel, ImpactLevel, RiskStatus, RiskStrategy } from '../entities/risk.entity';
import { User } from '../entities/user.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Project } from '../entities/project.entity';
import { TenantService } from '../tenant/tenant.service';
import { DeclareIncidentDto } from './dto/declare-incident.dto';
import { AddTimelineEntryDto } from './dto/add-timeline-entry.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import { PushToRaidDto } from './dto/push-to-raid.dto';

const DEFAULT_RUNBOOK: { phase: RunbookPhase; title: string; description: string; order: number }[] = [
  { phase: RunbookPhase.TRIAGE, title: 'Confirm the incident', description: 'Verify the issue is real and affecting users.', order: 1 },
  { phase: RunbookPhase.TRIAGE, title: 'Assess severity', description: 'Determine blast radius and business impact.', order: 2 },
  { phase: RunbookPhase.TRIAGE, title: 'Notify the team', description: 'Alert relevant team members and stakeholders.', order: 3 },
  { phase: RunbookPhase.DIAGNOSIS, title: 'Identify affected systems', description: 'Pinpoint which services or components are impacted.', order: 4 },
  { phase: RunbookPhase.DIAGNOSIS, title: 'Form a hypothesis', description: 'Document your best guess at the root cause.', order: 5 },
  { phase: RunbookPhase.DIAGNOSIS, title: 'Confirm root cause', description: 'Reproduce or validate the hypothesis.', order: 6 },
  { phase: RunbookPhase.FIX, title: 'Apply fix', description: 'Implement the solution and document exactly what was changed.', order: 7 },
  { phase: RunbookPhase.VERIFY, title: 'Verify resolution', description: 'Confirm the fix resolved the issue for affected users.', order: 8 },
  { phase: RunbookPhase.VERIFY, title: 'Monitor for recurrence', description: 'Watch dashboards/logs for 15–30 minutes post-fix.', order: 9 },
  { phase: RunbookPhase.COMMUNICATE, title: 'Send all-clear', description: 'Notify stakeholders that the incident is resolved.', order: 10 },
  { phase: RunbookPhase.COMMUNICATE, title: 'Schedule post-mortem review', description: 'Book a blameless post-mortem session with the team.', order: 11 },
];

@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);

  constructor(
    private tenantService: TenantService,
    private configService: ConfigService,
    @Inject(forwardRef(() => IncidentGateway))
    private gateway: IncidentGateway,
  ) {}

  async declare(dto: DeclareIncidentDto, userId: string, userName: string, orgId: string): Promise<Incident> {
    const [incidentRepo, roleRepo, timelineRepo, runbookRepo] = await Promise.all([
      this.tenantService.getRepository(Incident),
      this.tenantService.getRepository(IncidentRole),
      this.tenantService.getRepository(IncidentTimelineEntry),
      this.tenantService.getRepository(IncidentRunbookStep),
    ]);

    const maxResult = await incidentRepo
      .createQueryBuilder('inc')
      .select('MAX(inc.incidentNumber)', 'max')
      .where('inc.organizationId = :orgId', { orgId })
      .getRawOne();
    const incidentNumber = ((maxResult?.max as number | null) ?? 0) + 1;
    const externalId = `INC-${String(incidentNumber).padStart(3, '0')}`;

    const incident = incidentRepo.create({
      organizationId: orgId,
      projectId: dto.projectId || null,
      incidentNumber,
      externalId,
      title: dto.title,
      description: dto.description || null,
      severity: dto.severity,
      status: IncidentStatus.ACTIVE,
      declaredById: userId,
      declaredByName: userName,
      declaredAt: new Date(),
    });
    const saved = await incidentRepo.save(incident);

    // Auto-assign Commander role to the declaring user
    await roleRepo.save(roleRepo.create({
      incidentId: saved.id,
      userId,
      userName,
      role: IncidentRoleType.COMMANDER,
    }));

    // Seed default runbook
    const steps = DEFAULT_RUNBOOK.map(s => runbookRepo.create({ ...s, incidentId: saved.id }));
    await runbookRepo.save(steps);

    // First timeline entry
    await timelineRepo.save(timelineRepo.create({
      incidentId: saved.id,
      authorId: userId,
      authorName: userName,
      entryType: TimelineEntryType.SYSTEM,
      content: `Incident declared by ${userName} — Severity: ${dto.severity}`,
    }));

    return this.findOne(saved.id, orgId);
  }

  async findAll(orgId: string, projectId?: string, status?: IncidentStatus): Promise<Incident[]> {
    const repo = await this.tenantService.getRepository(Incident);
    const where: any = { organizationId: orgId };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    return repo.find({ where, order: { declaredAt: 'DESC' } });
  }

  async findOne(id: string, orgId: string): Promise<Incident & {
    roles: IncidentRole[];
    timeline: IncidentTimelineEntry[];
    runbook: IncidentRunbookStep[];
  }> {
    const [incidentRepo, roleRepo, timelineRepo, runbookRepo] = await Promise.all([
      this.tenantService.getRepository(Incident),
      this.tenantService.getRepository(IncidentRole),
      this.tenantService.getRepository(IncidentTimelineEntry),
      this.tenantService.getRepository(IncidentRunbookStep),
    ]);

    const incident = await incidentRepo.findOne({ where: { id, organizationId: orgId } });
    if (!incident) throw new NotFoundException('Incident not found');

    const [roles, timeline, runbook] = await Promise.all([
      roleRepo.find({ where: { incidentId: id }, order: { assignedAt: 'ASC' } }),
      timelineRepo.find({ where: { incidentId: id }, order: { createdAt: 'ASC' } }),
      runbookRepo.find({ where: { incidentId: id }, order: { order: 'ASC' } }),
    ]);

    return { ...incident, roles, timeline, runbook };
  }

  async update(id: string, dto: UpdateIncidentDto, orgId: string): Promise<Incident> {
    const repo = await this.tenantService.getRepository(Incident);
    const incident = await repo.findOne({ where: { id, organizationId: orgId } });
    if (!incident) throw new NotFoundException('Incident not found');
    if (incident.status === IncidentStatus.RESOLVED) throw new BadRequestException('Cannot update a resolved incident');
    Object.assign(incident, dto);
    return repo.save(incident);
  }

  async addTimelineEntry(
    id: string, dto: AddTimelineEntryDto, userId: string, userName: string, orgId: string,
  ): Promise<IncidentTimelineEntry> {
    const [incidentRepo, timelineRepo] = await Promise.all([
      this.tenantService.getRepository(Incident),
      this.tenantService.getRepository(IncidentTimelineEntry),
    ]);
    const incident = await incidentRepo.findOne({ where: { id, organizationId: orgId } });
    if (!incident) throw new NotFoundException('Incident not found');

    const entry = timelineRepo.create({
      incidentId: id,
      authorId: userId,
      authorName: userName,
      entryType: dto.entryType,
      content: dto.content,
    });
    const saved = await timelineRepo.save(entry);
    this.gateway.emitTimelineEntry(id, saved);
    return saved;
  }

  async assignRole(id: string, dto: AssignRoleDto, requesterUserId: string, orgId: string): Promise<IncidentRole> {
    const [incidentRepo, roleRepo, userRepo] = await Promise.all([
      this.tenantService.getRepository(Incident),
      this.tenantService.getRepository(IncidentRole),
      // User is in public schema — use mainDataSource fallback via TenantService
      this.tenantService.getRepository(User),
    ]);

    const incident = await incidentRepo.findOne({ where: { id, organizationId: orgId } });
    if (!incident) throw new NotFoundException('Incident not found');

    const user = await userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    // Remove existing role assignment for this user on this incident (one role per user)
    await roleRepo.delete({ incidentId: id, userId: dto.userId });

    const role = roleRepo.create({
      incidentId: id,
      userId: dto.userId,
      userName: user.name || user.username,
      role: dto.role,
    });
    const saved = await roleRepo.save(role);
    this.gateway.emitRoleAssigned(id, saved);
    return saved;
  }

  async completeRunbookStep(
    incidentId: string, stepId: string, isCompleted: boolean,
    userId: string, userName: string, orgId: string,
  ): Promise<IncidentRunbookStep> {
    const [incidentRepo, runbookRepo, timelineRepo] = await Promise.all([
      this.tenantService.getRepository(Incident),
      this.tenantService.getRepository(IncidentRunbookStep),
      this.tenantService.getRepository(IncidentTimelineEntry),
    ]);

    const incident = await incidentRepo.findOne({ where: { id: incidentId, organizationId: orgId } });
    if (!incident) throw new NotFoundException('Incident not found');

    const step = await runbookRepo.findOne({ where: { id: stepId, incidentId } });
    if (!step) throw new NotFoundException('Runbook step not found');

    step.isCompleted = isCompleted;
    step.completedById = isCompleted ? userId : null;
    step.completedByName = isCompleted ? userName : null;
    step.completedAt = isCompleted ? new Date() : null;
    const saved = await runbookRepo.save(step);
    this.gateway.emitRunbookStep(incidentId, saved);

    const entry = await timelineRepo.save(timelineRepo.create({
      incidentId,
      entryType: TimelineEntryType.SYSTEM,
      content: `${isCompleted ? '✓' : '↩'} ${step.phase}: "${step.title}" ${isCompleted ? `completed by ${userName}` : 'unchecked'}`,
    }));
    this.gateway.emitTimelineEntry(incidentId, entry);

    return saved;
  }

  async resolve(
    id: string, dto: ResolveIncidentDto, userId: string, userName: string, orgId: string,
  ): Promise<Incident> {
    const [incidentRepo, timelineRepo] = await Promise.all([
      this.tenantService.getRepository(Incident),
      this.tenantService.getRepository(IncidentTimelineEntry),
    ]);

    const incident = await incidentRepo.findOne({ where: { id, organizationId: orgId } });
    if (!incident) throw new NotFoundException('Incident not found');
    if (incident.status === IncidentStatus.RESOLVED) throw new BadRequestException('Incident is already resolved');

    incident.status = IncidentStatus.RESOLVED;
    incident.resolvedById = userId;
    incident.resolvedAt = new Date();
    incident.resolutionSummary = dto.resolutionSummary;
    const saved = await incidentRepo.save(incident);

    // Resolution timeline entry
    await timelineRepo.save(timelineRepo.create({
      incidentId: id,
      authorId: userId,
      authorName: userName,
      entryType: TimelineEntryType.RESOLUTION,
      content: `Incident resolved by ${userName}. ${dto.resolutionSummary}`,
    }));

    // Generate post-mortem async (non-blocking)
    this.generatePostMortem(saved, orgId).catch(err =>
      this.logger.error(`Post-mortem generation failed for incident ${id}:`, err),
    );

    return this.findOne(id, orgId);
  }

  private async generatePostMortem(incident: Incident, orgId: string): Promise<void> {
    const fullIncident = await this.findOne(incident.id, orgId);

    const durationMs = incident.resolvedAt
      ? incident.resolvedAt.getTime() - incident.declaredAt.getTime()
      : 0;
    const durationMin = Math.round(durationMs / 60000);
    const durationStr = durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
      : `${durationMin}m`;

    const timelineText = fullIncident.timeline
      .map(e => `[${new Date(e.createdAt).toISOString()}] [${e.entryType}] ${e.authorName || 'System'}: ${e.content}`)
      .join('\n');

    const prompt = `You are a senior SRE writing a blameless post-mortem. Analyze this incident and return a JSON object.

Incident: ${incident.title}
Severity: ${incident.severity}
Duration: ${durationStr}
Resolution: ${incident.resolutionSummary || 'Not provided'}

Timeline:
${timelineText}

Return ONLY a valid JSON object with these exact fields:
{
  "executiveSummary": "2-3 sentence summary of what happened and impact",
  "timelineOfEvents": "key events in chronological narrative",
  "rootCause": "the underlying root cause",
  "contributingFactors": ["factor 1", "factor 2"],
  "resolutionSteps": "what was done to fix it",
  "preventiveActions": ["action 1", "action 2", "action 3"],
  "lessonsLearned": "key takeaways for the team"
}`;

    try {
      const groqKey = this.configService.get<string>('GROQ_API_KEY');
      const groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: groqModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        },
        {
          headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          timeout: 30000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content || '{}';
      const repo = await this.tenantService.getRepository(Incident);
      await repo.update(incident.id, { postMortem: content });
      this.logger.log(`Post-mortem generated for incident ${incident.id}`);
      this.gateway.emitPostMortemReady(incident.id);
    } catch (err) {
      this.logger.error(`Groq API failed for incident ${incident.id}:`, err.message);
    }
  }

  async pushToRaid(id: string, dto: PushToRaidDto, userId: string, orgId: string): Promise<{ issueId: string; riskId: string }> {
    const incidentRepo = await this.tenantService.getRepository(Incident);
    const incident = await incidentRepo.findOne({ where: { id, organizationId: orgId } });
    if (!incident) throw new NotFoundException('Incident not found');
    if (incident.raidPushed) throw new BadRequestException('This incident has already been pushed to the RAID register');
    if (!incident.projectId) throw new BadRequestException('Incident must be linked to a project before pushing to RAID');

    const [issueRepo, riskRepo, teamMemberRepo, userRepo] = await Promise.all([
      this.tenantService.getRepository(Issue),
      this.tenantService.getRepository(Risk),
      this.tenantService.getRepository(TeamMember),
      this.tenantService.getRepository(User),
    ]);

    const issueOwner = await teamMemberRepo.findOne({ where: { id: dto.issue.ownerId } });
    if (!issueOwner) throw new NotFoundException(`Team member ${dto.issue.ownerId} not found for issue owner`);

    const riskOwner = await teamMemberRepo.findOne({ where: { id: dto.risk.ownerId } });
    if (!riskOwner) throw new NotFoundException(`Team member ${dto.risk.ownerId} not found for risk owner`);

    const user = await userRepo.findOne({ where: { id: userId } });

    // Map incident severity to issue severity
    const issueSeverityMap: Record<string, IssueSeverity> = {
      P1: IssueSeverity.CRITICAL,
      P2: IssueSeverity.HIGH,
      P3: IssueSeverity.MEDIUM,
      P4: IssueSeverity.LOW,
    };

    const issue = issueRepo.create({
      organizationId: orgId,
      project: { id: incident.projectId } as Project,
      title: dto.issue.title,
      severity: issueSeverityMap[incident.severity] || IssueSeverity.HIGH,
      status: IssueStatus.CLOSED,
      owner: issueOwner,
      description: dto.issue.description || null,
      impactSummary: dto.issue.impactSummary || null,
      resolutionPlan: dto.issue.resolutionPlan || null,
      closureDate: incident.resolvedAt || new Date(),
      createdBy: user,
      updatedBy: user,
    });
    const savedIssue = await issueRepo.save(issue);

    const probabilityMap: Record<string, ProbabilityLevel> = {
      P1: ProbabilityLevel.HIGH,
      P2: ProbabilityLevel.MEDIUM,
      P3: ProbabilityLevel.LOW,
      P4: ProbabilityLevel.LOW,
    };
    const probability = probabilityMap[incident.severity] || ProbabilityLevel.MEDIUM;
    const probabilityScore = { LOW: 1, MEDIUM: 2, HIGH: 3, VERY_HIGH: 4 }[probability];
    const impactScore = incident.severity === 'P1' ? 4 : incident.severity === 'P2' ? 3 : 2;
    const riskScore = probabilityScore * impactScore;

    const risk = riskRepo.create({
      organizationId: orgId,
      project: { id: incident.projectId } as Project,
      title: dto.risk.title,
      riskType: RiskType.THREAT,
      category: dto.risk.category,
      dateIdentified: incident.declaredAt,
      riskStatement: dto.risk.riskStatement,
      probability,
      probabilityScore,
      impactScore,
      riskScore,
      severity: (riskScore <= 3 ? 'LOW' : riskScore <= 6 ? 'MEDIUM' : riskScore <= 9 ? 'HIGH' : 'VERY_HIGH') as any,
      strategy: dto.risk.strategy as RiskStrategy,
      mitigationPlan: dto.risk.mitigationPlan || null,
      status: RiskStatus.OPEN,
      owner: riskOwner,
      createdBy: user,
      updatedBy: user,
    });
    const savedRisk = await riskRepo.save(risk);

    await incidentRepo.update(id, { raidPushed: true });

    return { issueId: savedIssue.id, riskId: savedRisk.id };
  }

  async getActiveCount(orgId: string): Promise<number> {
    const repo = await this.tenantService.getRepository(Incident);
    return repo.count({ where: { organizationId: orgId, status: IncidentStatus.ACTIVE } });
  }
}
