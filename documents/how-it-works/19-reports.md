# Reports - How It Works

## Overview
- **Purpose**: Generate, view, and export daily standup summaries with comprehensive RAG health metrics
- **Key Features**: Daily summary reports, RAG health overview, multi-format exports (TXT, DOCX), sprint/date filtering, assignee-level drill-down
- **Integration**: Projects, Sprints, Cards, Snaps (Daily Standups), Team Members
- **Report Types**: Daily Standup Summary Reports (locked day summaries)
- **Export Formats**: Plain Text (.txt), Microsoft Word (.docx)

## Database Schema

### DailySummary Entity
**Table**: `daily_summaries`
**File**: `F:\StandupSnap\backend\src\entities\daily-summary.entity.ts`

Stores aggregated daily standup summaries generated after daily snap locks.

#### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto-generated |
| `sprint` | Relation | Parent sprint | ManyToOne, CASCADE delete |
| `sprintId` | String | Sprint reference | Required, indexed |
| `summaryDate` | Date | Date of summary (YYYY-MM-DD) | Required, indexed |
| `done` | Text | Consolidated "Done" items | Nullable |
| `toDo` | Text | Consolidated "To Do" items | Nullable |
| `blockers` | Text | Consolidated "Blockers" | Nullable |
| `ragOverview` | JSONB | RAG health metrics (see structure below) | Nullable |
| `fullData` | JSONB | Complete structured data by assignee | Required |
| `createdAt` | Timestamp | Summary generation time | Auto-generated |

#### RAG Overview JSONB Structure
```typescript
{
  cardLevel: {
    green: number;   // Count of cards with GREEN RAG
    amber: number;   // Count of cards with AMBER RAG
    red: number;     // Count of cards with RED RAG
  };
  assigneeLevel: {
    green: number;   // Count of assignees with GREEN overall RAG
    amber: number;   // Count of assignees with AMBER overall RAG
    red: number;     // Count of assignees with RED overall RAG
  };
  sprintLevel: string; // Overall sprint health: 'green', 'amber', or 'red'
}
```

**Sprint-Level RAG Calculation**:
- If `cardLevel.red > cardLevel.green + cardLevel.amber`: Sprint = **RED**
- Else if `cardLevel.amber > cardLevel.green + cardLevel.red`: Sprint = **AMBER**
- Else if `cardLevel.green > cardLevel.amber + cardLevel.red`: Sprint = **GREEN**
- Else (no clear majority): Use worst status present (red > amber > green)

#### Full Data JSONB Structure
```typescript
{
  byAssignee: [
    {
      assignee: string;  // Full name or "Unassigned"
      snaps: [
        {
          cardTitle: string;
          done: string | null;
          toDo: string | null;
          blockers: string | null;
          rag: 'green' | 'amber' | 'red';
        }
      ]
    }
  ]
}
```

#### Indexes
- `idx_daily_summary_sprint`: `(sprint_id)`
- `idx_daily_summary_date`: `(summary_date)`
- Unique constraint: `(sprint_id, summary_date)` - one summary per sprint per day

---

## Screens & Pages

### Screen 1: Reports Page
**Route**: `/reports`
**Access**: Requires `VIEW_SNAP` permission
**Component**: `F:\StandupSnap\frontend\src\pages\ReportsPage.tsx`

The Reports page displays all locked daily summaries for a selected project, with filtering and export capabilities.

#### UI Layout

```
┌────────────────────────────────────────────────────────────────┐
│  [Gradient Header]                                            │
│  📊 Reports                                                    │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Filters:                                                      │
│                                                                │
│  [Project ▼]  [Sprint ▼]  [From Date]  [To Date]  [Clear]   │
│   MyProject    All Sprints  2024-01-01   2024-12-31           │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  📄 Monday, January 15, 2024                            [▼]   │
│     Sprint 5                           🟢 GREEN  3🟢 1🟡 0🔴 │
├────────────────────────────────────────────────────────────────┤
│  [EXPANDED VIEW]                                              │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  📊 Sprint Health Overview                               │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                │ │
│  │  │ Day  │  │Green │  │Amber │  │ Red  │                │ │
│  │  │ RAG  │  │Cards │  │Cards │  │Cards │                │ │
│  │  │GREEN │  │  3   │  │  1   │  │  0   │                │ │
│  │  └──────┘  └──────┘  └──────┘  └──────┘                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  📦 Card-Level Updates                                   │ │
│  │                                                           │ │
│  │  👤 John Doe                                    [2 cards]│ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │ User Authentication [GREEN]                        │ │ │
│  │  │ ✅ Done: Completed login API endpoint             │ │ │
│  │  │ → To Do: Will implement password reset             │ │ │
│  │  │ ⚠ Blockers: No blockers reported                   │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  │  👤 Sarah Smith                                 [1 cards]│ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │ Dashboard UI [AMBER]                               │ │ │
│  │  │ ✅ Done: Created chart components                  │ │ │
│  │  │ → To Do: Integrate with backend APIs               │ │ │
│  │  │ ⚠ Blockers: Waiting for API documentation          │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Download TXT] [Download Word]                               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  📄 Friday, January 12, 2024                            [>]   │
│     Sprint 5                           🟡 AMBER  2🟢 2🟡 1🔴 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  [Empty State]                                                │
│  📊 No Summaries Found                                        │
│  No locked daily summaries available for the selected filters.│
│  Summaries are generated when daily snaps are locked.         │
└────────────────────────────────────────────────────────────────┘
```

#### UI Components

**1. Header Section**:
- Gradient background (primary-500 to primary-600)
- Title: "Reports"
- Fixed position at top

**2. Filters Section** (4 filters + clear button):
- **Project Selector** (dropdown):
  - Shows all projects user has access to
  - Required filter (auto-selects last used or first project)
  - Triggers data reload on change
- **Sprint Filter** (dropdown):
  - "All Sprints" option (default)
  - Lists all sprints in selected project
  - Optional filter
- **From Date** (date input):
  - Optional start date filter
  - Label: "FROM DATE"
  - HTML5 date picker
- **To Date** (date input):
  - Optional end date filter
  - Label: "TO DATE"
  - HTML5 date picker
- **Clear Filters** (button):
  - Resets sprint, startDate, endDate to defaults
  - Keeps project selection

**3. Summary Cards** (collapsible list):
Each summary displays as a card with header and expandable content.

**Summary Header** (always visible):
- **Date Badge**: Full date format (e.g., "Monday, January 15, 2024")
- **Sprint Name**: Below date
- **Overall RAG Badge**: Colored badge with sprint-level RAG
- **Quick Stats**: Green/Amber/Red card counts (desktop only)
- **Expand/Collapse Icon**: Chevron icon (rotates when expanded)

**Summary Expanded Content** (shown when clicked):
- **Download Actions** (top-right):
  - TXT button: Gray outline button with download icon
  - Word button: Blue gradient button with download icon
- **Sprint Health Overview** (stats grid):
  - 4 stat cards in 2x2 grid (mobile) or 1x4 (desktop):
    1. Overall Day RAG (colored badge)
    2. Green Cards count (emerald background)
    3. Amber Cards count (amber background)
    4. Red Cards count (red background)
- **Card-Level Updates** (assignee sections):
  - Grouped by assignee
  - Each assignee section is collapsible (default: expanded)
  - Assignee header shows name and card count
  - Each card shows:
    - Card title with RAG badge
    - Done (green background)
    - To Do (blue background)
    - Blockers (red background)

**4. Empty State**:
- Shown when no summaries match filters
- Icon: Report/chart icon (gray)
- Message: "No Summaries Found"
- Explanation: "No locked daily summaries available for the selected filters. Summaries are generated when daily snaps are locked."

