# Dashboard - How It Works

## Overview
- **Purpose**: Project health overview and real-time status monitoring
- **Key Features**: RAG status distribution, sprint progress, team workload, daily snap summary, activity feed
- **Integration**: Projects, Sprints, Cards, Snaps, Team Members
- **Default Landing Page**: First page users see after login

## Database Schema

### ActivityLog Entity (Conceptual)
**Table**: `activity_logs` (if implemented)
**Note**: Based on code analysis, activity tracking appears to be inferred from entity timestamps rather than a dedicated table. This section documents the conceptual structure.

#### Potential Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user` | Relation | User who performed action |
| `action` | Enum | Action type (SNAP_CREATED, CARD_UPDATED, etc.) |
| `entityType` | String | Entity affected (snap, card, sprint) |
| `entityId` | String | ID of affected entity |
| `projectId` | String | Associated project |
| `metadata` | JSONB | Additional context |
| `timestamp` | Timestamp | When action occurred |

**Note**: Current implementation likely derives activity from entity `createdAt`/`updatedAt` fields rather than dedicated log table.

---

## Screens & Pages

### Screen 1: Main Dashboard
**Route**: `/` or `/dashboard`
**Access**: Requires `VIEW_PROJECT` permission
**Component**: `F:\StandupSnap\frontend\src\pages\Dashboard.tsx` (inferred)

#### UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: StandupSnap | Project Selector ▼ | Profile          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │  PROJECT RAG   │  │ SPRINT PROGRESS│  │ DAILY SNAPS    ││
│  │   ● RED        │  │  Day 5 of 14   │  │  8 Added Today ││
│  │   RED Status   │  │  Progress: 35% │  │  3 Pending     ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────┐  ┌───────────────┐│
│  │    RAG DISTRIBUTION CHART            │  │ QUICK ACTIONS ││
│  │                                      │  │               ││
│  │    ████ 60% GREEN                    │  │ + Create Snap││
│  │    ███  25% AMBER                    │  │ + Create Card││
│  │    ██   15% RED                      │  │ → Standup Book│
│  │                                      │  │ → Artifacts  ││
│  └──────────────────────────────────────┘  └───────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │         TEAM WORKLOAD OVERVIEW                           ││
│  │  John Doe        [████████████░░] 80%  GREEN             ││
│  │  Sarah Smith     [████████████████] 120%  RED            ││
│  │  Mike Chen       [██████░░░░░░░░] 40%  BLUE             ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │         RECENT ACTIVITY FEED                             ││
│  │  ⚡ John created snap for "Auth API" - 2 hours ago       ││
│  │  📝 Sarah updated card "Testing Framework" - 3 hours ago││
│  │  ✓ Sprint 5 started - 5 days ago                        ││
│  │  🔒 Day locked by Admin - yesterday                      ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### UI Components

**1. Top Summary Cards** (3 cards):
- **Project RAG Card**:
  - Large RAG indicator (red/amber/green circle)
  - Text: "Project Status: RED" / "AMBER" / "GREEN"
  - Subtext: Based on sprint RAG
- **Sprint Progress Card**:
  - Current sprint name
  - Day X of Y
  - Progress percentage
  - Days remaining
- **Daily Snap Summary Card**:
  - Snaps added today count
  - Cards pending snaps count
  - Assignees pending snaps count
  - Lock status indicator

**2. RAG Distribution Widget**:
- Donut/Pie chart
- Shows distribution of cards by RAG status
- Clickable segments to filter/drill-down
- Legend with counts and percentages

**3. Team Workload Widget**:
- Horizontal bar chart
- Each row = team member
- Bar shows workload percentage
- Color-coded by threshold
- Click to view assignee details

**4. Quick Actions Panel**:
- Create Snap (button)
- Create Card (button)
- View Standup Book (link)
- View Artifacts (link)
- Other common actions

**5. Recent Activity Feed**:
- Chronological list of recent actions
- Icons for different activity types
- Time ago format (e.g., "2 hours ago")
- Pagination or "Load More" button
- Filter by activity type (dropdown)

**6. Daily Standup Summary Widget** (conditional):
- **Only visible when day is locked**
- Date of locked day
- Count of Done items
- Count of ToDo items
- Count of Blockers
- RAG distribution for that day

---

### User Actions

#### Action 1: Load Dashboard for Default Project

**What happens**: Display dashboard data for user's first project

**Frontend**:
1. On page mount, check if user has `projectId` in URL params
2. If no param, auto-select first project user has access to
3. Fetch complete dashboard data

**API Call**:
```http
GET /api/dashboard?projectId={projectId}
Authorization: Bearer {accessToken}
```

