import { Injectable } from '@nestjs/common';
import { Project } from '../entities/project.entity';
import { Sprint, SprintStatus } from '../entities/sprint.entity';
import { Card, CardStatus } from '../entities/card.entity';
import { Risk, RiskStatus, RiskSeverity } from '../entities/risk.entity';
import { Issue, IssueStatus, IssueSeverity } from '../entities/issue.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Assumption, AssumptionStatus } from '../entities/assumption.entity';
import { Decision, DecisionStatus } from '../entities/decision.entity';
import { Change, ChangeStatus } from '../entities/change.entity';
import { Stakeholder } from '../entities/stakeholder.entity';
import { SlideData, ReportType } from '../entities/canvas-report.entity';
import { TenantService } from '../tenant/tenant.service';
import { v4 as uuid } from 'uuid';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const B = {
  teal: '#0d9488',
  tealDark: '#0f766e',
  tealLight: '#ccfbf1',
  cyan: '#06b6d4',
  dark: '#0f172a',
  darkMed: '#1e293b',
  slate: '#334155',
  light: '#f8fafc',
  white: '#ffffff',
  textDark: '#111827',
  textMed: '#374151',
  textLight: '#9ca3af',
  green: '#10b981',
  greenBg: '#d1fae5',
  amber: '#f59e0b',
  amberBg: '#fef3c7',
  red: '#ef4444',
  redBg: '#fee2e2',
  border: '#e5e7eb',
  purple: '#8b5cf6',
  purpleBg: '#ede9fe',
  blue: '#3b82f6',
  blueBg: '#dbeafe',
};

// ─── Fabric.js JSON helpers ────────────────────────────────────────────────────
type FabricObj = Record<string, any>;

function rect(
  left: number, top: number, width: number, height: number,
  fill: string, opts: Partial<FabricObj> = {},
): FabricObj {
  return {
    type: 'Rect', originX: 'left', originY: 'top',
    left, top, width, height, fill,
    stroke: opts.stroke ?? null, strokeWidth: opts.strokeWidth ?? 0,
    rx: opts.rx ?? 0, ry: opts.ry ?? 0,
    opacity: opts.opacity ?? 1,
    angle: 0, scaleX: 1, scaleY: 1,
    selectable: opts.selectable ?? true,
    ...opts,
  };
}

function text(
  content: string, left: number, top: number, fontSize: number,
  fill: string, opts: Partial<FabricObj> = {},
): FabricObj {
  return {
    type: 'Textbox', originX: 'left', originY: 'top',
    left, top, width: opts.width ?? 880,
    text: content, fontSize,
    fontFamily: opts.fontFamily ?? 'Arial',
    fontWeight: opts.fontWeight ?? 'normal',
    fontStyle: 'normal', underline: false,
    fill, textAlign: opts.textAlign ?? 'left',
    lineHeight: 1.2, charSpacing: opts.charSpacing ?? 0,
    opacity: opts.opacity ?? 1,
    angle: 0, scaleX: 1, scaleY: 1,
    selectable: opts.selectable ?? true,
    splitByGrapheme: false,
    ...opts,
  };
}

function hline(x1: number, x2: number, y: number, stroke: string, strokeWidth = 1): FabricObj {
  const cx = (x1 + x2) / 2;
  const half = (x2 - x1) / 2;
  return {
    type: 'Line', originX: 'center', originY: 'center',
    left: cx, top: y,
    x1: -half, y1: 0, x2: half, y2: 0,
    stroke, strokeWidth, fill: null,
    opacity: 1, angle: 0, scaleX: 1, scaleY: 1, selectable: true,
  };
}

function buildSlide(objects: FabricObj[], bg = B.white): SlideData {
  return { id: uuid(), order: 0, fabricJson: { version: '6.0.0', objects, background: bg } };
}