**5. Loading State**:
- Animated pulse icon (gradient background)
- Centered on screen

**6. Error State**:
- Red background banner
- Error message text

---

## Complete User Journeys

### Journey 1: View Daily Standup Reports

**Actor**: SM or any team member with `VIEW_SNAP` permission
**Precondition**: At least one day's snaps have been locked and summary generated
**Goal**: Review daily standup summaries for a project

#### Flow

**Frontend (User Actions)**:

1. User navigates to `/reports`
2. Page loads with default filters:
   - Project: Last selected project (from localStorage) or first project
   - Sprint: All Sprints
   - Date range: Empty (all dates)

**Frontend → API**:

```typescript
// Step 1: Load projects
GET /api/dashboard/user-projects
Authorization: Bearer {accessToken}

Response 200:
[
  {
    id: "proj-uuid-1",
    name: "E-Commerce Platform",
    description: "Main platform project",
    sprints: [...],
    createdAt: "2024-01-01T00:00:00Z"
  }
]

// Step 2: Load sprints for selected project
GET /api/sprints?projectId=proj-uuid-1
Authorization: Bearer {accessToken}

Response 200:
[
  {
    id: "sprint-uuid-1",
    name: "Sprint 5",
    startDate: "2024-01-08",
    endDate: "2024-01-21",
    status: "ACTIVE",
    // ... other sprint fields
  }
]

// Step 3: Load summaries
GET /api/snaps/summaries/project/proj-uuid-1
Authorization: Bearer {accessToken}

Response 200:
[
  {
    id: "summary-uuid-1",
    sprintId: "sprint-uuid-1",
    summaryDate: "2024-01-15T00:00:00.000Z",
    done: "[User Authentication] Completed login API endpoint\n[Dashboard UI] Created chart components",
    toDo: "[User Authentication] Will implement password reset\n[Dashboard UI] Integrate with backend APIs",
    blockers: "[Dashboard UI] Waiting for API documentation",
    ragOverview: {
      cardLevel: { green: 3, amber: 1, red: 0 },
      assigneeLevel: { green: 1, amber: 1, red: 0 },
      sprintLevel: "green"
    },
    fullData: {
      byAssignee: [
        {
          assignee: "John Doe",
          snaps: [
            {
              cardTitle: "User Authentication",
              done: "Completed login API endpoint",
              toDo: "Will implement password reset",
              blockers: null,
              rag: "green"
            }
          ]
        },
        {
          assignee: "Sarah Smith",
          snaps: [
            {
              cardTitle: "Dashboard UI",
              done: "Created chart components",
              toDo: "Integrate with backend APIs",
              blockers: "Waiting for API documentation",
              rag: "amber"
            }
          ]
        }
      ]
    },
    sprint: {
      id: "sprint-uuid-1",
      name: "Sprint 5"
    },
    createdAt: "2024-01-15T18:00:00.000Z"
  }
]
```

**Backend (API → Service → Database)**:

**Controller**: `F:\StandupSnap\backend\src\snap\snap.controller.ts`
```typescript
@Get('summaries/project/:projectId')
@RequirePermissions(Permission.VIEW_SNAP)
getSummariesByProject(
  @Param('projectId') projectId: string,
  @Query('sprintId') sprintId?: string,
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
) {
  return this.snapService.getSummariesByProject(projectId, sprintId, startDate, endDate);
}
```

**Service**: `F:\StandupSnap\backend\src\snap\snap.service.ts`
```typescript
async getSummariesByProject(
  projectId: string,
  sprintId?: string,
  startDate?: string,
  endDate?: string,
): Promise<DailySummary[]> {
  const query = this.summaryRepository
    .createQueryBuilder('summary')
    .leftJoinAndSelect('summary.sprint', 'sprint')
    .where('sprint.project_id = :projectId', { projectId });

  if (sprintId) {
    query.andWhere('summary.sprintId = :sprintId', { sprintId });
  }

  if (startDate) {
    query.andWhere('summary.summaryDate >= :startDate', { startDate });
  }

  if (endDate) {
    query.andWhere('summary.summaryDate <= :endDate', { endDate });
  }

  return query
    .orderBy('summary.summaryDate', 'DESC')
    .getMany();
}
```

**SQL Query**:
```sql
SELECT
  summary.id,
  summary.sprint_id,
  summary.summary_date,
  summary.done,
  summary.to_do,
  summary.blockers,
  summary.rag_overview,
  summary.full_data,
  summary.created_at,
  sprint.id AS sprint_id,
  sprint.name AS sprint_name
FROM daily_summaries summary
LEFT JOIN sprints sprint ON summary.sprint_id = sprint.id
WHERE sprint.project_id = 'proj-uuid-1'
ORDER BY summary.summary_date DESC;
```

**Frontend (Rendering)**:

3. Summaries displayed in reverse chronological order (newest first)
4. Each summary card shows:
   - Date (formatted: "Monday, January 15, 2024")
   - Sprint name
   - Overall RAG badge (color-coded)
   - Quick stats (Green: 3, Amber: 1, Red: 0)
5. Cards are collapsed by default

**User Action**: Click on summary card

6. Card expands to show full details:
   - Sprint Health Overview (stat cards)
   - Card-Level Updates grouped by assignee
   - Download buttons (TXT, Word)

**State Management**:
```typescript
const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
const [expandedAssignees, setExpandedAssignees] = useState<Record<string, boolean>>({});

// Toggle summary expansion
const handleSummaryClick = (summaryId: string) => {
  setExpandedSummary(isExpanded ? null : summaryId);
};

// Toggle assignee section
const toggleAssignee = (summaryId: string, assigneeIdx: number) => {
  const key = `${summaryId}-${assigneeIdx}`;
  setExpandedAssignees(prev => ({ ...prev, [key]: !prev[key] }));
};
```

---

### Journey 2: Filter Reports by Sprint and Date Range

**Actor**: SM or team member
**Goal**: View summaries for specific sprint and/or date range

#### Flow

**Frontend (User Actions)**:

1. User is on Reports page with default filters
2. User selects "Sprint 5" from Sprint dropdown

**Frontend → API**:

```typescript
// Reload summaries with sprint filter
GET /api/snaps/summaries/project/proj-uuid-1?sprintId=sprint-uuid-1
Authorization: Bearer {accessToken}

Response 200:
[
  // Only summaries for Sprint 5
]
```

**SQL Query**:
```sql
SELECT
  summary.*,
  sprint.*
FROM daily_summaries summary
LEFT JOIN sprints sprint ON summary.sprint_id = sprint.id
WHERE sprint.project_id = 'proj-uuid-1'
  AND summary.sprint_id = 'sprint-uuid-1'
ORDER BY summary.summary_date DESC;
```

3. User sets "From Date" to 2024-01-10
4. User sets "To Date" to 2024-01-15

**Frontend → API**:

```typescript
// Reload with all filters
GET /api/snaps/summaries/project/proj-uuid-1?sprintId=sprint-uuid-1&startDate=2024-01-10&endDate=2024-01-15
Authorization: Bearer {accessToken}

Response 200:
[
  // Summaries between Jan 10-15 in Sprint 5
]
```

**SQL Query**:
```sql
SELECT
  summary.*,
  sprint.*
FROM daily_summaries summary
LEFT JOIN sprints sprint ON summary.sprint_id = sprint.id
WHERE sprint.project_id = 'proj-uuid-1'
  AND summary.sprint_id = 'sprint-uuid-1'
  AND summary.summary_date >= '2024-01-10'
  AND summary.summary_date <= '2024-01-15'
ORDER BY summary.summary_date DESC;
```