**Note**: If `projectId` is omitted, backend auto-selects first project.

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\dashboard\dashboard.controller.ts` - `@Get()`
- **Service**: `F:\StandupSnap\backend\src\dashboard\dashboard.service.ts` - `getDashboardData()`

**Service Logic**:
```typescript
async getDashboardData(userId: string, projectId?: string): Promise<DashboardData> {
  // Get user's projects
  const userProjects = await this.getUserProjects(userId);

  if (userProjects.length === 0) {
    // M11-UC07: Empty state
    return {
      project: null,
      sprintHealth: null,
      teamSummary: [],
      dailySnapSummary: null,
      dailyStandupSummary: { isVisible: false, date: '', doneCount: 0, todoCount: 0, blockerCount: 0, ragDistribution: { green: 0, amber: 0, red: 0 } },
    };
  }

  // M11-UC02: Determine which project to use
  let selectedProject: Project;
  if (projectId) {
    const found = userProjects.find(p => p.id === projectId);
    if (!found) {
      throw new Error('Project not found or not accessible');
    }
    selectedProject = found;
  } else {
    // Auto-select first project
    selectedProject = userProjects[0];
  }

  // Get active sprint
  const activeSprint = await this.sprintRepository.findOne({
    where: { project: { id: selectedProject.id }, status: SprintStatus.ACTIVE },
  });

  if (!activeSprint) {
    // No active sprint
    return {
      project: {
        id: selectedProject.id,
        name: selectedProject.name,
        description: selectedProject.description,
      },
      sprintHealth: null,
      teamSummary: [],
      dailySnapSummary: null,
      dailyStandupSummary: { isVisible: false, date: '', doneCount: 0, todoCount: 0, blockerCount: 0, ragDistribution: { green: 0, amber: 0, red: 0 } },
    };
  }

  // Load all widgets in parallel
  const [sprintHealth, teamSummary, dailySnapSummary, dailyStandupSummary] =
    await Promise.all([
      this.getSprintHealth(activeSprint.id),
      this.getTeamSummary(selectedProject.id, activeSprint.id),
      this.getDailySnapSummary(activeSprint.id),
      this.getDailyStandupSummary(activeSprint.id),
    ]);

  return {
    project: {
      id: selectedProject.id,
      name: selectedProject.name,
      description: selectedProject.description,
    },
    sprintHealth,
    teamSummary,
    dailySnapSummary,
    dailyStandupSummary,
  };
}
```

**Database Queries** (executed in parallel):

```sql
-- 1. Get user's projects
SELECT p.* FROM projects p
INNER JOIN project_members pm ON p.id = pm.project_id
WHERE pm.user_id = ? AND pm.is_active = true

-- 2. Get active sprint
SELECT * FROM sprints
WHERE project_id = ? AND status = 'active'
LIMIT 1

-- 3. Get all cards in sprint (for RAG distribution)
SELECT * FROM cards WHERE sprint_id = ?

-- 4. Get team members for project
SELECT tm.* FROM team_members tm
INNER JOIN project_team_members ptm ON tm.id = ptm.team_member_id
WHERE ptm.project_id = ?

-- 5. Get cards per assignee
SELECT c.*, tm.* FROM cards c
INNER JOIN team_members tm ON c.assignee_id = tm.id
WHERE c.sprint_id = ?

-- 6. Get today's snaps
SELECT s.* FROM snaps s
INNER JOIN cards c ON s.card_id = c.id
WHERE c.sprint_id = ? AND s.snap_date = CURRENT_DATE
```

**Response**:
```json
{
  "project": {
    "id": "proj-1",
    "name": "Project Alpha",
    "description": "Main project"
  },
  "sprintHealth": {
    "sprintId": "sprint-5",
    "sprintName": "Sprint 5",
    "sprintStartDate": "2025-12-16",
    "sprintEndDate": "2025-12-29",
    "currentDay": 5,
    "totalDays": 14,
    "sprintRAG": "red",
    "ragDistribution": {
      "green": 12,
      "amber": 5,
      "red": 3
    }
  },
  "teamSummary": [
    {
      "id": "tm-1",
      "fullName": "John Doe",
      "displayName": "John",
      "designationRole": "Backend Developer",
      "activeCardsCount": 4,
      "assigneeRAG": "amber"
    },
    {
      "id": "tm-2",
      "fullName": "Sarah Smith",
      "displayName": "Sarah",
      "designationRole": "QA / Tester",
      "activeCardsCount": 6,
      "assigneeRAG": "red"
    }
  ],
  "dailySnapSummary": {
    "snapsAddedToday": 8,
    "cardsPendingSnaps": 3,
    "assigneesPendingSnaps": 2,
    "isLocked": false
  },
  "dailyStandupSummary": {
    "isVisible": false,
    "date": "",
    "doneCount": 0,
    "todoCount": 0,
    "blockerCount": 0,
    "ragDistribution": { "green": 0, "amber": 0, "red": 0 }
  }
}
```

**UI Update**:
1. Render all widgets with data
2. Show project name in header
3. Display RAG distribution chart
4. Render team workload bars
5. If `dailyStandupSummary.isVisible = true`, show that widget

**Validations**:
- User must have at least one project
- User must have `VIEW_PROJECT` permission

**Error Handling**:
- **No projects**: Show empty state "No projects assigned. Contact your admin."
- **No active sprint**: Show message "No active sprint. Create a sprint to get started."
- **Network error**: Show retry button

---

#### Action 2: Switch Project Context

**What happens**: Change dashboard to show different project

**Frontend**:
1. User clicks project selector dropdown in header
2. List of user's projects appears
3. User selects different project
4. Dashboard reloads with new project context

**API Call 1** (Get User's Projects):
```http
GET /api/dashboard/projects
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `dashboard.controller.ts` - `@Get('projects')`
- **Service**: `dashboard.service.ts` - `getUserProjects()`

**Service Logic**:
```typescript
async getUserProjects(userId: string): Promise<Project[]> {
  // Get user's project memberships
  const projectMemberships = await this.projectMemberRepository.find({
    where: { user: { id: userId }, isActive: true },
    relations: ['project'],
  });

  if (!projectMemberships || projectMemberships.length === 0) {
    return [];
  }

  return projectMemberships.map(pm => pm.project);
}
```