// ─── Date helpers ──────────────────────────────────────────────────────────────
function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateShort(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function truncate(s: string, max: number): string {
  return s && s.length > max ? s.slice(0, max - 1) + '…' : (s ?? '');
}

// ─── RAG helpers ──────────────────────────────────────────────────────────────
function ragColor(rag: string | null | undefined): string {
  if (!rag) return B.textLight;
  switch (rag.toLowerCase()) {
    case 'red': return B.red;
    case 'amber': return B.amber;
    default: return B.green;
  }
}

function ragBg(rag: string | null | undefined): string {
  if (!rag) return B.border;
  switch (rag.toLowerCase()) {
    case 'red': return B.redBg;
    case 'amber': return B.amberBg;
    default: return B.greenBg;
  }
}

function severityColor(s: string): string {
  const sl = s.toLowerCase();
  if (sl === 'critical' || sl === 'very_high') return B.red;
  if (sl === 'high') return B.amber;
  if (sl === 'medium') return '#f97316';
  return B.textLight;
}

// ─── Sprint phase label ────────────────────────────────────────────────────────
function sprintPhaseLabel(sprints: Sprint[]): string {
  if (!sprints.length) return 'Pre-Sprint / Planning';
  const active = sprints.find(s => s.status === SprintStatus.ACTIVE);
  if (active) return `Active: ${truncate(active.name, 30)}`;
  const upcoming = sprints.find(s => s.status === SprintStatus.UPCOMING);
  if (upcoming) return `Upcoming: ${truncate(upcoming.name, 30)}`;
  const completed = sprints.filter(s =>
    s.status === SprintStatus.COMPLETED || s.status === SprintStatus.CLOSED,
  );
  if (completed.length) return `${completed.length} sprint${completed.length !== 1 ? 's' : ''} completed`;
  return 'Pre-Sprint / Planning';
}

// ─── Slide 1: Cover ───────────────────────────────────────────────────────────
function buildCoverSlide(
  project: Project | null,
  reportType: ReportType,
  start: Date,
  end: Date,
  overallRag: string | null,
): SlideData {
  const typeLabel = {
    weekly: 'WEEKLY STATUS REPORT',
    biweekly: 'BI-WEEKLY STATUS REPORT',
    monthly: 'MONTHLY STATUS REPORT',
    custom: 'PROJECT STATUS REPORT',
  }[reportType] ?? 'PROJECT STATUS REPORT';

  const periodLabel = `${fmtDate(start)} – ${fmtDate(end)}`;
  const projectDates = project
    ? `Project: ${fmtDate(project.startDate)} → ${fmtDate(project.endDate)}`
    : '';

  const objs: FabricObj[] = [
    rect(0, 0, 960, 540, B.dark, { selectable: false }),
    rect(0, 0, 6, 540, B.teal, { selectable: false }),
    { type: 'Circle', originX: 'left', originY: 'top', left: 620, top: -80, radius: 300,
      fill: B.darkMed, stroke: null, strokeWidth: 0, opacity: 0.6, angle: 0, scaleX: 1, scaleY: 1, selectable: false },
    text(typeLabel, 60, 140, 13, B.teal, { width: 500, fontWeight: 'bold', charSpacing: 200 }),
    text(project?.name ?? 'Project Name', 60, 168, 44, B.white, { width: 640, fontWeight: 'bold' }),
    hline(60, 580, 246, B.slate, 1),
    text(periodLabel, 60, 260, 16, B.textLight, { width: 500 }),
    text(projectDates, 60, 290, 11, '#64748b', { width: 500 }),
    text(`Generated: ${fmtDate(new Date())}`, 60, 310, 11, '#64748b', { width: 400 }),
    rect(60, 348, 130, 38, ragBg(overallRag), { rx: 8, ry: 8 }),
    text(`● ${overallRag ? overallRag.toUpperCase() : 'N/A'}`, 75, 357, 14, ragColor(overallRag), { width: 100, fontWeight: 'bold' }),
  ];

  const slide = buildSlide(objs, B.dark);
  slide.order = 0;
  return slide;
}

// ─── Slide 2: Project Health Snapshot ────────────────────────────────────────
function buildHealthSnapshotSlide(
  project: Project | null,
  sprints: Sprint[],
  cards: Card[],
  risks: Risk[],
  issues: Issue[],
  assumptions: Assumption[],
  changes: Change[],
  teamMembers: TeamMember[],
): SlideData {
  const openRisks = risks.filter(r => r.status !== RiskStatus.CLOSED && r.status !== RiskStatus.MITIGATED).length;
  const openIssues = issues.filter(i => i.status !== IssueStatus.CLOSED && i.status !== IssueStatus.MITIGATED).length;
  const openAssumptions = assumptions.filter(a => a.status === AssumptionStatus.OPEN).length;
  const activeChanges = changes.filter(c =>
    ![ChangeStatus.CLOSED, ChangeStatus.IMPLEMENTED, ChangeStatus.REJECTED].includes(c.status),
  ).length;

  const inProgressCards = cards.filter(c => c.status === CardStatus.IN_PROGRESS).length;
  const completedCards = cards.filter(c => c.status === CardStatus.COMPLETED || c.status === CardStatus.CLOSED).length;
  const totalCards = cards.length;

  const kpis = [
    { label: 'Open Risks', value: String(openRisks), color: openRisks > 0 ? B.amber : B.green, bg: openRisks > 0 ? B.amberBg : B.greenBg },
    { label: 'Open Issues', value: String(openIssues), color: openIssues > 0 ? B.red : B.green, bg: openIssues > 0 ? B.redBg : B.greenBg },
    { label: 'Assumptions', value: String(openAssumptions), color: B.blue, bg: B.blueBg },
    { label: 'Active Changes', value: String(activeChanges), color: B.purple, bg: B.purpleBg },
  ];

  const objs: FabricObj[] = [
    rect(0, 0, 960, 72, B.teal, { selectable: false }),
    text('PROJECT HEALTH SNAPSHOT', 40, 18, 22, B.white, { width: 600, fontWeight: 'bold' }),
    text(project?.name ?? '', 40, 46, 12, '#ccfbf1', { width: 500 }),
  ];

  // KPI boxes
  kpis.forEach((k, i) => {
    const x = 30 + i * 228;
    objs.push(
      rect(x, 88, 208, 88, k.bg, { rx: 8, ry: 8, stroke: B.border, strokeWidth: 1 }),
      rect(x, 88, 4, 88, k.color, { rx: 0, ry: 0, selectable: false }),
      text(k.value, x + 16, y88_12(88), 32, k.color, { width: 180, fontWeight: 'bold' }),
      text(k.label, x + 16, y88_56(88), 11, B.textLight, { width: 180 }),
    );
  });

  // Sprint phase + team
  const phaseY = 196;
  objs.push(
    hline(30, 930, phaseY, B.border),
    text('SPRINT PHASE', 30, phaseY + 12, 10, B.textLight, { width: 200, fontWeight: 'bold', charSpacing: 100 }),
    text(sprintPhaseLabel(sprints), 30, phaseY + 28, 14, B.textDark, { width: 400, fontWeight: 'bold' }),
    text('TEAM SIZE', 510, phaseY + 12, 10, B.textLight, { width: 200, fontWeight: 'bold', charSpacing: 100 }),
    text(`${teamMembers.length} member${teamMembers.length !== 1 ? 's' : ''}`, 510, phaseY + 28, 14, B.textDark, { width: 200, fontWeight: 'bold' }),
  );

  // Cards summary (if any)
  if (totalCards > 0) {
    const cardY = phaseY + 62;
    const pct = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;
    objs.push(
      hline(30, 930, cardY, B.border),
      text('CARD PROGRESS', 30, cardY + 12, 10, B.textLight, { width: 300, fontWeight: 'bold', charSpacing: 100 }),
      rect(30, cardY + 28, 900, 10, B.border, { rx: 5, ry: 5 }),
      rect(30, cardY + 28, Math.max(4, (900 * pct) / 100), 10, B.green, { rx: 5, ry: 5 }),
      text(
        `${completedCards} of ${totalCards} cards completed (${pct}%)  ·  ${inProgressCards} in progress`,
        30, cardY + 44, 11, B.textLight, { width: 700 },
      ),
    );
  }

  // Project dates
  if (project) {
    objs.push(
      hline(30, 930, 460, B.border),
      text(
        `Project Period: ${fmtDate(project.startDate)} → ${fmtDate(project.endDate)}`,
        30, 470, 11, B.textLight, { width: 900, textAlign: 'center' },
      ),
    );
  }

  const slide = buildSlide(objs, B.light);
  slide.order = 1;
  return slide;
}

// Tiny position helpers (avoid repetition of magic numbers)
function y88_12(base: number) { return base + 12; }
function y88_56(base: number) { return base + 56; }

// ─── Slide 3: Sprint & Delivery Progress ──────────────────────────────────────
function buildSprintProgressSlide(sprints: Sprint[], cards: Card[]): SlideData {
  const activeSprint = sprints.find(s => s.status === SprintStatus.ACTIVE);
  const latestSprint = activeSprint ?? sprints[0] ?? null;
  const sprintCards = latestSprint ? cards.filter(c => c.sprintId === latestSprint.id) : [];

  const statusCounts = {
    not_started: sprintCards.filter(c => c.status === CardStatus.NOT_STARTED).length,
    in_progress: sprintCards.filter(c => c.status === CardStatus.IN_PROGRESS).length,
    completed: sprintCards.filter(c => c.status === CardStatus.COMPLETED).length,
    closed: sprintCards.filter(c => c.status === CardStatus.CLOSED).length,
  };
  const totalCards = sprintCards.length || 1;
  const doneCount = statusCounts.completed + statusCounts.closed;
  const pctDone = Math.round((doneCount / totalCards) * 100);

  let dayPct = 0;
  if (latestSprint?.startDate && latestSprint?.endDate) {
    const s = new Date(latestSprint.startDate).getTime();
    const e = new Date(latestSprint.endDate).getTime();
    const now = Math.min(Date.now(), e);
    dayPct = Math.round(((now - s) / (e - s)) * 100);
  }

  const objs: FabricObj[] = [
    rect(0, 0, 960, 72, B.teal, { selectable: false }),
    text('SPRINT & DELIVERY PROGRESS', 40, 18, 22, B.white, { width: 600, fontWeight: 'bold' }),
  ];

  if (!latestSprint) {
    objs.push(
      text('No sprint activity yet', 40, 46, 12, '#ccfbf1', { width: 500 }),
      rect(30, 110, 900, 160, '#f0fdf4', { rx: 12, ry: 12, stroke: B.border, strokeWidth: 1 }),
      text('Project is in planning phase', 40, 168, 20, B.teal, { width: 880, textAlign: 'center', fontWeight: 'bold' }),
      text('Sprints will appear here once development begins', 40, 200, 13, B.textLight, { width: 880, textAlign: 'center' }),
    );
    const slide = buildSlide(objs, B.white);
    slide.order = 2;
    return slide;
  }

  const sprintLabel = activeSprint ? 'ACTIVE SPRINT' : 'MOST RECENT SPRINT';
  objs.push(
    text(sprintLabel, 40, 46, 12, '#ccfbf1', { width: 300, fontWeight: 'bold', charSpacing: 100 }),
  );

  if (latestSprint.endDate && new Date(latestSprint.endDate) < new Date()) {
    objs.push(text(`${fmtDate(latestSprint.startDate)} → ${fmtDate(latestSprint.endDate)}`, 700, 46, 12, '#ccfbf1', { width: 240, textAlign: 'right' }));
  }

  // Sprint goal box
  objs.push(
    rect(30, 90, 900, 64, '#f0fdf4', { rx: 8, ry: 8, stroke: B.border, strokeWidth: 1 }),
    text('SPRINT GOAL', 50, 98, 10, B.teal, { width: 200, fontWeight: 'bold', charSpacing: 100 }),
    text(latestSprint.goal ? truncate(latestSprint.goal, 140) : 'No sprint goal defined', 50, 114, 13, B.textDark, { width: 860 }),
  );

  // Timeline progress bar
  const barY = 180;
  objs.push(
    text('SPRINT TIMELINE', 30, barY, 11, B.textLight, { width: 300, fontWeight: 'bold', charSpacing: 100 }),
    rect(30, barY + 18, 900, 10, B.border, { rx: 5, ry: 5 }),
    rect(30, barY + 18, Math.max(4, (900 * dayPct) / 100), 10, B.teal, { rx: 5, ry: 5 }),
    text(`${dayPct}% of sprint days elapsed`, 30, barY + 34, 11, B.textLight, { width: 440 }),
  );

  // Card completion bar
  const cardBarY = 240;
  objs.push(
    text('CARDS COMPLETION', 30, cardBarY, 11, B.textLight, { width: 300, fontWeight: 'bold', charSpacing: 100 }),
    rect(30, cardBarY + 18, 900, 10, B.border, { rx: 5, ry: 5 }),
    rect(30, cardBarY + 18, Math.max(4, (900 * pctDone) / 100), 10, B.green, { rx: 5, ry: 5 }),
    text(`${doneCount} of ${sprintCards.length} cards done (${pctDone}%)`, 30, cardBarY + 34, 11, B.textLight, { width: 440 }),
  );

  // Status breakdown
  const statusItems = [
    { label: 'Not Started', count: statusCounts.not_started, color: B.textLight, bg: '#f9fafb' },
    { label: 'In Progress', count: statusCounts.in_progress, color: B.cyan, bg: '#ecfeff' },
    { label: 'Completed', count: statusCounts.completed, color: B.green, bg: B.greenBg },
    { label: 'Closed', count: statusCounts.closed, color: B.teal, bg: B.tealLight },
  ];
  const boxY = 308;
  objs.push(text('CARD STATUS BREAKDOWN', 30, boxY, 11, B.textLight, { width: 500, fontWeight: 'bold', charSpacing: 100 }));
  statusItems.forEach((item, i) => {
    const x = 30 + i * 228;
    const y = boxY + 20;
    objs.push(
      rect(x, y, 208, 72, item.bg, { rx: 8, ry: 8, stroke: B.border, strokeWidth: 1 }),
      text(String(item.count), x + 16, y + 8, 30, item.color, { width: 180, fontWeight: 'bold' }),
      text(item.label, x + 16, y + 46, 11, B.textLight, { width: 180 }),
    );
  });

  if (sprints.length > 1) {
    objs.push(text(`${sprints.length} sprint${sprints.length !== 1 ? 's' : ''} in project. Showing ${latestSprint.name}.`, 30, 420, 11, B.textLight, { width: 900 }));
  }

  objs.push(hline(30, 930, 470, B.border));

  const slide = buildSlide(objs, B.white);
  slide.order = 2;
  return slide;
}

// ─── Slide 4: Team & Stakeholders ─────────────────────────────────────────────
function buildTeamStakeholdersSlide(
  teamMembers: TeamMember[],
  cards: Card[],
  stakeholders: Stakeholder[],
): SlideData {
  const objs: FabricObj[] = [
    rect(0, 0, 960, 72, B.teal, { selectable: false }),
    text('TEAM & STAKEHOLDERS', 40, 18, 22, B.white, { width: 600, fontWeight: 'bold' }),
    text(
      `${teamMembers.length} team member${teamMembers.length !== 1 ? 's' : ''}  ·  ${stakeholders.length} stakeholder${stakeholders.length !== 1 ? 's' : ''}`,
      40, 46, 12, '#ccfbf1', { width: 500 },
    ),
  ];

  // ── Left: Team members ──
  objs.push(
    text('TEAM', 30, 84, 11, B.textLight, { width: 430, fontWeight: 'bold', charSpacing: 100 }),
    hline(30, 450, 102, B.border),
    // Table header
    rect(30, 108, 420, 24, '#f1f5f9', { selectable: false }),
    text('NAME', 44, 113, 9, B.textLight, { width: 200, fontWeight: 'bold', charSpacing: 80 }),
    text('ROLE', 260, 113, 9, B.textLight, { width: 180, fontWeight: 'bold', charSpacing: 80 }),
    text('CARDS', 390, 113, 9, B.textLight, { width: 60, fontWeight: 'bold', charSpacing: 80, textAlign: 'right' }),
  );

  const topMembers = teamMembers.slice(0, 9);
  if (!topMembers.length) {
    objs.push(text('No team members assigned', 30, 140, 12, B.textLight, { width: 420 }));
  } else {
    topMembers.forEach((tm, i) => {
      const rowY = 138 + i * 34;
      const memberCards = cards.filter(c => (c as any).assigneeId === tm.id || (c.assignee as any)?.id === tm.id).length;
      objs.push(
        rect(30, rowY, 420, 32, i % 2 === 0 ? B.white : '#f8fafc', { selectable: false }),
        hline(30, 450, rowY + 32, '#f1f5f9'),
        text(truncate(tm.displayName ?? tm.fullName, 26), 44, rowY + 9, 11, B.textDark, { width: 200, fontWeight: 'bold' }),
        text(truncate(tm.designationRole ?? '', 22), 260, rowY + 9, 10, B.textLight, { width: 120 }),
        text(memberCards > 0 ? String(memberCards) : '—', 390, rowY + 9, 11, memberCards > 0 ? B.teal : B.textLight, { width: 60, textAlign: 'right', fontWeight: 'bold' }),
      );
    });
  }

  // ── Right: Stakeholders ──
  objs.push(
    text('STAKEHOLDERS', 510, 84, 11, B.textLight, { width: 420, fontWeight: 'bold', charSpacing: 100 }),
    hline(510, 930, 102, B.border),
    rect(510, 108, 420, 24, '#f1f5f9', { selectable: false }),
    text('NAME / ROLE', 524, 113, 9, B.textLight, { width: 240, fontWeight: 'bold', charSpacing: 80 }),
    text('ENGAGEMENT', 780, 113, 9, B.textLight, { width: 140, fontWeight: 'bold', charSpacing: 80, textAlign: 'right' }),
  );

  const topStakeholders = stakeholders.slice(0, 9);
  if (!topStakeholders.length) {
    objs.push(text('No stakeholders registered', 510, 140, 12, B.textLight, { width: 420 }));
  } else {
    topStakeholders.forEach((sh, i) => {
      const rowY = 138 + i * 34;
      const quadrantLabel: Record<string, string> = {
        MANAGE_CLOSELY: 'Manage Closely',
        KEEP_SATISFIED: 'Keep Satisfied',
        KEEP_INFORMED: 'Keep Informed',
        MONITOR: 'Monitor',
      };
      const quadrantColor: Record<string, string> = {
        MANAGE_CLOSELY: B.teal,
        KEEP_SATISFIED: B.amber,
        KEEP_INFORMED: B.blue,
        MONITOR: B.textLight,
      };
      objs.push(
        rect(510, rowY, 420, 32, i % 2 === 0 ? B.white : '#f8fafc', { selectable: false }),
        hline(510, 930, rowY + 32, '#f1f5f9'),
        text(truncate(sh.stakeholderName, 22), 524, rowY + 4, 11, B.textDark, { width: 240, fontWeight: 'bold' }),
        text(truncate(sh.role ?? '', 22), 524, rowY + 18, 9, B.textLight, { width: 240 }),
        text(quadrantLabel[sh.quadrant] ?? '', 760, rowY + 9, 9, quadrantColor[sh.quadrant] ?? B.textLight, { width: 160, textAlign: 'right', fontWeight: 'bold' }),
      );
    });
  }

  objs.push(hline(30, 930, 490, B.border));

  const slide = buildSlide(objs, B.white);
  slide.order = 3;
  return slide;
}

// ─── Slide 5: Risks & Issues ──────────────────────────────────────────────────
function buildRisksIssuesSlide(risks: Risk[], issues: Issue[]): SlideData {
  const openRisks = risks.filter(r => r.status !== RiskStatus.CLOSED && r.status !== RiskStatus.MITIGATED);
  const openIssues = issues.filter(i => i.status !== IssueStatus.CLOSED && i.status !== IssueStatus.MITIGATED);

  const riskBySev: Record<string, Risk[]> = {
    [RiskSeverity.VERY_HIGH]: openRisks.filter(r => r.severity === RiskSeverity.VERY_HIGH),
    [RiskSeverity.HIGH]: openRisks.filter(r => r.severity === RiskSeverity.HIGH),
    [RiskSeverity.MEDIUM]: openRisks.filter(r => r.severity === RiskSeverity.MEDIUM),
    [RiskSeverity.LOW]: openRisks.filter(r => r.severity === RiskSeverity.LOW),
  };
  const issueBySev: Record<string, Issue[]> = {
    [IssueSeverity.CRITICAL]: openIssues.filter(i => i.severity === IssueSeverity.CRITICAL),
    [IssueSeverity.HIGH]: openIssues.filter(i => i.severity === IssueSeverity.HIGH),
    [IssueSeverity.MEDIUM]: openIssues.filter(i => i.severity === IssueSeverity.MEDIUM),
    [IssueSeverity.LOW]: openIssues.filter(i => i.severity === IssueSeverity.LOW),
  };

  const objs: FabricObj[] = [
    rect(0, 0, 960, 72, B.teal, { selectable: false }),
    text('RISKS & ISSUES', 40, 18, 22, B.white, { width: 600, fontWeight: 'bold' }),
    text(`${openRisks.length} open risk${openRisks.length !== 1 ? 's' : ''}  ·  ${openIssues.length} open issue${openIssues.length !== 1 ? 's' : ''}`, 40, 46, 12, '#ccfbf1', { width: 600 }),
    text('OPEN RISKS', 30, 84, 11, B.textLight, { width: 440, fontWeight: 'bold', charSpacing: 100 }),
    hline(30, 450, 102, B.border),
  ];

  if (!openRisks.length) {
    objs.push(text('No open risks — all risks resolved or mitigated', 30, 112, 12, B.green, { width: 440 }));
  } else {
    const severities = [
      { label: 'Very High', key: RiskSeverity.VERY_HIGH, color: B.red },
      { label: 'High', key: RiskSeverity.HIGH, color: B.amber },
      { label: 'Medium', key: RiskSeverity.MEDIUM, color: '#f97316' },
      { label: 'Low', key: RiskSeverity.LOW, color: B.green },
    ];
    severities.forEach((s, i) => {
      const count = riskBySev[s.key]?.length ?? 0;
      const bx = 30 + i * 105;
      objs.push(
        rect(bx, 108, 96, 40, '#f9fafb', { rx: 6, ry: 6, stroke: B.border, strokeWidth: 1 }),
        text(String(count), bx + 8, 112, 20, count > 0 ? s.color : B.textLight, { width: 80, fontWeight: 'bold' }),
        text(s.label, bx + 8, 134, 9, B.textLight, { width: 80 }),
      );
    });
    const topRisks = [
      ...riskBySev[RiskSeverity.VERY_HIGH], ...riskBySev[RiskSeverity.HIGH], ...riskBySev[RiskSeverity.MEDIUM],
    ].slice(0, 5);
    objs.push(hline(30, 450, 158, '#f1f5f9'));
    topRisks.forEach((r, i) => {
      const rowY = 164 + i * 52;
      objs.push(
        rect(30, rowY, 420, 44, '#fff', { rx: 6, ry: 6, stroke: B.border, strokeWidth: 1 }),
        rect(30, rowY, 4, 44, severityColor(r.severity), { rx: 0, ry: 0, selectable: false }),
        text(truncate(r.title, 52), 44, rowY + 6, 11, B.textDark, { width: 390, fontWeight: 'bold' }),
        text(`${r.severity}  ·  ${r.status}`, 44, rowY + 24, 10, B.textLight, { width: 390 }),
      );
    });
  }

  objs.push(
    text('OPEN ISSUES', 510, 84, 11, B.textLight, { width: 420, fontWeight: 'bold', charSpacing: 100 }),
    hline(510, 930, 102, B.border),
  );

  if (!openIssues.length) {
    objs.push(text('No open issues — all issues resolved', 510, 112, 12, B.green, { width: 420 }));
  } else {
    const issueSeverities = [
      { label: 'Critical', key: IssueSeverity.CRITICAL, color: B.red },
      { label: 'High', key: IssueSeverity.HIGH, color: B.amber },
      { label: 'Medium', key: IssueSeverity.MEDIUM, color: '#f97316' },
      { label: 'Low', key: IssueSeverity.LOW, color: B.green },
    ];
    issueSeverities.forEach((s, i) => {
      const count = issueBySev[s.key]?.length ?? 0;
      const bx = 510 + i * 105;
      objs.push(
        rect(bx, 108, 96, 40, '#f9fafb', { rx: 6, ry: 6, stroke: B.border, strokeWidth: 1 }),
        text(String(count), bx + 8, 112, 20, count > 0 ? s.color : B.textLight, { width: 80, fontWeight: 'bold' }),
        text(s.label, bx + 8, 134, 9, B.textLight, { width: 80 }),
      );
    });
    const topIssues = [
      ...issueBySev[IssueSeverity.CRITICAL], ...issueBySev[IssueSeverity.HIGH], ...issueBySev[IssueSeverity.MEDIUM],
    ].slice(0, 5);
    objs.push(hline(510, 930, 158, '#f1f5f9'));
    topIssues.forEach((issue, i) => {
      const rowY = 164 + i * 52;
      objs.push(
        rect(510, rowY, 420, 44, '#fff', { rx: 6, ry: 6, stroke: B.border, strokeWidth: 1 }),
        rect(510, rowY, 4, 44, severityColor(issue.severity), { rx: 0, ry: 0, selectable: false }),
        text(truncate(issue.title, 52), 524, rowY + 6, 11, B.textDark, { width: 390, fontWeight: 'bold' }),
        text(`${issue.severity}  ·  ${issue.status}`, 524, rowY + 24, 10, B.textLight, { width: 390 }),
      );
    });
  }

  objs.push(hline(30, 930, 490, B.border));

  const slide = buildSlide(objs, B.light);
  slide.order = 4;
  return slide;
}

// ─── Slide 6: Decisions, Assumptions & Changes ───────────────────────────────
function buildDecisionsChangesSlide(
  decisions: Decision[],
  assumptions: Assumption[],
  changes: Change[],
): SlideData {
  const openAssumptions = assumptions.filter(a => a.status === AssumptionStatus.OPEN).slice(0, 5);
  const pendingDecisions = decisions.filter(d => d.status === DecisionStatus.PENDING).slice(0, 5);
  const recentDecisions = decisions.filter(d => d.status === DecisionStatus.FINALIZED).slice(0, 3);
  const activeChanges = changes.filter(c =>
    ![ChangeStatus.CLOSED, ChangeStatus.IMPLEMENTED, ChangeStatus.REJECTED].includes(c.status),
  ).slice(0, 4);

  const objs: FabricObj[] = [
    rect(0, 0, 960, 72, B.teal, { selectable: false }),
    text('DECISIONS, ASSUMPTIONS & CHANGES', 40, 18, 22, B.white, { width: 700, fontWeight: 'bold' }),
    text(
      `${decisions.length} decision${decisions.length !== 1 ? 's' : ''}  ·  ${assumptions.length} assumption${assumptions.length !== 1 ? 's' : ''}  ·  ${changes.length} change${changes.length !== 1 ? 's' : ''}`,
      40, 46, 12, '#ccfbf1', { width: 700 },
    ),
  ];

  // ── Left: Decisions ──
  objs.push(
    text('DECISIONS', 30, 84, 11, B.textLight, { width: 440, fontWeight: 'bold', charSpacing: 100 }),
    hline(30, 450, 102, B.border),
  );

  const allDecisionsToShow = [...pendingDecisions, ...recentDecisions].slice(0, 6);
  if (!allDecisionsToShow.length) {
    objs.push(text('No decisions recorded', 30, 112, 12, B.textLight, { width: 440 }));
  } else {
    allDecisionsToShow.forEach((d, i) => {
      const rowY = 108 + i * 56;
      const isPending = d.status === DecisionStatus.PENDING;
      const statusColor = isPending ? B.amber : B.green;
      const statusBg = isPending ? B.amberBg : B.greenBg;
      objs.push(
        rect(30, rowY, 420, 48, B.white, { rx: 6, ry: 6, stroke: B.border, strokeWidth: 1 }),
        rect(30, rowY, 4, 48, statusColor, { rx: 0, ry: 0, selectable: false }),
        text(truncate(d.title, 50), 44, rowY + 6, 11, B.textDark, { width: 310, fontWeight: 'bold' }),
        text(d.description ? truncate(d.description, 60) : (d.decisionTaken ? truncate(d.decisionTaken, 60) : '—'), 44, rowY + 24, 9, B.textLight, { width: 310 }),
        rect(360, rowY + 10, 80, 18, statusBg, { rx: 4, ry: 4 }),
        text(d.status, 365, rowY + 13, 8, statusColor, { width: 70, fontWeight: 'bold' }),
      );
    });
  }

  // ── Right top: Assumptions ──
  const assumY = 84;
  objs.push(
    text('OPEN ASSUMPTIONS', 510, assumY, 11, B.textLight, { width: 420, fontWeight: 'bold', charSpacing: 100 }),
    hline(510, 930, assumY + 18, B.border),
  );

  if (!openAssumptions.length) {
    objs.push(text('No open assumptions', 510, assumY + 26, 12, B.textLight, { width: 420 }));
  } else {
    openAssumptions.forEach((a, i) => {
      objs.push(
        text(`◆  ${truncate(a.title, 48)}`, 510, assumY + 26 + i * 22, 11, B.textMed, { width: 420 }),
      );
    });
  }

  // ── Right bottom: Changes ──
  const changeY = assumY + 140;
  objs.push(
    hline(510, 930, changeY, B.border),
    text('ACTIVE CHANGES', 510, changeY + 10, 11, B.textLight, { width: 420, fontWeight: 'bold', charSpacing: 100 }),
  );

  if (!activeChanges.length) {
    objs.push(text('No active change requests', 510, changeY + 28, 12, B.textLight, { width: 420 }));
  } else {
    activeChanges.forEach((c, i) => {
      const rowY = changeY + 26 + i * 50;
      const priorityColor: Record<string, string> = {
        CRITICAL: B.red, HIGH: B.amber, MEDIUM: '#f97316', LOW: B.textLight,
      };
      objs.push(
        rect(510, rowY, 420, 42, B.white, { rx: 6, ry: 6, stroke: B.border, strokeWidth: 1 }),
        rect(510, rowY, 4, 42, priorityColor[c.priority] ?? B.textLight, { rx: 0, ry: 0, selectable: false }),
        text(truncate(c.title, 48), 524, rowY + 5, 11, B.textDark, { width: 380, fontWeight: 'bold' }),
        text(`${c.changeType}  ·  ${c.status}  ·  ${c.priority}`, 524, rowY + 23, 9, B.textLight, { width: 380 }),
      );
    });
  }

  objs.push(hline(30, 930, 490, B.border));

  const slide = buildSlide(objs, B.light);
  slide.order = 5;
  return slide;
}

// ─── Slide 7: Looking Ahead ───────────────────────────────────────────────────
function buildNextStepsSlide(
  sprints: Sprint[],
  risks: Risk[],
  decisions: Decision[],
  assumptions: Assumption[],
): SlideData {
  const upcoming = sprints.filter(s =>
    s.status === SprintStatus.UPCOMING || s.status === SprintStatus.ACTIVE,
  ).slice(0, 3);
  const highRisks = risks.filter(r =>
    (r.severity === RiskSeverity.VERY_HIGH || r.severity === RiskSeverity.HIGH) &&
    r.status !== RiskStatus.CLOSED && r.status !== RiskStatus.MITIGATED,
  ).slice(0, 3);
  const pendingDecisions = decisions.filter(d => d.status === DecisionStatus.PENDING).slice(0, 3);
  const openAssumptions = assumptions.filter(a => a.status === AssumptionStatus.OPEN).slice(0, 2);

  const objs: FabricObj[] = [
    rect(0, 0, 960, 540, B.dark, { selectable: false }),
    rect(0, 0, 6, 540, B.cyan, { selectable: false }),
    { type: 'Circle', originX: 'left', originY: 'top', left: 700, top: 300, radius: 220,
      fill: B.darkMed, stroke: null, strokeWidth: 0, opacity: 0.5, angle: 0, scaleX: 1, scaleY: 1, selectable: false },
    text('LOOKING AHEAD', 60, 80, 13, B.cyan, { width: 500, fontWeight: 'bold', charSpacing: 200 }),
    text('Next Steps & Focus Areas', 60, 108, 36, B.white, { width: 640, fontWeight: 'bold' }),
    hline(60, 580, 160, B.slate, 1),
  ];

  // Upcoming sprints / focus
  objs.push(text('UPCOMING SPRINTS', 60, 176, 11, B.teal, { width: 500, fontWeight: 'bold', charSpacing: 100 }));
  if (!upcoming.length) {
    objs.push(text('No upcoming sprints defined', 60, 198, 13, '#64748b', { width: 400 }));
  } else {
    upcoming.forEach((s, i) => {
      const y = 198 + i * 50;
      objs.push(
        rect(60, y, 380, 42, '#1e293b', { rx: 8, ry: 8 }),
        rect(60, y, 4, 42, B.teal, { rx: 0, ry: 0, selectable: false }),
        text(truncate(s.name, 42), 76, y + 6, 12, B.white, { width: 350, fontWeight: 'bold' }),
        text(s.goal ? truncate(s.goal, 55) : 'No goal set', 76, y + 24, 10, '#64748b', { width: 350 }),
      );
    });
  }

  // High risks watch list
  objs.push(
    hline(60, 580, 352, '#1e293b'),
    text('HIGH-RISK ITEMS', 60, 364, 11, B.red, { width: 500, fontWeight: 'bold', charSpacing: 100 }),
  );
  if (!highRisks.length) {
    objs.push(text('No high-priority risks open', 60, 384, 13, '#64748b', { width: 400 }));
  } else {
    highRisks.forEach((r, i) => {
      objs.push(text(`⚠  ${truncate(r.title, 55)}`, 60, 384 + i * 22, 12, '#94a3b8', { width: 400 }));
    });
  }

  // Pending decisions (right column)
  objs.push(
    text('PENDING DECISIONS', 520, 176, 11, B.amber, { width: 400, fontWeight: 'bold', charSpacing: 100 }),
  );
  if (!pendingDecisions.length) {
    objs.push(text('No pending decisions', 520, 198, 13, '#64748b', { width: 380 }));
  } else {
    pendingDecisions.forEach((d, i) => {
      objs.push(text(`→  ${truncate(d.title, 45)}`, 520, 198 + i * 22, 12, '#94a3b8', { width: 380 }));
    });
  }

  // Open assumptions (right column lower)
  if (openAssumptions.length) {
    objs.push(
      text('OPEN ASSUMPTIONS', 520, 290, 11, B.blue, { width: 400, fontWeight: 'bold', charSpacing: 100 }),
    );
    openAssumptions.forEach((a, i) => {
      objs.push(text(`◆  ${truncate(a.title, 45)}`, 520, 310 + i * 22, 12, '#94a3b8', { width: 380 }));
    });
  }

  const slide = buildSlide(objs, B.dark);
  slide.order = 6;
  return slide;
}

// ─── Main service ──────────────────────────────────────────────────────────────

@Injectable()
export class TemplateGeneratorService {
  constructor(private readonly tenantService: TenantService) {}

  async generate(
    projectId: string,
    orgId: string,
    reportType: ReportType,
    startDate?: string,
    endDate?: string,
  ): Promise<SlideData[]> {
    const [
      projectRepo, sprintRepo, cardRepo, teamMemberRepo,
      riskRepo, issueRepo, assumptionRepo, decisionRepo, changeRepo, stakeholderRepo,
    ] = await Promise.all([
      this.tenantService.getRepository(Project),
      this.tenantService.getRepository(Sprint),
      this.tenantService.getRepository(Card),
      this.tenantService.getRepository(TeamMember),
      this.tenantService.getRepository(Risk),
      this.tenantService.getRepository(Issue),
      this.tenantService.getRepository(Assumption),
      this.tenantService.getRepository(Decision),
      this.tenantService.getRepository(Change),
      this.tenantService.getRepository(Stakeholder),
    ]);

    // ── Fetch project ──
    const project = await projectRepo.findOne({ where: { id: projectId } });

    // ── Resolve report period ──
    const { start, end } = this.resolveDateRange(project, reportType, startDate, endDate);

    // ── Fetch sprints (try date-range first, fall back to all if empty) ──
    let sprints = await sprintRepo
      .createQueryBuilder('s')
      .where('s.project_id = :projectId', { projectId })
      .andWhere('s.startDate <= :end', { end: end.toISOString().split('T')[0] })
      .andWhere('s.endDate >= :start', { start: start.toISOString().split('T')[0] })
      .andWhere('s.deletedAt IS NULL')
      .orderBy('s.startDate', 'DESC')
      .getMany();

    if (!sprints.length) {
      sprints = await sprintRepo
        .createQueryBuilder('s')
        .where('s.project_id = :projectId', { projectId })
        .andWhere('s.deletedAt IS NULL')
        .orderBy('s.endDate', 'DESC')
        .limit(5)
        .getMany();
    }

    // ── Fetch cards for those sprints ──
    const sprintIds = sprints.map(s => s.id);
    const cards = sprintIds.length
      ? await cardRepo
          .createQueryBuilder('c')
          .where('c.sprintId IN (:...sprintIds)', { sprintIds })
          .andWhere('c.deletedAt IS NULL')
          .getMany()
      : [];

    // ── Fetch team members for this project ──
    const teamMembers = await teamMemberRepo
      .createQueryBuilder('tm')
      .innerJoin('tm.projects', 'p')
      .where('p.id = :projectId', { projectId })
      .andWhere('tm.deletedAt IS NULL')
      .getMany();

    // ── Fetch project-level artifacts (current state, not date-filtered) ──
    const [risks, issues, assumptions, decisions, changes, stakeholders] = await Promise.all([
      riskRepo.createQueryBuilder('r')
        .where('r.project_id = :projectId', { projectId })
        .andWhere('r.isArchived = false')
        .andWhere('r.deletedAt IS NULL')
        .orderBy('r.riskScore', 'DESC')
        .getMany(),
      issueRepo.createQueryBuilder('i')
        .where('i.project_id = :projectId', { projectId })
        .andWhere('i.isArchived = false')
        .andWhere('i.deletedAt IS NULL')
        .orderBy('i.severity', 'DESC')
        .getMany(),
      assumptionRepo.createQueryBuilder('a')
        .where('a.project_id = :projectId', { projectId })
        .andWhere('a.isArchived = false')
        .andWhere('a.deletedAt IS NULL')
        .orderBy('a.createdAt', 'DESC')
        .getMany(),
      decisionRepo.createQueryBuilder('d')
        .where('d.project_id = :projectId', { projectId })
        .andWhere('d.isArchived = false')
        .andWhere('d.deletedAt IS NULL')
        .orderBy('d.createdAt', 'DESC')
        .getMany(),
      changeRepo.createQueryBuilder('ch')
        .where('ch.projectId = :projectId', { projectId })
        .andWhere('ch.isArchived = false')
        .andWhere('ch.deletedAt IS NULL')
        .orderBy('ch.createdAt', 'DESC')
        .getMany(),
      stakeholderRepo.createQueryBuilder('st')
        .where('st.project_id = :projectId', { projectId })
        .andWhere('st.isArchived = false')
        .andWhere('st.deletedAt IS NULL')
        .getMany(),
    ]);

    // ── Derive overall RAG from risks + issues ──
    const overallRag = this.deriveOverallRag(risks, issues);

    // ── Build slides ──
    const slides = [
      buildCoverSlide(project, reportType, start, end, overallRag),
      buildHealthSnapshotSlide(project, sprints, cards, risks, issues, assumptions, changes, teamMembers),
      buildSprintProgressSlide(sprints, cards),
      buildTeamStakeholdersSlide(teamMembers, cards, stakeholders),
      buildRisksIssuesSlide(risks, issues),
      buildDecisionsChangesSlide(decisions, assumptions, changes),
      buildNextStepsSlide(sprints, risks, decisions, assumptions),
    ];

    slides.forEach((s, i) => { s.order = i; });
    return slides;
  }

  private deriveOverallRag(risks: Risk[], issues: Issue[]): string {
    const activeRisks = risks.filter(r => r.status !== RiskStatus.CLOSED && r.status !== RiskStatus.MITIGATED);
    const activeIssues = issues.filter(i => i.status !== IssueStatus.CLOSED && i.status !== IssueStatus.MITIGATED);

    const isRed =
      activeIssues.some(i => i.severity === IssueSeverity.CRITICAL) ||
      activeRisks.some(r => r.severity === RiskSeverity.VERY_HIGH);
    if (isRed) return 'red';

    const isAmber =
      activeIssues.some(i => i.severity === IssueSeverity.HIGH) ||
      activeRisks.some(r => r.severity === RiskSeverity.HIGH);
    if (isAmber) return 'amber';

    return 'green';
  }

  private resolveDateRange(
    project: Project | null,
    reportType: ReportType,
    startDate?: string,
    endDate?: string,
  ): { start: Date; end: Date } {
    if (startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) };
    }
    const now = new Date();
    switch (reportType) {
      case 'weekly': {
        const day = now.getDay();
        const mon = new Date(now);
        mon.setDate(now.getDate() - ((day + 6) % 7));
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return { start: mon, end: sun };
      }
      case 'biweekly': {
        const s = new Date(now);
        s.setDate(now.getDate() - 13);
        return { start: s, end: now };
      }
      case 'monthly': {
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: s, end: e };
      }
      default: {
        // custom: full project lifecycle from project start to today
        const s = project?.startDate ? new Date(project.startDate) : new Date(now.getFullYear(), 0, 1);
        return { start: s, end: now };
      }
    }
  }
}