5. Summaries list updates to show only matching records
6. If no summaries match, empty state is shown

**User Action**: Click "Clear Filters"

7. Sprint, startDate, endDate reset to defaults
8. All summaries for selected project are shown

---

### Journey 3: Export Summary as Plain Text (TXT)

**Actor**: SM or team member
**Goal**: Download a daily summary as a formatted text file

#### Flow

**Frontend (User Actions)**:

1. User expands a summary card for January 15, 2024
2. User clicks **[TXT]** download button

**Frontend (Client-Side Processing)**:

```typescript
const handleDownload = (summary: DailySummary) => {
  // Build formatted text content
  let content = `
================================================================================
                         DAILY STANDUP SUMMARY
================================================================================
Sprint: ${summary.sprint?.name || 'Unknown'}
Date: ${new Date(summary.summaryDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}

================================================================================
                         SPRINT HEALTH OVERVIEW
================================================================================
Overall Day RAG: ${(summary.ragOverview?.sprintLevel || 'GREEN').toUpperCase()}

Card-Level Status:
  - Green: ${summary.ragOverview?.cardLevel?.green || 0} cards
  - Amber: ${summary.ragOverview?.cardLevel?.amber || 0} cards
  - Red: ${summary.ragOverview?.cardLevel?.red || 0} cards

Assignee-Level Status:
  - Green: ${summary.ragOverview?.assigneeLevel?.green || 0} assignees
  - Amber: ${summary.ragOverview?.assigneeLevel?.amber || 0} assignees
  - Red: ${summary.ragOverview?.assigneeLevel?.red || 0} assignees

================================================================================
                         CARD-LEVEL UPDATES
================================================================================
`;

  // Add data by assignee
  if (summary.fullData?.byAssignee) {
    summary.fullData.byAssignee.forEach((assigneeData: any) => {
      content += `\n--- ${assigneeData.assignee} ---\n`;
      assigneeData.snaps?.forEach((snap: any) => {
        content += `\n  Card: ${snap.cardTitle}\n`;
        content += `  RAG Status: ${(snap.rag || 'green').toUpperCase()}\n`;
        content += `  Done: ${snap.done || '-'}\n`;
        content += `  To Do: ${snap.toDo || '-'}\n`;
        content += `  Blockers: ${snap.blockers || '-'}\n`;
      });
    });
  } else {
    content += '\nNo card-level data available\n';
  }

  content += `
================================================================================
                              END OF REPORT
================================================================================
`;

  // Create and download blob
  const blob = new Blob([content.trim()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `summary-${new Date(summary.summaryDate).toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

**Sample Output** (`summary-2024-01-15.txt`):

```
================================================================================
                         DAILY STANDUP SUMMARY
================================================================================
Sprint: Sprint 5
Date: Monday, January 15, 2024

================================================================================
                         SPRINT HEALTH OVERVIEW
================================================================================
Overall Day RAG: GREEN

Card-Level Status:
  - Green: 3 cards
  - Amber: 1 cards
  - Red: 0 cards

Assignee-Level Status:
  - Green: 1 assignees
  - Amber: 1 assignees
  - Red: 0 assignees

================================================================================
                         CARD-LEVEL UPDATES
================================================================================

--- John Doe ---

  Card: User Authentication
  RAG Status: GREEN
  Done: Completed login API endpoint
  To Do: Will implement password reset
  Blockers: -

--- Sarah Smith ---

  Card: Dashboard UI
  RAG Status: AMBER
  Done: Created chart components
  To Do: Integrate with backend APIs
  Blockers: Waiting for API documentation

================================================================================
                              END OF REPORT
================================================================================
```

**Notes**:
- No API call required - all data already loaded
- Client-side formatting and download
- File naming: `summary-YYYY-MM-DD.txt`
- Uses Blob API for download

---

### Journey 4: Export Summary as Word Document (DOCX)

**Actor**: SM or team member
**Goal**: Download a daily summary as a professionally formatted Word document

#### Flow

**Frontend (User Actions)**:

1. User expands a summary card
2. User clicks **[Word]** download button

**Frontend (Client-Side Processing)**:

**Libraries Used**:
- `docx` (v8.x): Microsoft Word document generation
- `file-saver`: Browser file download

```typescript
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const handleDownloadWord = async (summary: DailySummary) => {
  const children: any[] = [];

  // Title Section
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Daily Standup Summary',
          bold: true,
          size: 48,  // 24pt
          color: '2563EB',  // Blue
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Date Section
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date(summary.summaryDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          bold: true,
          size: 28,  // 14pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Sprint Name
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Sprint: ${summary.sprint?.name || 'Unknown'}`,
          italics: true,
          size: 24,  // 12pt
          color: '6B7280',  // Gray
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Sprint Health Overview Section Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'SPRINT HEALTH OVERVIEW',
          bold: true,
          size: 28,
          color: '4F46E5',  // Indigo
        }),
      ],
      spacing: { before: 300, after: 200 },
    })
  );

  // Overall Day RAG
  const ragColor = summary.ragOverview?.sprintLevel === 'red' ? 'DC2626' :
                   summary.ragOverview?.sprintLevel === 'amber' ? 'D97706' : '059669';

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Overall Day RAG: ',
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: (summary.ragOverview?.sprintLevel || 'GREEN').toUpperCase(),
          bold: true,
          size: 24,
          color: ragColor,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Card Level Stats
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Card-Level Status: ',
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: `${summary.ragOverview?.cardLevel?.green || 0} Green`,
          size: 22,
          color: '059669',
        }),
        new TextRun({
          text: ` | ${summary.ragOverview?.cardLevel?.amber || 0} Amber`,
          size: 22,
          color: 'D97706',
        }),
        new TextRun({
          text: ` | ${summary.ragOverview?.cardLevel?.red || 0} Red`,
          size: 22,
          color: 'DC2626',
        }),
      ],
      spacing: { after: 100 },
    })
  );

  // Assignee Level Stats
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Assignee-Level Status: ',
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: `${summary.ragOverview?.assigneeLevel?.green || 0} Green`,
          size: 22,
          color: '059669',
        }),
        new TextRun({
          text: ` | ${summary.ragOverview?.assigneeLevel?.amber || 0} Amber`,
          size: 22,
          color: 'D97706',
        }),
        new TextRun({
          text: ` | ${summary.ragOverview?.assigneeLevel?.red || 0} Red`,
          size: 22,
          color: 'DC2626',
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Card-Level Updates Section Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'CARD-LEVEL UPDATES',
          bold: true,
          size: 28,
          color: '2563EB',
        }),
      ],
      spacing: { before: 300, after: 200 },
    })
  );

  // Add card-level data by assignee
  if (summary.fullData?.byAssignee) {
    summary.fullData.byAssignee.forEach((assigneeData: any) => {
      // Assignee header
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: assigneeData.assignee,
              bold: true,
              size: 24,
              color: '1F2937',
            }),
          ],
          spacing: { before: 300, after: 150 },
        })
      );

      // Each card for this assignee
      assigneeData.snaps?.forEach((snap: any) => {
        const cardRagColor = snap.rag === 'red' ? 'DC2626' :
                            snap.rag === 'amber' ? 'D97706' : '059669';

        // Card title with RAG
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${snap.cardTitle} `,
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: `[${(snap.rag || 'green').toUpperCase()}]`,
                bold: true,
                size: 20,
                color: cardRagColor,
              }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );

        // Done
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Done: ',
                bold: true,
                size: 20,
                color: '059669',
              }),
              new TextRun({
                text: snap.done || '-',
                size: 20,
              }),
            ],
            spacing: { after: 50 },
          })
        );

        // To Do
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'To Do: ',
                bold: true,
                size: 20,
                color: '2563EB',
              }),
              new TextRun({
                text: snap.toDo || '-',
                size: 20,
              }),
            ],
            spacing: { after: 50 },
          })
        );

        // Blockers
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Blockers: ',
                bold: true,
                size: 20,
                color: 'DC2626',
              }),
              new TextRun({
                text: snap.blockers || '-',
                size: 20,
              }),
            ],
            spacing: { after: 150 },
          })
        );
      });
    });
  } else {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'No card-level data available',
            size: 22,
            color: '6B7280',
            italics: true,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Create document
  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `summary-${new Date(summary.summaryDate).toISOString().split('T')[0]}.docx`);
};
```

**Document Structure**:

1. **Title**: "Daily Standup Summary" (24pt, bold, blue, centered)
2. **Date**: Full date format (14pt, bold, centered)
3. **Sprint**: Sprint name (12pt, italic, gray, centered)
4. **Sprint Health Overview** (section header, 14pt, bold, indigo):
   - Overall Day RAG (with color)
   - Card-Level Status (green | amber | red counts with colors)
   - Assignee-Level Status (green | amber | red counts with colors)
5. **Card-Level Updates** (section header, 14pt, bold, blue):
   - For each assignee:
     - Assignee name (12pt, bold)
     - For each card:
       - Card title + RAG badge (11pt, bold, with color)
       - Done (10pt, with "Done:" label in green)
       - To Do (10pt, with "To Do:" label in blue)
       - Blockers (10pt, with "Blockers:" label in red)

**Color Coding**:
- GREEN: `#059669` (Emerald)
- AMBER: `#D97706` (Amber)
- RED: `#DC2626` (Red)
- BLUE: `#2563EB` (Primary)
- INDIGO: `#4F46E5`
- GRAY: `#6B7280`, `#1F2937`

**File Naming**: `summary-YYYY-MM-DD.docx`

**Notes**:
- No API call required - all data already loaded
- Client-side document generation using `docx` library
- Professional formatting with colors, bold, spacing
- Compatible with Microsoft Word, Google Docs, LibreOffice

---

### Journey 5: Switch Projects

**Actor**: SM or team member
**Goal**: View reports for a different project

#### Flow

**Frontend (User Actions)**:

1. User is viewing reports for "E-Commerce Platform"
2. User clicks Project dropdown
3. User selects "Mobile App" project

**Frontend → API**:

```typescript
// Load sprints for new project
GET /api/sprints?projectId=proj-uuid-2
Authorization: Bearer {accessToken}

Response 200:
[
  // Sprints for Mobile App project
]

// Load summaries for new project
GET /api/snaps/summaries/project/proj-uuid-2
Authorization: Bearer {accessToken}

Response 200:
[
  // Summaries for Mobile App project
]
```

**Frontend (State Updates)**:

```typescript
const handleProjectChange = (projectId: string) => {
  setSelectedProjectId(projectId);
  setSelectedSprintId(''); // Reset sprint filter
  localStorage.setItem('lastSelectedProjectId', projectId); // Persist selection
};
```

**Side Effects**:
- Sprint filter resets to "All Sprints"
- Date filters remain unchanged
- Last selected project saved to localStorage
- New summaries loaded and displayed

---

## Business Rules

### BR-R1: Summary Generation Trigger
**Rule**: Daily summaries are automatically generated when daily snaps are locked.
**Location**: `F:\StandupSnap\backend\src\snap\snap.service.ts` (line 448)
```typescript
// After locking snaps
await this.generateDailySummary(sprintId, lockDate);
```

### BR-R2: One Summary Per Sprint Per Day
**Rule**: Only one summary can exist for a given sprint and date combination.
**Enforcement**: Database unique constraint on `(sprint_id, summary_date)`
**Check**: Service checks for existing summary before generation (line 504-513)

### BR-R3: Sprint-Level RAG Calculation
**Rule**: Sprint-level RAG is calculated based on card-level RAG distribution:
- If RED cards > (GREEN + AMBER cards): Sprint RAG = **RED**
- Else if AMBER cards > (GREEN + RED cards): Sprint RAG = **AMBER**
- Else if GREEN cards > (AMBER + RED cards): Sprint RAG = **GREEN**
- Else (no clear majority): Use worst status present (red > amber > green)

**Location**: `F:\StandupSnap\backend\src\snap\snap.service.ts` (lines 576-589)

### BR-R4: Assignee-Level RAG Aggregation
**Rule**: Each assignee's RAG is determined by the worst RAG among their cards.
- If any card is RED: Assignee RAG = RED
- Else if any card is AMBER: Assignee RAG = AMBER
- Else: Assignee RAG = GREEN

**Location**: `F:\StandupSnap\backend\src\snap\snap.service.ts` (lines 560-574)

### BR-R5: Report Access Permission
**Rule**: Users must have `VIEW_SNAP` permission to access reports.
**Enforcement**: `@RequirePermissions(Permission.VIEW_SNAP)` on API endpoint
**Implication**: All project members can view reports (not just SM)

### BR-R6: Project Filter Required
**Rule**: Users must select a project to view reports (no global reports view).
**Reason**: Reports are organized by project → sprint → date hierarchy
**Default**: Last selected project (localStorage) or first available project

### BR-R7: Date Filtering is Optional
**Rule**: If no date range specified, show all summaries for selected project/sprint.
**Implementation**: Backend SQL query conditionally includes date filters

### BR-R8: Sprint Filtering is Optional
**Rule**: "All Sprints" option shows summaries across all sprints in project.
**Implementation**: Backend SQL query conditionally includes sprint filter

### BR-R9: Export Data Completeness
**Rule**: Exported reports (TXT, DOCX) must include ALL summary data:
- Date and sprint name
- Sprint health overview (all RAG metrics)
- Complete card-level updates by assignee
**Enforcement**: Frontend export functions iterate through `fullData.byAssignee`

### BR-R10: Summary Immutability
**Rule**: Once generated, daily summaries cannot be edited or deleted.
**Reason**: Summaries are historical records of locked daily standups
**Exception**: None - summaries are permanent records

### BR-R11: Chronological Ordering
**Rule**: Summaries are always displayed in reverse chronological order (newest first).
**Location**: SQL query `ORDER BY summary.summaryDate DESC`

### BR-R12: Unassigned Card Handling
**Rule**: Cards without assignees are grouped under "Unassigned" in reports.
**Location**: `F:\StandupSnap\backend\src\snap\snap.service.ts` (lines 527-529)
```typescript
const assigneeName = snap.card.assignee
  ? snap.card.assignee.fullName
  : 'Unassigned';
```

---

## API Endpoints

### GET /api/snaps/summaries/project/:projectId
**Purpose**: Get all daily summaries for a project with optional filters
**Auth**: JWT + `VIEW_SNAP` permission
**Controller**: `F:\StandupSnap\backend\src\snap\snap.controller.ts` (lines 181-190)

#### Request
```http
GET /api/snaps/summaries/project/proj-uuid-1?sprintId=sprint-uuid-1&startDate=2024-01-10&endDate=2024-01-15
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | UUID | Yes (path) | Project ID to filter summaries |
| `sprintId` | UUID | No | Filter by specific sprint |
| `startDate` | Date | No | Start date filter (YYYY-MM-DD) |
| `endDate` | Date | No | End date filter (YYYY-MM-DD) |

#### Response 200 (Success)
```json
[
  {
    "id": "summary-uuid-1",
    "sprintId": "sprint-uuid-1",
    "summaryDate": "2024-01-15T00:00:00.000Z",
    "done": "[User Authentication] Completed login API endpoint\n[Dashboard UI] Created chart components",
    "toDo": "[User Authentication] Will implement password reset\n[Dashboard UI] Integrate with backend APIs",
    "blockers": "[Dashboard UI] Waiting for API documentation",
    "ragOverview": {
      "cardLevel": {
        "green": 3,
        "amber": 1,
        "red": 0
      },
      "assigneeLevel": {
        "green": 1,
        "amber": 1,
        "red": 0
      },
      "sprintLevel": "green"
    },
    "fullData": {
      "byAssignee": [
        {
          "assignee": "John Doe",
          "snaps": [
            {
              "cardTitle": "User Authentication",
              "done": "Completed login API endpoint",
              "toDo": "Will implement password reset",
              "blockers": null,
              "rag": "green"
            }
          ]
        },
        {
          "assignee": "Sarah Smith",
          "snaps": [
            {
              "cardTitle": "Dashboard UI",
              "done": "Created chart components",
              "toDo": "Integrate with backend APIs",
              "blockers": "Waiting for API documentation",
              "rag": "amber"
            }
          ]
        }
      ]
    },
    "sprint": {
      "id": "sprint-uuid-1",
      "name": "Sprint 5"
    },
    "createdAt": "2024-01-15T18:00:00.000Z"
  }
]
```

#### Response 401 (Unauthorized)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### Response 403 (Forbidden)
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```

#### SQL Query (Full Filter Example)
```sql
SELECT
  summary.id,
  summary.sprint_id,
  summary.summary_date,
  summary.done,
  summary.to_do,
  summary.blockers,
  summary.rag_overview,
  summary.full_data,
  summary.created_at,
  sprint.id AS "sprint.id",
  sprint.name AS "sprint.name"
FROM daily_summaries summary
LEFT JOIN sprints sprint ON summary.sprint_id = sprint.id
WHERE sprint.project_id = $1
  AND summary.sprint_id = $2
  AND summary.summary_date >= $3
  AND summary.summary_date <= $4
ORDER BY summary.summary_date DESC;

-- Parameters: ['proj-uuid-1', 'sprint-uuid-1', '2024-01-10', '2024-01-15']
```

---

### GET /api/dashboard/user-projects
**Purpose**: Get all projects user has access to (for project selector)
**Auth**: JWT
**Used by**: Reports page to populate project dropdown

#### Request
```http
GET /api/dashboard/user-projects
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200
```json
[
  {
    "id": "proj-uuid-1",
    "name": "E-Commerce Platform",
    "description": "Main platform project",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "proj-uuid-2",
    "name": "Mobile App",
    "description": "iOS and Android apps",
    "createdAt": "2024-01-05T00:00:00.000Z"
  }
]
```

---

### GET /api/sprints
**Purpose**: Get all sprints for a project (for sprint filter dropdown)
**Auth**: JWT
**Used by**: Reports page to populate sprint filter

#### Request
```http
GET /api/sprints?projectId=proj-uuid-1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response 200
```json
[
  {
    "id": "sprint-uuid-1",
    "name": "Sprint 5",
    "startDate": "2024-01-08",
    "endDate": "2024-01-21",
    "status": "ACTIVE",
    "dailyStandupCount": 1,
    "isClosed": false
  },
  {
    "id": "sprint-uuid-2",
    "name": "Sprint 4",
    "startDate": "2023-12-25",
    "endDate": "2024-01-07",
    "status": "COMPLETED",
    "dailyStandupCount": 1,
    "isClosed": false
  }
]
```

---

## Integration Points

### Integration 1: Snaps Module
**Connection**: Daily summaries are generated from locked snaps
**Flow**: Lock Daily Snaps → Generate Daily Summary → Store in `daily_summaries` table
**Data Flow**:
1. SM locks daily snaps via Snaps page
2. `lockDailySnaps()` method called
3. Triggers `generateDailySummary(sprintId, date)`
4. Aggregates all snaps for that date
5. Calculates RAG metrics
6. Saves to `daily_summaries` table
7. Summary becomes available in Reports page

**Key Files**:
- `F:\StandupSnap\backend\src\snap\snap.service.ts` (lines 403-451, 503-618)

---

### Integration 2: Sprints Module
**Connection**: Summaries are organized by sprint
**Relation**: Each summary belongs to exactly one sprint (`ManyToOne`)
**Usage**:
- Sprint filter dropdown populated from sprints API
- Summary displays sprint name
- Filtering by sprint ID
- Sprint deletion cascades to delete summaries

**Database Relation**:
```sql
ALTER TABLE daily_summaries
ADD CONSTRAINT fk_summary_sprint
FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE;
```

---

### Integration 3: Projects Module
**Connection**: Summaries accessed via project context
**Flow**: User selects project → Load summaries for all sprints in project
**Query Join**: `daily_summaries` → `sprints` → `projects`
**Usage**:
- Project selector (required filter)
- Cross-sprint aggregation within project
- Project-based access control

---

### Integration 4: Team Members (Users)
**Connection**: Summary data grouped by assignee
**Data Source**: Card assignees from snaps
**Display**: Assignee sections in expanded summary view
**Handling**: Unassigned cards grouped under "Unassigned"

---

### Integration 5: Cards Module
**Connection**: Each snap in summary references a card
**Data Included**:
- Card title
- Card RAG status (from snap's finalRAG)
**Aggregation**: Card-level RAG counts in `ragOverview.cardLevel`

---

## How Summary Generation Works

### Summary Generation Algorithm

**Trigger**: Called after daily snap lock
**Method**: `generateDailySummary(sprintId: string, date: string)`
**Location**: `F:\StandupSnap\backend\src\snap\snap.service.ts` (lines 503-618)

#### Step-by-Step Process

**Step 1: Check for Existing Summary**
```typescript
const existing = await this.summaryRepository
  .createQueryBuilder('summary')
  .where('summary.sprintId = :sprintId', { sprintId })
  .andWhere('summary.summaryDate = :date', { date })
  .getOne();

if (existing) {
  return existing; // Already generated, don't duplicate
}
```

**Step 2: Fetch All Snaps for the Date**
```typescript
const snaps = await this.findBySprintAndDate(sprintId, date);
```

**SQL Query**:
```sql
SELECT
  snap.*,
  card.*,
  created_by.*,
  assignee.*
FROM snaps snap
LEFT JOIN cards card ON snap.card_id = card.id
LEFT JOIN users created_by ON snap.created_by_id = created_by.id
LEFT JOIN users assignee ON card.assignee_id = assignee.id
WHERE snap.card_id IN (
  SELECT id FROM cards WHERE sprint_id = $1
)
AND snap.snap_date = $2
ORDER BY snap.created_at ASC;
```

**Step 3: Initialize Aggregation Containers**
```typescript
const doneItems: string[] = [];
const toDoItems: string[] = [];
const blockerItems: string[] = [];
const byAssignee = new Map<string, { name: string; snaps: Snap[] }>();
```

**Step 4: Group Snaps by Assignee**
```typescript
for (const snap of snaps) {
  const assigneeName = snap.card.assignee
    ? snap.card.assignee.fullName
    : 'Unassigned';

  if (!byAssignee.has(assigneeName)) {
    byAssignee.set(assigneeName, { name: assigneeName, snaps: [] });
  }
  byAssignee.get(assigneeName).snaps.push(snap);

  // Aggregate content
  if (snap.done) {
    doneItems.push(`[${snap.card.title}] ${snap.done}`);
  }
  if (snap.toDo) {
    toDoItems.push(`[${snap.card.title}] ${snap.toDo}`);
  }
  if (snap.blockers) {
    blockerItems.push(`[${snap.card.title}] ${snap.blockers}`);
  }
}
```

**Example**:
```
Input Snaps:
- Snap 1: Card "API" assigned to "John", RAG=green, done="Completed endpoint"
- Snap 2: Card "UI" assigned to "Sarah", RAG=amber, done="Created forms"
- Snap 3: Card "DB" assigned to "John", RAG=green, done="Optimized queries"

Output byAssignee Map:
{
  "John": {
    name: "John",
    snaps: [Snap 1, Snap 3]
  },
  "Sarah": {
    name: "Sarah",
    snaps: [Snap 2]
  }
}

Output doneItems:
[
  "[API] Completed endpoint",
  "[UI] Created forms",
  "[DB] Optimized queries"
]
```

**Step 5: Calculate Card-Level RAG Counts**
```typescript
const cardRAG = { green: 0, amber: 0, red: 0 };

for (const snap of snaps) {
  if (snap.finalRAG === SnapRAG.GREEN) cardRAG.green++;
  else if (snap.finalRAG === SnapRAG.AMBER) cardRAG.amber++;
  else if (snap.finalRAG === SnapRAG.RED) cardRAG.red++;
}
```

**Example**:
```
Snaps: [green, green, amber, green, red]
Result: { green: 3, amber: 1, red: 1 }
```

**Step 6: Calculate Assignee-Level RAG**
```typescript
const assigneeRAG = { green: 0, amber: 0, red: 0 };

for (const [_, data] of byAssignee) {
  let worstRAG = SnapRAG.GREEN;
  for (const snap of data.snaps) {
    if (snap.finalRAG === SnapRAG.RED) {
      worstRAG = SnapRAG.RED;
      break; // Red is worst, no need to check further
    } else if (snap.finalRAG === SnapRAG.AMBER) {
      worstRAG = SnapRAG.AMBER;
    }
  }

  if (worstRAG === SnapRAG.GREEN) assigneeRAG.green++;
  else if (worstRAG === SnapRAG.AMBER) assigneeRAG.amber++;
  else if (worstRAG === SnapRAG.RED) assigneeRAG.red++;
}
```

**Example**:
```
John's cards: [green, green] → John's RAG = GREEN
Sarah's cards: [amber, green] → Sarah's RAG = AMBER (worst)
Mike's cards: [red, amber] → Mike's RAG = RED (worst)

Result: { green: 1, amber: 1, red: 1 }
```

**Step 7: Calculate Sprint-Level RAG**
```typescript
let sprintLevel = 'green';

if (cardRAG.red > cardRAG.green + cardRAG.amber) {
  sprintLevel = 'red'; // Red cards outnumber all others
} else if (cardRAG.amber > cardRAG.green + cardRAG.red) {
  sprintLevel = 'amber'; // Amber cards outnumber all others
} else if (cardRAG.green > cardRAG.amber + cardRAG.red) {
  sprintLevel = 'green'; // Green cards outnumber all others
} else {
  // No clear majority, use worst status present
  if (cardRAG.red > 0) sprintLevel = 'red';
  else if (cardRAG.amber > 0) sprintLevel = 'amber';
  else sprintLevel = 'green';
}
```

**Examples**:
```
Example 1: { green: 5, amber: 1, red: 0 }
5 > (1 + 0) → Sprint = GREEN ✓

Example 2: { green: 2, amber: 5, red: 1 }
5 > (2 + 1) → Sprint = AMBER ✓

Example 3: { green: 1, amber: 1, red: 5 }
5 > (1 + 1) → Sprint = RED ✓

Example 4: { green: 2, amber: 2, red: 2 } (tie)
No majority → red > 0 → Sprint = RED ✓
```

**Step 8: Build Full Data Structure**
```typescript
const fullData = {
  byAssignee: Array.from(byAssignee.entries()).map(([name, data]) => ({
    assignee: name,
    snaps: data.snaps.map((s) => ({
      cardTitle: s.card.title,
      done: s.done,
      toDo: s.toDo,
      blockers: s.blockers,
      rag: s.finalRAG,
    })),
  })),
};
```

**Step 9: Create and Save Summary Entity**
```typescript
const summary = this.summaryRepository.create({
  sprintId,
  summaryDate: new Date(date),
  done: doneItems.join('\n'),
  toDo: toDoItems.join('\n'),
  blockers: blockerItems.join('\n'),
  ragOverview: {
    cardLevel: cardRAG,
    assigneeLevel: assigneeRAG,
    sprintLevel,
  },
  fullData,
});

return this.summaryRepository.save(summary);
```

**SQL Insert**:
```sql
INSERT INTO daily_summaries (
  id,
  sprint_id,
  summary_date,
  done,
  to_do,
  blockers,
  rag_overview,
  full_data,
  created_at
) VALUES (
  gen_random_uuid(),
  $1, -- sprintId
  $2, -- date
  $3, -- done items (newline-separated)
  $4, -- todo items (newline-separated)
  $5, -- blocker items (newline-separated)
  $6, -- ragOverview JSON
  $7, -- fullData JSON
  NOW()
);
```

---

## Frontend State Management

### State Variables

**File**: `F:\StandupSnap\frontend\src\pages\ReportsPage.tsx`

```typescript
// Project and Sprint Data
const [projects, setProjects] = useState<ProjectSummary[]>([]);
const [sprints, setSprints] = useState<Sprint[]>([]);
const [summaries, setSummaries] = useState<DailySummary[]>([]);

// Filter State
const [selectedProjectId, setSelectedProjectId] = useState<string>('');
const [selectedSprintId, setSelectedSprintId] = useState<string>('');
const [startDate, setStartDate] = useState<string>('');
const [endDate, setEndDate] = useState<string>('');

// UI State
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
const [expandedAssignees, setExpandedAssignees] = useState<Record<string, boolean>>({});
```

---

### useEffect Hooks

**Hook 1: Load Projects on Mount**
```typescript
useEffect(() => {
  loadProjects();
}, []);
```

**Hook 2: Load Sprints When Project Changes**
```typescript
useEffect(() => {
  if (selectedProjectId) {
    loadSprints();
    loadSummaries();
  }
}, [selectedProjectId]);
```

**Hook 3: Reload Summaries When Filters Change**
```typescript
useEffect(() => {
  if (selectedProjectId) {
    loadSummaries();
  }
}, [selectedSprintId, startDate, endDate]);
```

---

### Key Functions

**loadProjects()**
```typescript
const loadProjects = async () => {
  try {
    const data = await dashboardApi.getUserProjects();
    setProjects(data);

    if (data.length > 0) {
      // Auto-select last used project or first project
      const lastProject = localStorage.getItem('lastSelectedProjectId');
      if (lastProject && data.find(p => p.id === lastProject)) {
        setSelectedProjectId(lastProject);
      } else {
        setSelectedProjectId(data[0].id);
      }
    }
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**loadSprints()**
```typescript
const loadSprints = async () => {
  try {
    const data = await sprintsApi.getAll({ projectId: selectedProjectId });
    setSprints(data);
  } catch (err: any) {
    console.error('Failed to load sprints:', err);
  }
};
```

**loadSummaries()**
```typescript
const loadSummaries = async () => {
  try {
    setLoading(true);
    setError(null);
    const data = await reportsApi.getSummaries({
      projectId: selectedProjectId,
      sprintId: selectedSprintId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    setSummaries(data);
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**handleProjectChange()**
```typescript
const handleProjectChange = (projectId: string) => {
  setSelectedProjectId(projectId);
  setSelectedSprintId(''); // Reset sprint filter
  localStorage.setItem('lastSelectedProjectId', projectId); // Persist
};
```

**clearFilters()**
```typescript
const clearFilters = () => {
  setSelectedSprintId('');
  setStartDate('');
  setEndDate('');
};
```

**toggleAssignee()**
```typescript
const toggleAssignee = (summaryId: string, assigneeIdx: number) => {
  const key = `${summaryId}-${assigneeIdx}`;
  setExpandedAssignees(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
};
```

---

## RAG Color Coding System

### RAG Configuration Function

```typescript
const getRAGConfig = (rag: string) => {
  const configs = {
    red: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      dot: 'bg-red-500'
    },
    amber: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      dot: 'bg-amber-500'
    },
    green: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500'
    },
  };
  return configs[rag as keyof typeof configs] || configs.green;
};
```

### Color Palette

| RAG Status | Background | Text | Dot/Badge | Hex Code |
|------------|------------|------|-----------|----------|
| **GREEN** | `bg-emerald-100` | `text-emerald-700` | `bg-emerald-500` | #059669 |
| **AMBER** | `bg-amber-100` | `text-amber-700` | `bg-amber-500` | #D97706 |
| **RED** | `bg-red-100` | `text-red-700` | `bg-red-500` | #DC2626 |

### Usage in UI

**Summary Header Badge**:
```tsx
<div className={`px-3 py-1.5 rounded-lg ${ragConfig.bg}`}>
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${ragConfig.dot}`}></div>
    <span className={`text-sm font-semibold ${ragConfig.text}`}>
      {summary.ragOverview?.sprintLevel.toUpperCase()}
    </span>
  </div>
</div>
```

**Card RAG Badge**:
```tsx
<span className={`px-2 py-1 rounded text-xs font-semibold ${snapRagConfig.bg} ${snapRagConfig.text}`}>
  {snap.rag.toUpperCase()}
</span>
```

---

## Error Handling

### Frontend Error Handling

**API Call Errors**:
```typescript
try {
  const data = await reportsApi.getSummaries({...});
  setSummaries(data);
} catch (err: any) {
  setError(err.message);
} finally {
  setLoading(false);
}
```

**Error Display**:
```tsx
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
    <p className="text-sm text-red-700">{error}</p>
  </div>
)}
```

**Possible Errors**:
- "Unauthorized" (401) - Invalid or expired token
- "Insufficient permissions" (403) - Missing VIEW_SNAP permission
- "Failed to fetch summaries" (500) - Backend error
- Network errors - Connection issues

---

### Backend Error Handling

**Not Found Error**:
```typescript
if (!summary) {
  throw new NotFoundException('Daily summary not found for this date');
}
```

**Permission Denied**:
- Automatically handled by `@RequirePermissions(Permission.VIEW_SNAP)` guard
- Returns 403 Forbidden if user lacks permission

---

## Performance Considerations

### Database Indexes

**Critical Indexes**:
```sql
-- Sprint lookup
CREATE INDEX idx_daily_summary_sprint ON daily_summaries(sprint_id);

-- Date range queries
CREATE INDEX idx_daily_summary_date ON daily_summaries(summary_date);

-- Composite for common query pattern
CREATE INDEX idx_summary_sprint_date ON daily_summaries(sprint_id, summary_date);
```

### Query Optimization

**Use of QueryBuilder**:
- Conditional filter application (only include WHERE clauses when needed)
- Single query with joins (avoid N+1 problem)
- Efficient date range filtering

**Example Optimized Query**:
```typescript
const query = this.summaryRepository
  .createQueryBuilder('summary')
  .leftJoinAndSelect('summary.sprint', 'sprint')
  .where('sprint.project_id = :projectId', { projectId });

// Only add filters if provided
if (sprintId) query.andWhere('summary.sprintId = :sprintId', { sprintId });
if (startDate) query.andWhere('summary.summaryDate >= :startDate', { startDate });
if (endDate) query.andWhere('summary.summaryDate <= :endDate', { endDate });

return query.orderBy('summary.summaryDate', 'DESC').getMany();
```

---

### Frontend Performance

**Lazy Loading**:
- Summary cards are collapsed by default
- Assignee sections expand only when clicked
- Reduces initial DOM size

**LocalStorage Caching**:
```typescript
// Remember last selected project
localStorage.setItem('lastSelectedProjectId', projectId);
```

**Efficient State Updates**:
- Only reload data when necessary (filter changes)
- Avoid unnecessary re-renders with proper useEffect dependencies

---

## Report Export Formats

### Format 1: Plain Text (.txt)

**Characteristics**:
- Simple ASCII text format
- Readable in any text editor
- Preserves structure with ASCII art separators
- File size: ~2-5 KB per summary

**Sample Structure**:
```
================================================================================
                         DAILY STANDUP SUMMARY
================================================================================
Sprint: Sprint 5
Date: Monday, January 15, 2024

================================================================================
                         SPRINT HEALTH OVERVIEW
================================================================================
Overall Day RAG: GREEN

Card-Level Status:
  - Green: 3 cards
  - Amber: 1 cards
  - Red: 0 cards

Assignee-Level Status:
  - Green: 1 assignees
  - Amber: 1 assignees
  - Red: 0 assignees

================================================================================
                         CARD-LEVEL UPDATES
================================================================================

--- John Doe ---

  Card: User Authentication
  RAG Status: GREEN
  Done: Completed login API endpoint
  To Do: Will implement password reset
  Blockers: -

================================================================================
                              END OF REPORT
================================================================================
```

**Use Cases**:
- Quick reference
- Email attachments
- Version control (Git)
- Log archival

---

### Format 2: Microsoft Word (.docx)

**Characteristics**:
- Professional formatting with colors, fonts, spacing
- Compatible with MS Word, Google Docs, LibreOffice
- File size: ~15-30 KB per summary
- Editable (users can add notes, comments)

**Libraries Used**:
- `docx` (v8.x): Document generation
- `file-saver`: Browser download

**Formatting Specifications**:

| Element | Font Size | Style | Color |
|---------|-----------|-------|-------|
| Title | 24pt | Bold | Blue (#2563EB) |
| Date | 14pt | Bold | Black |
| Sprint Name | 12pt | Italic | Gray (#6B7280) |
| Section Headers | 14pt | Bold | Indigo (#4F46E5) or Blue |
| Assignee Names | 12pt | Bold | Dark Gray (#1F2937) |
| Card Titles | 11pt | Bold | Black |
| RAG Badges | 10pt | Bold | RAG color |
| Labels (Done/To Do/Blockers) | 10pt | Bold | Green/Blue/Red |
| Content Text | 10pt | Normal | Black |

**Color Scheme**:
- GREEN: `#059669` (Emerald)
- AMBER: `#D97706` (Amber)
- RED: `#DC2626` (Red)
- BLUE: `#2563EB` (Primary)
- INDIGO: `#4F46E5`

**Spacing**:
- Title: 400 units after
- Date: 200 units after
- Sprint: 400 units after
- Section headers: 300 units before, 200 after
- Cards: 200 units before, 150 after content

**Use Cases**:
- Stakeholder reports
- Management presentations
- Formal documentation
- Archival with comments

---

## Security Considerations

### Permission-Based Access Control

**Required Permission**: `VIEW_SNAP`
**Enforcement**: `@RequirePermissions(Permission.VIEW_SNAP)` decorator on API endpoint

**Permission Check Flow**:
1. JWT token validated by `JwtAuthGuard`
2. User loaded from token
3. `PermissionsGuard` checks if user has `VIEW_SNAP` permission
4. If yes: proceed to controller
5. If no: return 403 Forbidden

**Who Has Access**:
- **Scrum Master (SM)**: Always has VIEW_SNAP
- **Team Members**: Have VIEW_SNAP by default
- **Stakeholders**: May have VIEW_SNAP (project-dependent)
- **Observers**: May have VIEW_SNAP (project-dependent)

---

### Data Isolation

**Project-Level Isolation**:
- Users can only view summaries for projects they have access to
- `getUserProjects()` returns only authorized projects
- Summary queries filtered by project membership

**SQL Security**:
```sql
-- User can only access summaries for their projects
SELECT summary.*
FROM daily_summaries summary
JOIN sprints sprint ON summary.sprint_id = sprint.id
JOIN project_members pm ON sprint.project_id = pm.project_id
WHERE pm.user_id = $1  -- Current user
  AND sprint.project_id = $2;  -- Requested project
```

---

### Export Security

**Client-Side Export**:
- No sensitive data sent to external services
- All export processing done in browser
- No API calls required for export
- User can only export summaries they can view

**Data Included in Exports**:
- Summary data (done/todo/blockers)
- RAG metrics
- Assignee names (public within project)
- Card titles (public within project)

**Data NOT Included**:
- User email addresses
- Internal user IDs
- Raw snap data
- Deleted or hidden information

---

## Future Enhancements

### Potential Features (Not Yet Implemented)

1. **PDF Export**:
   - Add PDF export alongside TXT and DOCX
   - Use library like `jsPDF` or `pdfmake`
   - Professional layout with charts

2. **Excel/CSV Export**:
   - Tabular format for data analysis
   - One row per card snap
   - Columns: Date, Sprint, Assignee, Card, Done, ToDo, Blockers, RAG

3. **Report Scheduling**:
   - Schedule daily/weekly email reports
   - Automatic generation and delivery
   - Configurable recipients

4. **Custom Report Templates**:
   - User-defined report layouts
   - Custom branding/logos
   - Template library

5. **RAG Trend Charts**:
   - Visualize RAG distribution over time
   - Line chart showing sprint health trends
   - Card RAG history chart

6. **Advanced Filtering**:
   - Filter by assignee
   - Filter by RAG status
   - Filter by card priority
   - Filter by card type/tag

7. **Comparative Reports**:
   - Compare sprint RAG across sprints
   - Team velocity comparison
   - Blocker frequency analysis

8. **Summary Analytics**:
   - Average cards per assignee
   - Blocker frequency
   - Most productive days
   - RAG improvement trends

9. **Saved Report Configurations**:
   - Save favorite filter combinations
   - Quick access to common reports
   - Shared report bookmarks

10. **Multi-Sprint Summaries**:
    - Aggregate summaries across sprints
    - Sprint retrospective reports
    - Project-wide health reports

---

## Troubleshooting

### Issue 1: No Summaries Displayed

**Symptoms**: Reports page shows "No Summaries Found"

**Possible Causes**:
1. No days have been locked yet
2. Selected sprint has no locked days
3. Date filter excludes all summaries
4. User lacks VIEW_SNAP permission

**Solution**:
1. Verify daily snaps have been locked (check Snaps page)
2. Clear filters and try again
3. Check sprint selection
4. Verify user permissions

---

### Issue 2: Export Downloads Empty File

**Symptoms**: Downloaded TXT or DOCX file is empty or corrupted

**Possible Causes**:
1. Summary data is missing `fullData` field
2. Browser blocked download
3. JavaScript error during export

**Solution**:
1. Check browser console for errors
2. Verify summary has fullData in API response
3. Try different browser
4. Regenerate summary (re-lock day)

---

### Issue 3: Project Not Loading

**Symptoms**: Project dropdown is empty

**Possible Causes**:
1. User not assigned to any projects
2. API call failed
3. Authentication issue

**Solution**:
1. Verify user is project member
2. Check network tab for API errors
3. Check authentication token
4. Refresh page

---

### Issue 4: Date Filter Not Working

**Symptoms**: Changing date range doesn't filter results

**Possible Causes**:
1. Date format incorrect
2. Client-side validation issue
3. Backend query not filtering

**Solution**:
1. Ensure dates are in YYYY-MM-DD format
2. Check API request includes date parameters
3. Verify backend SQL query uses date filters
4. Clear browser cache

---

## Code References

### Frontend Files

| File | Purpose | Lines |
|------|---------|-------|
| `F:\StandupSnap\frontend\src\pages\ReportsPage.tsx` | Main Reports page component | 1-794 |
| `F:\StandupSnap\frontend\src\services\api\reports.ts` | Reports API client | 1-43 |
| `F:\StandupSnap\frontend\src\types\snap.ts` | DailySummary TypeScript interfaces | 59-94 |

---

### Backend Files

| File | Purpose | Lines |
|------|---------|-------|
| `F:\StandupSnap\backend\src\snap\snap.controller.ts` | Summary API endpoints | 181-190 |
| `F:\StandupSnap\backend\src\snap\snap.service.ts` | Summary generation logic | 503-667 |
| `F:\StandupSnap\backend\src\entities\daily-summary.entity.ts` | DailySummary database entity | 1-51 |
| `F:\StandupSnap\backend\src\entities\daily-snap-lock.entity.ts` | DailySnapLock entity (legacy) | 1-42 |

---

## Glossary

| Term | Definition |
|------|------------|
| **Daily Summary** | Aggregated report of all snaps for a specific date in a sprint |
| **RAG Overview** | Health metrics showing Green/Amber/Red distribution at card, assignee, and sprint levels |
| **Sprint-Level RAG** | Overall health indicator for entire sprint based on card RAG distribution |
| **Assignee-Level RAG** | Health indicator for each team member based on worst RAG of their cards |
| **Card-Level RAG** | Individual card health status from snap's finalRAG |
| **Full Data** | Complete structured data in JSONB format, grouped by assignee |
| **Locked Summary** | Daily summary generated after daily snap lock (immutable) |
| **Export** | Download summary as TXT or DOCX file |
| **Filter** | Query parameter to narrow summary results (sprint, date range) |

---

## Database Table Summary

### daily_summaries

```sql
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  done TEXT,
  to_do TEXT,
  blockers TEXT,
  rag_overview JSONB,
  full_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(sprint_id, summary_date)
);

CREATE INDEX idx_daily_summary_sprint ON daily_summaries(sprint_id);
CREATE INDEX idx_daily_summary_date ON daily_summaries(summary_date);
```

**Typical Row**:
```json
{
  "id": "a1b2c3d4-...",
  "sprint_id": "sprint-uuid",
  "summary_date": "2024-01-15",
  "done": "[Card1] Completed feature\n[Card2] Fixed bug",
  "to_do": "[Card1] Will test\n[Card2] Will deploy",
  "blockers": "[Card2] Waiting for approval",
  "rag_overview": {
    "cardLevel": {"green": 3, "amber": 1, "red": 0},
    "assigneeLevel": {"green": 1, "amber": 1, "red": 0},
    "sprintLevel": "green"
  },
  "full_data": {
    "byAssignee": [...]
  },
  "created_at": "2024-01-15T18:00:00Z"
}
```

---

## Conclusion

The **Reports Module** provides a comprehensive view of daily standup summaries with powerful filtering, drill-down capabilities, and multi-format export options. It transforms locked daily snaps into actionable insights with RAG health metrics at card, assignee, and sprint levels.

**Key Strengths**:
- **Comprehensive RAG Analysis**: Three-level health metrics (card, assignee, sprint)
- **Flexible Filtering**: By project, sprint, and date range
- **Professional Exports**: TXT and DOCX formats with rich formatting
- **User-Friendly UI**: Collapsible cards, color-coded RAG indicators
- **Automatic Generation**: Summaries created on snap lock
- **Historical Records**: Immutable summary archive

**Integration**: Seamlessly integrates with Snaps, Sprints, Projects, and Team modules to provide end-to-end daily standup reporting.

---

**END OF DOCUMENT**