**Database Query**:
```sql
SELECT p.* FROM projects p
INNER JOIN project_members pm ON p.id = pm.project_id
WHERE pm.user_id = ? AND pm.is_active = true
ORDER BY p.name ASC
```

**Response**:
```json
[
  {
    "id": "proj-1",
    "name": "Project Alpha",
    "description": "Main project"
  },
  {
    "id": "proj-2",
    "name": "Project Beta",
    "description": "Secondary project"
  }
]
```

**API Call 2** (Reload Dashboard):
```http
GET /api/dashboard?projectId={selectedProjectId}
Authorization: Bearer {accessToken}
```

**UI Update**:
1. Update URL with new projectId: `/dashboard?projectId=proj-2`
2. Reload all dashboard widgets
3. Update project name in header
4. Save selected project to localStorage (for next visit)

**Business Rules**:
- User can only see projects they're assigned to
- Project selection persists in browser localStorage
- If saved project no longer accessible, auto-select first available

---

### Widget Details

#### Widget 1: Sprint Health (RAG Distribution)

**Purpose**: Show sprint-level health and card distribution

**Service Method**: `dashboard.service.ts` - `getSprintHealth()`

**Service Logic**:
```typescript
async getSprintHealth(sprintId: string): Promise<SprintHealthWidget | null> {
  const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });

  if (!sprint) {
    return null;
  }

  // Get all cards in sprint
  const cards = await this.cardRepository.find({
    where: { sprint: { id: sprintId } },
  });

  // Calculate RAG distribution
  const ragDistribution = {
    green: cards.filter(c => c.ragStatus === CardRAG.GREEN).length,
    amber: cards.filter(c => c.ragStatus === CardRAG.AMBER).length,
    red: cards.filter(c => c.ragStatus === CardRAG.RED).length,
  };

  // Calculate sprint-level RAG (worst-case)
  let sprintRAG: CardRAG | null = null;
  if (cards.length > 0) {
    const hasRed = cards.some(c => c.ragStatus === CardRAG.RED);
    const hasAmber = cards.some(c => c.ragStatus === CardRAG.AMBER);

    if (hasRed) {
      sprintRAG = CardRAG.RED;
    } else if (hasAmber) {
      sprintRAG = CardRAG.AMBER;
    } else {
      sprintRAG = CardRAG.GREEN;
    }
  }

  // Calculate current day and total days
  const now = new Date();
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);

  const totalMs = endDate.getTime() - startDate.getTime();
  const elapsedMs = now.getTime() - startDate.getTime();

  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
  const currentDay = Math.max(1, Math.min(totalDays, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24))));

  return {
    sprintId: sprint.id,
    sprintName: sprint.name,
    sprintStartDate: String(sprint.startDate),
    sprintEndDate: String(sprint.endDate),
    currentDay,
    totalDays,
    sprintRAG,
    ragDistribution,
  };
}
```

**RAG Calculation Algorithm** (Sprint-Level):
```
Sprint RAG = Worst-case of all card RAGs

IF any card is RED:
  Sprint RAG = RED
ELSE IF any card is AMBER:
  Sprint RAG = AMBER
ELSE IF all cards are GREEN:
  Sprint RAG = GREEN
ELSE (no cards):
  Sprint RAG = null
```

**UI Visualization**:
1. **Top Section**: Large colored circle with sprint RAG status
2. **Middle Section**: Donut chart showing RAG distribution
   - Green slice: X cards (Y%)
   - Amber slice: X cards (Y%)
   - Red slice: X cards (Y%)
3. **Bottom Section**: Sprint progress
   - Day X of Y
   - Progress bar: (currentDay / totalDays) * 100%

**Click Action**:
- Click on chart segment → Filter cards list by that RAG status
- Click on sprint name → Navigate to sprint details

---

#### Widget 2: Team Workload Summary

**Purpose**: Show workload distribution across team members

**Service Method**: `dashboard.service.ts` - `getTeamSummary()`

**Service Logic**:
```typescript
async getTeamSummary(projectId: string, sprintId: string): Promise<TeamMemberSummary[]> {
  // Get all team members for project
  const project = await this.projectRepository.findOne({
    where: { id: projectId },
    relations: ['teamMembers'],
  });

  if (!project || !project.teamMembers) {
    return [];
  }

  const result: TeamMemberSummary[] = [];

  for (const tm of project.teamMembers) {
    // Get active cards for assignee in this sprint
    const cards = await this.cardRepository.find({
      where: {
        assignee: { id: tm.id },
        sprint: { id: sprintId },
      },
    });

    // Calculate assignee RAG (worst-case)
    let assigneeRAG: CardRAG | null = null;
    if (cards.length > 0) {
      const hasRed = cards.some(c => c.ragStatus === CardRAG.RED);
      const hasAmber = cards.some(c => c.ragStatus === CardRAG.AMBER);

      if (hasRed) {
        assigneeRAG = CardRAG.RED;
      } else if (hasAmber) {
        assigneeRAG = CardRAG.AMBER;
      } else {
        assigneeRAG = CardRAG.GREEN;
      }
    }

    result.push({
      id: tm.id,
      fullName: tm.fullName,
      displayName: tm.displayName,
      designationRole: tm.designationRole,
      activeCardsCount: cards.length,
      assigneeRAG,
    });
  }

  return result;
}
```

**Assignee RAG Calculation** (Same as Sprint):
```
Assignee RAG = Worst-case of assignee's card RAGs

IF any card is RED:
  Assignee RAG = RED
ELSE IF any card is AMBER:
  Assignee RAG = AMBER
ELSE IF all cards are GREEN:
  Assignee RAG = GREEN
ELSE (no cards):
  Assignee RAG = null
```

**UI Visualization**:
1. Horizontal bar chart
2. Each row shows:
   - Assignee name
   - Active cards count badge
   - Workload bar (calculated frontend or backend)
   - RAG status indicator (colored dot)
3. Sorted by: Highest workload first (descending)

**Frontend Workload Calculation** (if not in backend):
```typescript
const workloadData = teamSummary.map(assignee => {
  // Fetch cards for assignee (from cache or API)
  const activeCards = cards.filter(c =>
    c.assignee?.id === assignee.id &&
    c.status !== 'completed' &&
    c.status !== 'closed'
  );

  const totalET = activeCards.reduce((sum, c) => sum + c.estimatedTime, 0);
  const availableHours = sprintDaysRemaining * 6; // 6 productive hours/day
  const workload = (totalET / availableHours) * 100;

  return {
    ...assignee,
    workload: Math.round(workload),
  };
});
```

**Click Action**:
- Click on assignee → Navigate to assignee details page

---

#### Widget 3: Daily Snap Summary

**Purpose**: Show today's snap status

**Service Method**: `dashboard.service.ts` - `getDailySnapSummary()`

**Service Logic**:
```typescript
async getDailySnapSummary(sprintId: string): Promise<DailySnapSummaryWidget | null> {
  const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });

  if (!sprint) {
    return null;
  }

  // Get all cards in sprint
  const cards = await this.cardRepository.find({
    where: { sprint: { id: sprintId } },
    relations: ['assignee'],
  });

  // Get today's date (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  // Get all snaps for today
  const cardIds = cards.map(c => c.id);

  let snapsToday: Snap[] = [];
  if (cardIds.length > 0) {
    snapsToday = await this.snapRepository
      .createQueryBuilder('snap')
      .where('snap.card_id IN (:...cardIds)', { cardIds })
      .andWhere('snap.snapDate = :today', { today })
      .getMany();
  }

  // Cards that have snaps today
  const cardsWithSnapsToday = new Set(snapsToday.map(s => s.cardId));

  // Cards pending snaps
  const cardsPendingSnaps = cards.filter(c => !cardsWithSnapsToday.has(c.id)).length;

  // Assignees pending snaps
  const assigneesPendingSnapsSet = new Set<string>();
  cards.forEach(card => {
    if (!cardsWithSnapsToday.has(card.id) && card.assignee) {
      assigneesPendingSnapsSet.add(card.assignee.id);
    }
  });

  // Check if today's snaps are locked
  const isLocked = snapsToday.length > 0 && snapsToday.some(s => s.isLocked);

  return {
    snapsAddedToday: snapsToday.length,
    cardsPendingSnaps,
    assigneesPendingSnaps: assigneesPendingSnapsSet.size,
    isLocked,
  };
}
```

**Calculation Logic**:
1. **Snaps Added Today**: Count of snaps with `snapDate = CURRENT_DATE`
2. **Cards Pending Snaps**: Count of cards WITHOUT snap for today
3. **Assignees Pending Snaps**: Count of unique assignees with cards but no snaps today
4. **Is Locked**: Any snap for today has `isLocked = true`

**UI Visualization**:
- **Top Number**: Large count of snaps added today (e.g., "8")
- **Middle Section**:
  - "3 cards pending snaps" (warning if > 0)
  - "2 assignees pending snaps" (warning if > 0)
- **Bottom Section**: Lock status badge (if locked)

**Color Coding**:
- **Green**: All cards have snaps today
- **Amber**: Some cards pending (< 50%)
- **Red**: Many cards pending (>= 50%)

**Click Action**:
- Click widget → Navigate to today's snaps page or standup book

---

#### Widget 4: Daily Standup Summary (Conditional)

**Purpose**: Show summary when day is locked

**Service Method**: `dashboard.service.ts` - `getDailyStandupSummary()`

**Service Logic**:
```typescript
async getDailyStandupSummary(sprintId: string): Promise<DailyStandupSummaryWidget> {
  // Get today's snaps
  const today = new Date().toISOString().split('T')[0];

  const cards = await this.cardRepository.find({
    where: { sprint: { id: sprintId } },
  });

  const cardIds = cards.map(c => c.id);

  let snapsToday: Snap[] = [];
  if (cardIds.length > 0) {
    snapsToday = await this.snapRepository
      .createQueryBuilder('snap')
      .where('snap.card_id IN (:...cardIds)', { cardIds })
      .andWhere('snap.snapDate = :today', { today })
      .getMany();
  }

  // Check if snaps are locked
  const isLocked = snapsToday.length > 0 && snapsToday.some(s => s.isLocked);

  if (!isLocked) {
    return {
      isVisible: false,
      date: '',
      doneCount: 0,
      todoCount: 0,
      blockerCount: 0,
      ragDistribution: { green: 0, amber: 0, red: 0 },
    };
  }

  // Count done/todo/blockers
  let doneCount = 0;
  let todoCount = 0;
  let blockerCount = 0;

  snapsToday.forEach(snap => {
    if (snap.done) doneCount++;
    if (snap.toDo) todoCount++;
    if (snap.blockers) blockerCount++;
  });

  // RAG distribution for today's snaps
  const ragDistribution = {
    green: snapsToday.filter(s => s.finalRAG === 'green').length,
    amber: snapsToday.filter(s => s.finalRAG === 'amber').length,
    red: snapsToday.filter(s => s.finalRAG === 'red').length,
  };

  return {
    isVisible: true,
    date: today,
    doneCount,
    todoCount,
    blockerCount,
    ragDistribution,
  };
}
```

**Visibility Logic**:
```
IF today's snaps are locked (at least one snap has isLocked = true):
  Show widget
ELSE:
  Hide widget
```

**Count Logic**:
- **Done Count**: Number of snaps with non-empty `done` field
- **ToDo Count**: Number of snaps with non-empty `toDo` field
- **Blocker Count**: Number of snaps with non-empty `blockers` field

**UI Visualization** (when visible):
- **Header**: "Daily Standup Summary - [Date]"
- **Counts Section**:
  - Done: 8 items ✓
  - To Do: 10 items →
  - Blockers: 2 items ⚠
- **RAG Distribution**: Mini donut chart
  - 5 GREEN, 2 AMBER, 1 RED

**Click Action**:
- Click widget → Navigate to locked day details in Standup Book

---

#### Widget 5: Recent Activity Feed

**Purpose**: Show chronological list of recent actions

**Note**: Based on code analysis, no dedicated `ActivityLog` entity exists. Activity can be inferred from:
1. Snap creation timestamps (`snaps.createdAt`)
2. Card updates (`cards.updatedAt`)
3. Sprint status changes
4. Daily locks

**Implementation Strategy** (Frontend or Backend):

**Option A: Backend Aggregation** (Recommended)
```typescript
async getRecentActivity(projectId: string, limit: number = 20): Promise<Activity[]> {
  const activities: Activity[] = [];

  // Get recent snaps
  const recentSnaps = await this.snapRepository
    .createQueryBuilder('snap')
    .innerJoin('snap.card', 'card')
    .innerJoin('card.project', 'project')
    .where('project.id = :projectId', { projectId })
    .orderBy('snap.createdAt', 'DESC')
    .limit(10)
    .getMany();

  recentSnaps.forEach(snap => {
    activities.push({
      type: 'SNAP_CREATED',
      timestamp: snap.createdAt,
      user: snap.createdBy,
      entity: 'snap',
      entityId: snap.id,
      description: `created snap for "${snap.card.title}"`,
    });
  });

  // Get recent card updates
  const recentCards = await this.cardRepository
    .createQueryBuilder('card')
    .where('card.projectId = :projectId', { projectId })
    .orderBy('card.updatedAt', 'DESC')
    .limit(10)
    .getMany();

  recentCards.forEach(card => {
    activities.push({
      type: 'CARD_UPDATED',
      timestamp: card.updatedAt,
      entity: 'card',
      entityId: card.id,
      description: `updated card "${card.title}"`,
    });
  });

  // Get recent sprint events
  const recentSprints = await this.sprintRepository
    .createQueryBuilder('sprint')
    .where('sprint.projectId = :projectId', { projectId })
    .orderBy('sprint.updatedAt', 'DESC')
    .limit(5)
    .getMany();

  recentSprints.forEach(sprint => {
    activities.push({
      type: 'SPRINT_UPDATED',
      timestamp: sprint.updatedAt,
      entity: 'sprint',
      entityId: sprint.id,
      description: `Sprint "${sprint.name}" ${sprint.status}`,
    });
  });

  // Sort all activities by timestamp (descending)
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return activities.slice(0, limit);
}
```

**Option B: Frontend Aggregation** (Simpler)
```typescript
// Fetch recent data from existing endpoints
const recentSnaps = await api.getRecentSnaps(projectId, limit: 10);
const recentCards = await api.getRecentCards(projectId, limit: 10);

// Combine and sort
const activities = [
  ...recentSnaps.map(s => ({
    type: 'snap_created',
    timestamp: s.createdAt,
    description: `created snap for "${s.card.title}"`,
  })),
  ...recentCards.map(c => ({
    type: 'card_updated',
    timestamp: c.updatedAt,
    description: `updated card "${c.title}"`,
  })),
].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
```

**Activity Types**:
| Type | Icon | Description Format |
|------|------|-------------------|
| `SNAP_CREATED` | ⚡ | "{User} created snap for {Card}" |
| `CARD_UPDATED` | 📝 | "{User} updated card {Card}" |
| `CARD_CREATED` | ➕ | "{User} created card {Card}" |
| `SPRINT_STARTED` | ✓ | "Sprint {Sprint} started" |
| `SPRINT_CLOSED` | 🔒 | "Sprint {Sprint} closed" |
| `DAY_LOCKED` | 🔒 | "{User} locked day {Date}" |
| `MOM_CREATED` | 📋 | "{User} created MOM for {Date}" |

**UI Visualization**:
1. **List Format**: Chronological list, newest first
2. **Each Item**:
   - Icon (based on type)
   - Description text
   - Time ago (e.g., "2 hours ago", "yesterday")
   - Click to navigate to entity
3. **Pagination**: "Load More" button or infinite scroll
4. **Filter Dropdown**: Filter by activity type

**Time Ago Formatting**:
```typescript
function formatTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return timestamp.toLocaleDateString();
}
```

**Click Action**:
- Click on activity → Navigate to relevant entity:
  - Snap → Card details
  - Card → Card details
  - Sprint → Sprint details
  - Day Lock → Standup Book day
  - MOM → MOM view

---

### Widget 6: Quick Actions Panel

**Purpose**: Provide shortcuts to common actions

**UI Components**:
1. **Create Snap** (button):
   - Icon: Lightning bolt ⚡
   - Action: Navigate to `/snaps/create`
   - Enabled: If active sprint exists
2. **Create Card** (button):
   - Icon: Plus ➕
   - Action: Navigate to `/cards/create`
   - Enabled: If active sprint exists
3. **View Standup Book** (link):
   - Icon: Book 📖
   - Action: Navigate to `/standup-book`
4. **View Artifacts** (link):
   - Icon: Folder 📁
   - Action: Navigate to `/artifacts`
5. **Project Settings** (link):
   - Icon: Gear ⚙️
   - Action: Navigate to `/projects/:id/settings`
   - Visible: Only if user has `EDIT_PROJECT` permission

**Business Rules**:
- Buttons disabled if no active sprint
- Show tooltip explaining why disabled
- Permissions control visibility

---

## Complete User Journeys

### Journey 1: Daily Morning Routine - Check Project Health

**Actors**: Scrum Master, Product Owner

**Preconditions**:
- User logged in
- Active sprint exists
- Team has created snaps

**Steps**:
1. User logs in
2. Dashboard loads automatically
3. User sees Project RAG card: **RED**
4. User notices RAG Distribution: 3 RED, 5 AMBER, 12 GREEN
5. User clicks on RED segment of chart
6. Navigates to Cards List filtered by RED status
7. Sees 3 cards in critical state
8. Reviews each card:
   - Card 1: "Authentication API" - John Doe - Blocker: SSL cert issue
   - Card 2: "Payment Gateway" - Sarah Smith - Blocker: API key expired
   - Card 3: "Database Migration" - Mike Chen - Blocker: Permission denied
9. User identifies common theme: Infrastructure blockers
10. Returns to Dashboard
11. Checks Team Workload Widget
12. Notices Sarah at 120% (overloaded, RED)
13. Clicks on Sarah's name
14. Views Assignee Details
15. Sees 6 active cards, 3 are RED
16. Decides to reassign 2 cards to Mike (40% workload)
17. Returns to Dashboard
18. Checks Daily Snap Summary: 8 snaps today, 3 cards pending
19. Clicks on Activity Feed
20. Sees John created snap 2 hours ago mentioning blocker
21. Schedules standup to discuss infrastructure issues

**Expected Outcome**: SM identified critical issues, balanced workload, and planned intervention

---

### Journey 2: End of Day - Lock Daily Snaps

**Actors**: Scrum Master

**Preconditions**:
- Active sprint
- All team members created snaps for today
- Day is not yet locked

**Steps**:
1. User navigates to Dashboard (or already there)
2. Checks Daily Snap Summary widget
3. Sees: "10 snaps added today, 0 cards pending, 0 assignees pending"
4. All snaps submitted ✓
5. Clicks on "Standup Book" from Quick Actions
6. Navigates to calendar view
7. Clicks on today's date
8. Day details page loads showing all 10 snaps
9. Reviews snaps for completeness
10. Clicks "Lock Day" button
11. Confirmation modal appears
12. Confirms lock
13. API processes:
    - Creates DailyLock record
    - Marks all snaps as locked
    - Generates daily summary
14. Success toast: "Day locked successfully"
15. Returns to Dashboard
16. Daily Snap Summary now shows lock icon
17. **Daily Standup Summary widget appears** (now visible)
18. Widget shows:
    - Date: Today
    - Done: 10 items
    - To Do: 12 items
    - Blockers: 2 items
    - RAG: 8 GREEN, 2 AMBER, 0 RED
19. Clicks on Standup Summary widget
20. Navigates to locked day in Standup Book
21. Views aggregated summary
22. Clicks "Create MOM" button
23. Creates meeting minutes for the day
24. Returns to Dashboard

**Expected Outcome**: Day locked, summary generated, MOM created, dashboard updated

---

### Journey 3: PMO Weekly Review

**Actors**: PMO

**Preconditions**:
- PMO has read-only access
- Multiple projects exist
- Historical data available

**Steps**:
1. PMO logs in
2. Dashboard loads for Project Alpha (first project)
3. PMO sees Sprint RAG: AMBER
4. Notes RAG Distribution: 60% GREEN, 25% AMBER, 15% RED
5. Clicks Project Selector dropdown
6. Switches to Project Beta
7. Dashboard reloads
8. Sprint RAG: GREEN
9. RAG Distribution: 85% GREEN, 15% AMBER, 0% RED
10. PMO compares projects mentally
11. Returns to Project Alpha (at risk)
12. Clicks on Team Workload widget
13. Sees Sarah at 120% (overloaded)
14. Clicks on Sarah's name
15. Views performance metrics:
    - Completion Rate: 75%
    - Blocker Rate: 30% (high)
16. PMO notes concern
17. Returns to Dashboard
18. Checks Activity Feed
19. Scrolls through recent activities
20. Sees pattern: Many card updates, few snaps
21. Indicates low team engagement
22. PMO schedules meeting with Scrum Master
23. Exports dashboard metrics (if feature exists)
24. Prepares weekly status report

**Expected Outcome**: PMO identified at-risk project and overloaded team member for follow-up

---

## API Endpoints Summary

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/api/dashboard?projectId=` | `VIEW_PROJECT` | Get complete dashboard data |
| `GET` | `/api/dashboard/projects` | `VIEW_PROJECT` | Get user's accessible projects |

**Note**: Dashboard is a read-only aggregation endpoint. All data is pulled from existing entities (Projects, Sprints, Cards, Snaps, Team Members).

---

## Permissions & RBAC

| Action | Permission | Scrum Master | Product Owner | PMO |
|--------|------------|--------------|---------------|-----|
| View dashboard | `VIEW_PROJECT` | Yes | Yes | Yes |
| Switch projects | `VIEW_PROJECT` | Yes | Yes | Yes |
| View all widgets | `VIEW_PROJECT` | Yes | Yes | Yes |
| Create snap (Quick Action) | `CREATE_SNAP` | Yes | Yes | No |
| Create card (Quick Action) | `CREATE_CARD` | Yes | Yes | No |
| Lock day (from widget) | `EDIT_SPRINT` | Yes | Yes | No |

**Access Rules**:
- User can only see projects they're assigned to (via `project_members`)
- All widgets respect project-level permissions
- Quick Actions disabled if user lacks permission

---

## Business Rules

### RAG Aggregation Rules

**Card RAG** (from latest snap):
- Latest snap's `finalRAG` becomes card's `ragStatus`

**Assignee RAG** (from assigned cards):
```
IF any active card is RED → Assignee is RED
ELSE IF any active card is AMBER → Assignee is AMBER
ELSE → Assignee is GREEN
```

**Sprint RAG** (from all cards in sprint):
```
IF any card is RED → Sprint is RED
ELSE IF any card is AMBER → Sprint is AMBER
ELSE → Sprint is GREEN
```

**Project RAG** (from active sprint):
```
Project RAG = Active Sprint RAG
```

### Dashboard Refresh Rules
1. **On Load**: Fetch all data
2. **Real-time Updates**: Not implemented (requires WebSocket)
3. **Manual Refresh**: User can refresh page
4. **Auto-refresh**: Optional polling every 5 minutes (configurable)

### Empty State Rules
1. **No Projects**: Show "No projects assigned. Contact admin."
2. **No Active Sprint**: Show "No active sprint. Create sprint to get started."
3. **No Cards**: Show "No cards in sprint. Create your first card."
4. **No Snaps Today**: Show "No snaps yet today. Team members should update."

---

## Data Flow Diagrams

### Dashboard Load Flow
```
User navigates to Dashboard →
Frontend checks URL for projectId →
If no projectId:
  GET /api/dashboard/projects →
  Auto-select first project →
GET /api/dashboard?projectId={id} →
Backend:
  Get user's projects (validation) →
  Get active sprint for project →
  Parallel fetch:
    - Sprint health & RAG distribution
    - Team summary with assignee RAGs
    - Daily snap summary
    - Daily standup summary (if locked) →
  Aggregate all data →
  Return DashboardData →
Frontend:
  Render all widgets
  Display charts
  Show activity feed
  Enable quick actions
```

### Project Switch Flow
```
User clicks Project Selector →
GET /api/dashboard/projects →
Display project list →
User selects Project Beta →
Update URL: ?projectId=proj-beta →
GET /api/dashboard?projectId=proj-beta →
Backend re-aggregates data for new project →
Frontend re-renders all widgets →
Save selection to localStorage
```

### RAG Propagation Flow
```
User creates Snap for Card →
AI calculates suggested RAG (red/amber/green) →
SM reviews and sets final RAG →
Snap.finalRAG = "red" →
Card RAG Update Trigger:
  Card.ragStatus = Snap.finalRAG →
  Card.updatedAt = NOW() →
Assignee RAG Calculation:
  Get all active cards for assignee →
  Calculate worst-case RAG →
  Return assigneeRAG in dashboard response →
Sprint RAG Calculation:
  Get all cards in sprint →
  Calculate worst-case RAG →
  Return sprintRAG in dashboard response →
Project RAG:
  Project RAG = Active Sprint RAG →
Dashboard displays updated RAG cascade
```

---

## Common Issues & Solutions

### Issue 1: Dashboard Shows Stale Data
**Symptoms**: Dashboard metrics don't reflect recent changes (new snap created but not shown)
**Root Cause**: Frontend caching or backend caching, no real-time updates
**Solution**:
- Implement manual refresh button
- Clear cache on relevant actions
- Add auto-refresh polling (every 5 mins)
- **Future**: Implement WebSocket for real-time updates

**Prevention**: Add "Last Updated" timestamp to dashboard

---

### Issue 2: Sprint RAG is GREEN but Cards Show RED
**Symptoms**: Mismatch between sprint RAG and actual card RAGs
**Root Cause**: Calculation error in worst-case logic
**Solution**:
- Debug `getSprintHealth()` method
- Check query: `SELECT * FROM cards WHERE sprint_id = ?`
- Verify cards have `ragStatus` set
- Ensure worst-case logic is correct:
  ```typescript
  const hasRed = cards.some(c => c.ragStatus === CardRAG.RED);
  if (hasRed) {
    sprintRAG = CardRAG.RED; // Should be RED, not GREEN
  }
  ```

**Prevention**: Add unit tests for RAG calculation logic

---

### Issue 3: Dashboard Crashes on No Active Sprint
**Symptoms**: Dashboard shows error when no active sprint
**Root Cause**: Null pointer when accessing sprint properties
**Solution**:
- Backend returns `sprintHealth: null` when no active sprint
- Frontend checks for null before rendering:
  ```typescript
  if (dashboardData.sprintHealth === null) {
    return <EmptyState message="No active sprint" />;
  }
  ```

**Prevention**: Always handle null cases in UI

---

### Issue 4: Team Workload Shows Incorrect Percentages
**Symptoms**: Workload percentages don't add up or seem wrong
**Root Cause**: Incorrect calculation of available hours or total ET
**Solution**:
- Check `estimatedTime` on cards (should not be null or 0)
- Verify sprint days calculation:
  ```typescript
  const sprintDaysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000*60*60*24)));
  const availableHours = sprintDaysRemaining * 6; // 6 hours/day
  ```
- Check active cards filter (exclude completed/closed)

**Prevention**: Validate ET is required when creating cards

---

### Issue 5: Activity Feed Shows Duplicate Entries
**Symptoms**: Same activity appears multiple times
**Root Cause**: Aggregating from multiple sources without deduplication
**Solution**:
- Deduplicate by unique ID before displaying:
  ```typescript
  const uniqueActivities = activities.reduce((acc, activity) => {
    if (!acc.find(a => a.entityId === activity.entityId && a.type === activity.type)) {
      acc.push(activity);
    }
    return acc;
  }, []);
  ```

**Prevention**: Use Set or Map for deduplication

---

### Issue 6: Daily Standup Summary Not Appearing After Lock
**Symptoms**: Day is locked but widget doesn't show
**Root Cause**: `isVisible` logic checks if snaps are locked incorrectly
**Solution**:
- Check query for locked snaps:
  ```typescript
  const isLocked = snapsToday.length > 0 && snapsToday.some(s => s.isLocked);
  ```
- Verify at least one snap has `isLocked = true`
- Check frontend conditional rendering:
  ```typescript
  {dailyStandupSummary.isVisible && <DailyStandupSummaryWidget ... />}
  ```

**Prevention**: Test lock/unlock flow thoroughly

---

## Performance Considerations

### 1. Dashboard Load Time
**Challenge**: Fetching all widgets in parallel can be slow for large datasets
**Optimization**:
- Use database indexes on frequently queried fields:
  - `cards.sprint_id`
  - `cards.assignee_id`
  - `snaps.snap_date`
  - `snaps.card_id`
- Implement caching (Redis) for dashboard data
- Add pagination to Activity Feed
- Lazy load non-critical widgets

### 2. RAG Distribution Chart Rendering
**Challenge**: Rendering donut chart with D3/Chart.js can lag
**Optimization**:
- Use lightweight chart library (Recharts, nivo)
- Memoize chart data in frontend
- Debounce re-renders on data updates

### 3. Real-time Updates
**Challenge**: Polling every minute causes high server load
**Optimization**:
- Implement WebSocket for real-time updates
- Use Server-Sent Events (SSE) for one-way updates
- Only refresh on user action (click, navigation)

---

## Security Considerations

### 1. Project Data Isolation
**Risk**: User accessing dashboard data for unauthorized project
**Mitigation**:
- Backend validates user has access to project:
  ```typescript
  const userProjects = await this.getUserProjects(userId);
  const found = userProjects.find(p => p.id === projectId);
  if (!found) {
    throw new ForbiddenException('Access denied');
  }
  ```

### 2. Permission-Based Widget Visibility
**Risk**: PMO seeing Quick Action buttons they can't use
**Mitigation**:
- Frontend checks permissions before rendering actions
- Backend validates permissions on API calls

### 3. Activity Feed Privacy
**Risk**: Exposing sensitive activities to unauthorized users
**Mitigation**:
- Only show activities for projects user has access to
- Filter activities by user's role (PMO sees less than SM)

---

## Testing Scenarios

### Test Case 1: Dashboard Loads for User with Multiple Projects
**Given**: User has access to 3 projects
**When**: User navigates to dashboard
**Then**:
- Project selector shows all 3 projects
- Dashboard loads data for first project (alphabetically)
- All widgets display data correctly

### Test Case 2: RAG Calculation Cascade
**Given**: Sprint has 20 cards (15 GREEN, 3 AMBER, 2 RED)
**When**: Dashboard loads
**Then**:
- RAG Distribution shows: 15 GREEN, 3 AMBER, 2 RED
- Sprint RAG = RED (worst-case)
- Project RAG = RED (from sprint)

### Test Case 3: Daily Standup Summary Visibility
**Given**: Day is locked with 10 snaps
**When**: Dashboard loads
**Then**:
- Daily Standup Summary widget is visible
- Shows correct counts (Done, ToDo, Blockers)
- Shows RAG distribution for locked day

### Test Case 4: Empty State Handling
**Given**: User has no projects
**When**: Dashboard loads
**Then**:
- Shows "No projects assigned" message
- No widgets displayed
- No errors thrown

---

## Future Enhancements

### 1. Real-Time Dashboard Updates (WebSocket)
**Feature**: Live updates without page refresh
**Implementation**:
- Backend emits events on snap creation, card updates
- Frontend subscribes to project-specific channel
- Updates widgets in real-time

### 2. Customizable Dashboard Layout
**Feature**: Users can arrange/resize widgets
**Implementation**:
- Drag-and-drop grid layout (react-grid-layout)
- Save layout preferences per user
- Add/remove widgets based on role

### 3. Dashboard Export (PDF/Excel)
**Feature**: Export dashboard metrics as report
**Implementation**:
- Generate PDF with charts and metrics
- Excel export with raw data tables
- Scheduled email reports (daily/weekly)

### 4. Predictive Analytics Widget
**Feature**: AI-powered predictions (sprint completion, at-risk cards)
**Implementation**:
- Analyze historical data
- Predict sprint completion date
- Identify cards likely to become RED
- Alert SM proactively

### 5. Burndown Chart Widget
**Feature**: Show sprint burndown/burnup chart
**Implementation**:
- Track story points or hours remaining daily
- Compare actual vs ideal burndown
- Predict sprint completion

---

**End of Dashboard Documentation**
