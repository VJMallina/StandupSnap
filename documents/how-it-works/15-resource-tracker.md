# Resource Tracker (Capacity Planning) - How It Works

## Overview
- **Purpose**: Track team resource utilization, capacity planning, and workload management with visual heatmaps
- **Key Features**: Load % calculation, RAG status based on utilization, monthly/weekly/daily heatmap drill-downs, overallocation alerts
- **Visualizations**: Bubble heatmap (monthly), thermal load bar (weekly), GitHub-style grid (daily)
- **Complexity Level**: HIGH - Multi-level drill-down with interactive visualizations

## Table of Contents
1. [Database Schema](#database-schema)
2. [Screens & Pages](#screens--pages)
3. [Resource CRUD Operations](#resource-crud-operations)
4. [Load % Calculation](#load--calculation)
5. [RAG Status Calculation](#rag-status-calculation)
6. [Monthly Heatmap (Bubble View)](#monthly-heatmap-bubble-view)
7. [Weekly Heatmap (Thermal Load Bar)](#weekly-heatmap-thermal-load-bar)
8. [Daily Heatmap (GitHub-style Grid)](#daily-heatmap-github-style-grid)
9. [Drill-Down Navigation](#drill-down-navigation)
10. [Filter & Sort](#filter--sort)
11. [API Endpoints](#api-endpoints)
12. [Complete User Journeys](#complete-user-journeys)
13. [Business Rules](#business-rules)

---

## Database Schema

### Table 1: `resources`
**Purpose**: Store resource information and overall capacity

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique resource identifier |
| project_id | UUID | FK → projects, CASCADE DELETE | Parent project |
| name | VARCHAR | NOT NULL | Resource name (person or team) |
| role | ENUM | DEFAULT Developer | Role type |
| custom_role_name | VARCHAR | NULLABLE | Custom role if role = 'Other' |
| skills | TEXT[] | NULLABLE | Array of skill tags (e.g., ["React", "Node.js"]) |
| weekly_availability | FLOAT | DEFAULT 40.0 | Default weekly hours available |
| weekly_workload | FLOAT | DEFAULT 0.0 | Default weekly hours allocated |
| load_percentage | FLOAT | DEFAULT 0.0 | Auto-calculated: (workload ÷ availability) × 100 |
| rag_status | ENUM | DEFAULT green | Auto-calculated RAG status |
| notes | TEXT | NULLABLE | Availability notes, constraints |
| is_archived | BOOLEAN | DEFAULT false | Soft delete flag |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

**Role Enum Values**:
- `Developer`
- `QA`
- `BA` (Business Analyst)
- `Designer`
- `Architect`
- `Project Coordinator`
- `Other` (requires custom_role_name)

**RAG Status Enum Values**:
- `green` - Load% < 80% (Underutilized / Healthy)
- `amber` - Load% 80-100% (At Capacity)
- `red` - Load% > 100% (Overloaded)

**Relationships**:
- N:1 with `projects` (resource belongs to project)
- 1:N with `resource_workloads` (weekly workload entries)

**Indexes**:
- `project_id` (for filtering by project)
- `role` (for filtering by role)
- `is_archived` (for excluding archived resources)
- `rag_status` (for RAG filtering)

---

### Table 2: `resource_workloads`
**Purpose**: Track weekly workload data for detailed heatmaps

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique workload entry identifier |
| resource_id | UUID | FK → resources, CASCADE DELETE | Parent resource |
| week_start_date | DATE | NOT NULL | Start of week (Monday) |
| week_end_date | DATE | NOT NULL | End of week (Sunday) |
| availability | FLOAT | NOT NULL | Weekly availability for this week |
| workload | FLOAT | NOT NULL | Weekly workload for this week |
| load_percentage | FLOAT | NOT NULL | (workload ÷ availability) × 100 |
| rag_status | VARCHAR(10) | NOT NULL | green, amber, red |
| notes | TEXT | NULLABLE | Week-specific notes |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

**Unique Constraint**: UNIQUE(resource_id, week_start_date) - One entry per resource per week

**Purpose of Weekly Granularity**:
- Allows week-by-week capacity planning
- Supports time-off, vacations, holidays
- Enables heatmap visualizations
- Tracks historical utilization

---

## Screens & Pages

### Screen 1: Resource Register (Table View)
**Route**: `/projects/:projectId/resources`
**Access**: Users with `VIEW_PROJECT` permission
**Component**: `ResourceRegisterPage.tsx`

#### UI Components
- **Top Bar**:
  - Project breadcrumb navigation
  - "Add Resource" button (top-right)
  - "View Heatmap" button
  - Export to CSV/Excel button
  - Filter/Search controls

- **Main Table**:
  - Columns:
    - Name (sortable)
    - Role (filterable)
    - Skills (tags)
    - Weekly Availability (editable inline)
    - Weekly Workload (editable inline)
    - Load % (calculated, color-coded)
    - RAG Status (badge: green/amber/red)
    - Actions (Edit, Archive)
  - Row actions:
    - Click row → Open Resource Details modal
    - Click "Manage Workload" → Open Workload Modal
    - Click "Archive" → Soft delete

- **Summary Cards** (top of page):
  - Total Resources: 12
  - Underutilized (Green): 5 (42%)
  - At Capacity (Amber): 4 (33%)
  - Overloaded (Red): 3 (25%)

- **Empty State**:
  - "No resources added yet. Add your first resource to start capacity planning."

#### User Actions

##### Action 1: User Clicks "Add Resource"
**Frontend**:
1. Opens modal: "Add New Resource"
2. Form fields:
   - **Name** (required): Text input
   - **Role** (required): Dropdown (Developer, QA, BA, Designer, Architect, Project Coordinator, Other)
   - **Custom Role Name** (required if Role = Other): Text input
   - **Skills** (optional): Tag input (e.g., "React", "Node.js", "Python")
   - **Weekly Availability** (required, default 40): Number input (hours)
   - **Weekly Workload** (optional, default 0): Number input (hours)
   - **Notes** (optional): Textarea
3. Validation:
   - Name: min 2 characters
   - Weekly Availability > 0
   - Weekly Workload >= 0
   - If Role = Other: Custom Role Name required
4. On submit: `POST /api/resources`

**API Call**:
```http
POST /api/resources
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "projectId": "project-uuid",
  "name": "Alice Johnson",
  "role": "Developer",
  "customRoleName": null,
  "skills": ["React", "TypeScript", "Node.js"],
  "weeklyAvailability": 40.0,
  "weeklyWorkload": 35.0,
  "notes": "Available Mon-Fri, 9am-5pm"
}
```

**Backend**:
- **Controller**: `resource.controller.ts` - `@Post()`
- **Service**: `resource.service.ts` - `create(createResourceDto)`

**Backend Flow**:
1. **Validate Project Exists**: Check if projectId is valid
2. **Check for Duplicate Name**: Ensure resource name is unique within project (optional, throws ConflictException if duplicate)
3. **Validate Role**: If role = 'Other', customRoleName must be provided
4. **Set Defaults**:
   - availability = 40.0 if not provided
   - workload = 0.0 if not provided
5. **Calculate Load % and RAG**:
   ```typescript
   if (availability <= 0) {
     loadPercentage = 0;
     ragStatus = 'green';
   } else {
     loadPercentage = (workload / availability) * 100;
     if (loadPercentage < 80) {
       ragStatus = 'green';
     } else if (loadPercentage >= 80 && loadPercentage <= 100) {
       ragStatus = 'amber';
     } else {
       ragStatus = 'red';
     }
   }
   ```
6. **Create Resource Record**:
   ```sql
   INSERT INTO resources (
     project_id, name, role, custom_role_name, skills,
     weekly_availability, weekly_workload,
     load_percentage, rag_status, notes, is_archived
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false)
   ```
7. **Return Created Resource**

**Response**:
```json
{
  "id": "resource-uuid",
  "project": { "id": "project-uuid", "name": "Project Alpha" },
  "name": "Alice Johnson",
  "role": "Developer",
  "customRoleName": null,
  "skills": ["React", "TypeScript", "Node.js"],
  "weeklyAvailability": 40.0,
  "weeklyWorkload": 35.0,
  "loadPercentage": 87.5,
  "ragStatus": "amber",
  "notes": "Available Mon-Fri, 9am-5pm",
  "isArchived": false,
  "createdAt": "2025-01-10T10:00:00Z",
  "updatedAt": "2025-01-10T10:00:00Z"
}
```

**UI Update**:
- Close modal
- Add resource to table
- Update summary cards (+1 total, +1 amber)
- Show success toast: "Resource added successfully"

---

##### Action 2: User Edits Availability or Workload (Inline)
**Frontend**:
1. User clicks on "Weekly Availability" or "Weekly Workload" cell
2. Cell becomes editable (inline editing)
3. User enters new value
4. On blur or Enter: `PATCH /api/resources/:id`

**API Call**:
```http
PATCH /api/resources/{resourceId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "weeklyAvailability": 35.0  // Changed from 40 to 35 (part-time)
}
```

**Backend Flow**:
1. **Validate Resource Exists**
2. **Update Availability or Workload** (or both)
3. **Recalculate Load % and RAG**:
   ```typescript
   availability = updateDto.weeklyAvailability ?? resource.weeklyAvailability;
   workload = updateDto.weeklyWorkload ?? resource.weeklyWorkload;

   if (availability <= 0) {
     loadPercentage = 0;
     ragStatus = 'green';
   } else {
     loadPercentage = (workload / availability) * 100;
     if (loadPercentage < 80) {
       ragStatus = 'green';
     } else if (loadPercentage >= 80 && loadPercentage <= 100) {
       ragStatus = 'amber';
     } else {
       ragStatus = 'red';
     }
   }

   resource.weeklyAvailability = availability;
   resource.weeklyWorkload = workload;
   resource.loadPercentage = loadPercentage;
   resource.ragStatus = ragStatus;
   ```
4. **Save Updated Resource**
5. **Return Updated Resource**

**Response**:
```json
{
  "id": "resource-uuid",
  "name": "Alice Johnson",
  "weeklyAvailability": 35.0,
  "weeklyWorkload": 35.0,
  "loadPercentage": 100.0,  // Recalculated: (35/35)*100 = 100%
  "ragStatus": "amber",     // Changed from amber (87.5%) to amber (100%)
  "updatedAt": "2025-01-10T10:30:00Z"
}
```

**UI Update**:
- Update table cell with new value
- Update Load % cell (recalculated)
- Update RAG Status badge (if changed)
- Update summary cards (if RAG changed)
- Show success toast: "Resource updated"

---

##### Action 3: User Clicks "Manage Workload"
**Frontend**:
1. Opens modal: "Manage Workload for Alice Johnson"
2. Displays:
   - Overall default: 40h availability, 35h workload, 87.5% load (amber)
   - "Add Weekly Workload" button
   - Table of weekly workload entries (if any):
     - Week (date range)
     - Availability
     - Workload
     - Load %
     - RAG
     - Actions (Edit, Delete)
3. Purpose: Set week-specific workload overrides (e.g., vacation, part-time weeks)

**API Call** (to load existing workload data):
```http
GET /api/resources/{resourceId}/workload
Authorization: Bearer <access_token>
```

**Response**:
```json
[
  {
    "weekStartDate": "2025-01-13",
    "weekEndDate": "2025-01-19",
    "availability": 40.0,
    "workload": 40.0,
    "loadPercentage": 100.0,
    "ragStatus": "amber",
    "notes": "Sprint 1 - Full allocation"
  },
  {
    "weekStartDate": "2025-01-20",
    "weekEndDate": "2025-01-26",
    "availability": 0.0,
    "workload": 0.0,
    "loadPercentage": 0.0,
    "ragStatus": "green",
    "notes": "Vacation week"
  },
  {
    "weekStartDate": "2025-01-27",
    "weekEndDate": "2025-02-02",
    "availability": 40.0,
    "workload": 45.0,
    "loadPercentage": 112.5,
    "ragStatus": "red",
    "notes": "Sprint 2 - Overallocated due to urgent feature"
  }
]
```

**User Action**: Click "Add Weekly Workload"
1. Form fields:
   - **Week Start Date** (required, date picker, auto-snaps to Monday)
   - **Availability** (required, default from resource.weeklyAvailability)
   - **Workload** (required, default 0)
   - **Notes** (optional)
2. On submit: `POST /api/resources/workload`

**API Call**:
```http
POST /api/resources/workload
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "resourceId": "resource-uuid",
  "weekStartDate": "2025-02-03",
  "availability": 40.0,
  "workload": 38.0,
  "notes": "Sprint 3 - Normal load"
}
```

**Backend Flow**:
1. **Validate Resource Exists** and is not archived
2. **Calculate Week End Date**: weekStartDate + 6 days (Sunday)
3. **Check for Duplicate**: Check if workload entry already exists for this week
4. **Calculate Load % and RAG**:
   ```typescript
   loadPercentage = (workload / availability) * 100;
   ragStatus = loadPercentage < 80 ? 'green' : (loadPercentage <= 100 ? 'amber' : 'red');
   ```
5. **Create or Update Workload Entry**:
   - If exists: Update existing entry
   - If not exists: Create new entry
   ```sql
   INSERT INTO resource_workloads (
     resource_id, week_start_date, week_end_date,
     availability, workload, load_percentage, rag_status, notes
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT (resource_id, week_start_date) DO UPDATE SET
     availability = EXCLUDED.availability,
     workload = EXCLUDED.workload,
     load_percentage = EXCLUDED.load_percentage,
     rag_status = EXCLUDED.rag_status,
     notes = EXCLUDED.notes
   ```
6. **Return Workload Entry**

**Response**:
```json
{
  "id": "workload-uuid",
  "resource": { "id": "resource-uuid", "name": "Alice Johnson" },
  "weekStartDate": "2025-02-03",
  "weekEndDate": "2025-02-09",
  "availability": 40.0,
  "workload": 38.0,
  "loadPercentage": 95.0,
  "ragStatus": "amber",
  "notes": "Sprint 3 - Normal load",
  "createdAt": "2025-01-10T11:00:00Z"
}
```

**UI Update**:
- Add workload entry to table in modal
- Show success toast: "Workload entry saved"

---

### Screen 2: Resource Heatmap View (Monthly Bubble View)
**Route**: `/projects/:projectId/resources/heatmap`
**Access**: Users with `VIEW_PROJECT` permission
**Component**: `ResourceHeatmapPage.tsx`

#### UI Layout
- **Top Bar**:
  - Project breadcrumb
  - "Back to Resource Table" button
  - Date range selector (default: current year)
  - Filter by Role dropdown
  - Export to PDF/Excel
  - Legend: Green (< 80%), Amber (80-100%), Red (> 100%)

- **Heatmap Grid**:
  - **Rows**: Resources (one row per resource)
  - **Columns**: Weeks (grouped by month)
  - **Cells**: Bubbles representing weekly load

#### Monthly Bubble Heatmap

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  Resource          │  January 2025       │  February 2025      │...│
│                    │ W1  W2  W3  W4  W5  │ W1  W2  W3  W4      │   │
├─────────────────────────────────────────────────────────────────────┤
│ Alice Johnson      │ 🟢  🟡  🟡  🔴  🟢 │ 🟢  🟢  🟢  🟡     │   │
│ (Developer)        │                     │                     │   │
├─────────────────────────────────────────────────────────────────────┤
│ Bob Smith          │ 🟢  🟢  🟢  🟢  🟢 │ 🟢  🟢  🟢  🟢     │   │
│ (QA)               │                     │                     │   │
├─────────────────────────────────────────────────────────────────────┤
│ Charlie Davis      │ 🔴  🔴  🟡  🟡  🟢 │ 🟢  🟢  🟡  🔴     │   │
│ (Designer)         │                     │                     │   │
└─────────────────────────────────────────────────────────────────────┘
```

**Bubble Properties**:

1. **Color** (Based on RAG):
   - 🟢 Green: Load% < 80% (Underutilized / Healthy)
   - 🟡 Amber: Load% 80-100% (At Capacity)
   - 🔴 Red: Load% > 100% (Overloaded)

2. **Size** (Based on Load Intensity):
   - **Small bubble**: Load% < 60% (Light workload)
     - Diameter: 20px
   - **Medium bubble**: Load% 60-100% (Normal workload)
     - Diameter: 30px
   - **Large bubble**: Load% > 100% (Heavy workload)
     - Diameter: 40px

3. **Opacity**:
   - Fully opaque: Current and past weeks
   - Semi-transparent: Future weeks (planned)

**Bubble Rendering Code**:
```tsx
const BubbleCell = ({ weekData, onClick }: Props) => {
  const { loadPercentage, ragStatus } = weekData;

  // Determine color
  const color = ragStatus === 'green' ? '#48bb78' :
                ragStatus === 'amber' ? '#ed8936' : '#f56565';

  // Determine size
  const size = loadPercentage < 60 ? 20 :
               loadPercentage <= 100 ? 30 : 40;

  return (
    <div
      onClick={() => onClick(weekData)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        borderRadius: '50%',
        cursor: 'pointer',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      title={`Load: ${loadPercentage.toFixed(1)}%\nAvailability: ${weekData.availability}h\nWorkload: ${weekData.workload}h`}
    />
  );
};
```

**Month Grouping**:
```tsx
const MonthColumn = ({ month, weeks }: Props) => {
  return (
    <div className="month-column">
      <div className="month-header">{month} 2025</div>
      <div className="week-headers">
        {weeks.map((week, idx) => (
          <div key={idx} className="week-header">W{idx + 1}</div>
        ))}
      </div>
      <div className="bubble-cells">
        {weeks.map((week) => (
          <BubbleCell key={week.weekStartDate} weekData={week} onClick={handleWeekClick} />
        ))}
      </div>
    </div>
  );
};
```

**Interactivity**:

1. **Hover Tooltip**:
   - Displays on bubble hover
   - Content:
     ```
     Week: Jan 13 - Jan 19
     Availability: 40h
     Workload: 45h
     Load%: 112.5%
     Status: Overloaded (Red)
     Notes: Sprint 2 - Urgent feature
     ```

2. **Click Bubble → Drill Down to Weekly View**:
   - User clicks a weekly bubble
   - Navigate to Weekly Heatmap for that week
   - URL: `/projects/:projectId/resources/heatmap/week/:weekStartDate`

---

### API Call for Heatmap Data
```http
GET /api/resources/heatmap/data?projectId=xxx&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer <access_token>
```

**Backend Flow**:
1. **Get All Active Resources** for project
2. **Get All Workload Entries** for resources within date range
3. **Group Workloads by Resource**
4. **Return Structured Data**

**Response**:
```json
[
  {
    "resourceId": "alice-uuid",
    "resourceName": "Alice Johnson",
    "role": "Developer",
    "weeklyData": [
      {
        "weekStartDate": "2025-01-01",
        "weekEndDate": "2025-01-07",
        "availability": 40.0,
        "workload": 30.0,
        "loadPercentage": 75.0,
        "ragStatus": "green",
        "notes": null
      },
      {
        "weekStartDate": "2025-01-08",
        "weekEndDate": "2025-01-14",
        "availability": 40.0,
        "workload": 38.0,
        "loadPercentage": 95.0,
        "ragStatus": "amber",
        "notes": "Sprint planning week"
      },
      {
        "weekStartDate": "2025-01-15",
        "weekEndDate": "2025-01-21",
        "availability": 40.0,
        "workload": 45.0,
        "loadPercentage": 112.5,
        "ragStatus": "red",
        "notes": "Sprint 2 - Overallocated"
      }
      // ... more weeks
    ]
  },
  {
    "resourceId": "bob-uuid",
    "resourceName": "Bob Smith",
    "role": "QA",
    "weeklyData": [
      // ... Bob's weekly data
    ]
  }
  // ... more resources
]
```

**Frontend Processing**:
1. **Group Weeks by Month**:
   ```typescript
   const weeksByMonth = groupBy(weeklyData, (week) => {
     const date = new Date(week.weekStartDate);
     return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
   });
   ```

2. **Render Heatmap Grid**:
   ```tsx
   <table className="heatmap-table">
     <thead>
       <tr>
         <th>Resource</th>
         {Object.keys(weeksByMonth).map((month) => (
           <th key={month} colSpan={weeksByMonth[month].length}>
             {formatMonth(month)}
           </th>
         ))}
       </tr>
       <tr>
         <th></th>
         {Object.values(weeksByMonth).flatMap((weeks, monthIdx) =>
           weeks.map((week, weekIdx) => (
             <th key={`${monthIdx}-${weekIdx}`}>W{weekIdx + 1}</th>
           ))
         )}
       </tr>
     </thead>
     <tbody>
       {resources.map((resource) => (
         <tr key={resource.resourceId}>
           <td>{resource.resourceName} ({resource.role})</td>
           {resource.weeklyData.map((week) => (
             <td key={week.weekStartDate}>
               <BubbleCell weekData={week} onClick={handleWeekClick} />
             </td>
           ))}
         </tr>
       ))}
     </tbody>
   </table>
   ```

---

### Screen 3: Weekly Heatmap (Thermal Load Bar)
**Route**: `/projects/:projectId/resources/heatmap/week/:weekStartDate`
**Access**: Users with `VIEW_PROJECT` permission
**Component**: `WeeklyHeatmapPage.tsx`

#### Drill-Down from Monthly View
**Triggered by**: User clicks a weekly bubble in monthly heatmap

**URL Example**: `/projects/abc/resources/heatmap/week/2025-01-13`

#### UI Layout
- **Breadcrumb Navigation**:
  - Project > Resources > Heatmap > January 2025 > Week 2 (Jan 13 - Jan 19)
  - Each level is clickable to navigate back

- **Week Header**:
  - Week: Jan 13 - Jan 19, 2025
  - "View Daily Breakdown" button (drills down to daily view)
  - "Back to Monthly View" button

- **Resource List** (one card per resource):
  - Resource Name & Role
  - **Thermal Load Bar** (horizontal bar, 0-100+%)
  - Weekly Load Percentage (number)
  - Mini Bubble (same color coding as monthly view)
  - Notes (if any)

#### Thermal Load Bar

**Visual Design**:
```
┌─────────────────────────────────────────────────────────────┐
│ Alice Johnson (Developer)                        112.5%  🔴│
│ ┌─────────────────────────────────────────────────────────┐│
│ │██████████████████████████████████████████████████████▓▓││
│ └─────────────────────────────────────────────────────────┘│
│ 0%        20%       40%       60%       80%      100%  120%│
│ Notes: Sprint 2 - Overallocated due to urgent feature     │
└─────────────────────────────────────────────────────────────┘
```

**Bar Properties**:
1. **Color Gradient**:
   - 0-40%: Light green (#d0f4de)
   - 40-60%: Green (#a3e4d7)
   - 60-80%: Yellow-green (#f9e79f)
   - 80-100%: Orange (#f8b400)
   - 100%+: Red (#e74c3c)

2. **Width**: Proportional to Load%
   - 100% Load = 100% bar width
   - 120% Load = 120% bar width (extends beyond container with overflow visible)

3. **Markers**:
   - Vertical line at 80% (amber threshold)
   - Vertical line at 100% (red threshold)

**Component Code**:
```tsx
const ThermalLoadBar = ({ loadPercentage, ragStatus }: Props) => {
  const getColor = (load: number): string => {
    if (load < 40) return '#d0f4de';
    if (load < 60) return '#a3e4d7';
    if (load < 80) return '#f9e79f';
    if (load <= 100) return '#f8b400';
    return '#e74c3c';
  };

  const barWidth = Math.min(loadPercentage, 150); // Cap visual at 150%

  return (
    <div className="thermal-load-bar-container">
      <div className="thermal-load-bar-track">
        <div
          className="thermal-load-bar-fill"
          style={{
            width: `${barWidth}%`,
            backgroundColor: getColor(loadPercentage),
            transition: 'width 0.3s, background-color 0.3s',
          }}
        />
        <div className="threshold-marker" style={{ left: '80%' }}>80%</div>
        <div className="threshold-marker" style={{ left: '100%' }}>100%</div>
      </div>
      <div className="load-percentage-label">{loadPercentage.toFixed(1)}%</div>
      <div className={`rag-badge rag-${ragStatus}`}>{ragStatus.toUpperCase()}</div>
    </div>
  );
};
```

#### Mini Bubble Visualization
Alongside the thermal bar, show a mini bubble (same size/color logic as monthly view):
```tsx
<div className="mini-bubble" style={{
  width: `${bubbleSize}px`,
  height: `${bubbleSize}px`,
  backgroundColor: bubbleColor,
  borderRadius: '50%',
}} />
```

---

### Screen 4: Daily Heatmap (GitHub-style Grid)
**Route**: `/projects/:projectId/resources/heatmap/week/:weekStartDate/daily`
**Access**: Users with `VIEW_PROJECT` permission
**Component**: `DailyHeatmapPage.tsx`

#### Drill-Down from Weekly View
**Triggered by**: User clicks "View Daily Breakdown" in weekly view

**URL Example**: `/projects/abc/resources/heatmap/week/2025-01-13/daily`

#### UI Layout
- **Breadcrumb Navigation**:
  - Project > Resources > Heatmap > January 2025 > Week 2 > Daily View

- **Week Header**:
  - Week: Jan 13 - Jan 19, 2025
  - "Back to Weekly View" button

- **GitHub-Style Contribution Grid** (one grid per resource):

#### GitHub-Style Heatmap Grid

**Visual Design**:
```
┌──────────────────────────────────────────────────────────┐
│ Alice Johnson (Developer)                      112.5%  🔴│
│                                                          │
│   Mon   Tue   Wed   Thu   Fri   Sat   Sun              │
│   ■■    ■■    ■■    ■■    ■■    □     □                 │
│   Jan13 Jan14 Jan15 Jan16 Jan17 Jan18 Jan19             │
│   95%   100%  120%  115%  110%  0%    0%                │
│                                                          │
│ Legend:                                                  │
│ □ No data / 0%                                          │
│ ▪ Light: < 60%                                          │
│ ◼ Medium: 60-80%                                        │
│ ■ Dark: 80-100%                                         │
│ 🔴 Red: > 100%                                          │
└──────────────────────────────────────────────────────────┘
```

**Grid Properties**:

1. **Layout**:
   - 5 or 7 squares (Mon-Fri or Mon-Sun)
   - Each square represents one day
   - Horizontal layout

2. **Color Intensity** (GitHub-style):
   - **Gray (No data)**: loadPercentage = 0 or no data
     - Color: #ebedf0
   - **Light Green**: loadPercentage < 60%
     - Color: #c6e48b
   - **Medium Green**: loadPercentage 60-80%
     - Color: #7bc96f
   - **Dark Green**: loadPercentage 80-100%
     - Color: #239a3b
   - **Red**: loadPercentage > 100%
     - Color: #e74c3c

3. **Size**:
   - Square: 40px × 40px
   - Gap: 4px

**Daily Load Calculation**:

**Default Distribution** (if no daily data exists):
```typescript
function calculateDailyLoad(weeklyWorkload: number, weeklyAvailability: number): DailyLoad[] {
  const workingDays = 5; // Mon-Fri
  const dailyWorkload = weeklyWorkload / workingDays;
  const dailyAvailability = weeklyAvailability / workingDays;

  const days = [];
  for (let i = 0; i < 7; i++) {
    if (i < 5) { // Mon-Fri
      days.push({
        date: addDays(weekStartDate, i),
        availability: dailyAvailability,
        workload: dailyWorkload,
        loadPercentage: (dailyWorkload / dailyAvailability) * 100,
      });
    } else { // Sat-Sun
      days.push({
        date: addDays(weekStartDate, i),
        availability: 0,
        workload: 0,
        loadPercentage: 0,
      });
    }
  }

  return days;
}
```

**Example Calculation**:
```
Weekly: 40h availability, 45h workload (112.5% load)

Daily Distribution (default, Mon-Fri):
  Mon: 8h availability, 9h workload → 112.5%
  Tue: 8h availability, 9h workload → 112.5%
  Wed: 8h availability, 9h workload → 112.5%
  Thu: 8h availability, 9h workload → 112.5%
  Fri: 8h availability, 9h workload → 112.5%
  Sat: 0h availability, 0h workload → 0%
  Sun: 0h availability, 0h workload → 0%
```

**Future Enhancement**: Manual daily override (allow users to set daily workload)

**Component Code**:
```tsx
const DailyHeatmapGrid = ({ weekStartDate, weeklyData }: Props) => {
  const dailyLoads = calculateDailyLoad(weeklyData.workload, weeklyData.availability);

  const getColor = (loadPercentage: number): string => {
    if (loadPercentage === 0) return '#ebedf0'; // Gray (no data)
    if (loadPercentage < 60) return '#c6e48b';  // Light green
    if (loadPercentage < 80) return '#7bc96f';  // Medium green
    if (loadPercentage <= 100) return '#239a3b'; // Dark green
    return '#e74c3c'; // Red (overload)
  };

  return (
    <div className="daily-heatmap-grid">
      <div className="day-labels">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="day-label">{day}</div>
        ))}
      </div>
      <div className="day-squares">
        {dailyLoads.map((day) => (
          <div
            key={day.date}
            className="day-square"
            style={{ backgroundColor: getColor(day.loadPercentage) }}
            title={`${formatDate(day.date)}\nAvailability: ${day.availability}h\nWorkload: ${day.workload}h\nLoad: ${day.loadPercentage.toFixed(1)}%`}
          >
            <div className="date-label">{formatDate(day.date, 'MMM d')}</div>
            <div className="load-label">{day.loadPercentage.toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### Interactivity
1. **Hover Tooltip**:
   - Date: Jan 13, 2025
   - Availability: 8h
   - Workload: 9h
   - Daily Load%: 112.5%

2. **Click Day Square** (Future):
   - Open "Daily Detail Panel"
   - Show task breakdown for that day
   - Show actual hours logged (if integrated with time tracking)

---

## Drill-Down Navigation Hierarchy

### Navigation Flow
```
Monthly Heatmap (Bubble View)
    ↓ Click weekly bubble
Weekly Heatmap (Thermal Load Bar)
    ↓ Click "View Daily Breakdown"
Daily Heatmap (GitHub-style Grid)
    ↓ Click "Back to Weekly View"
Weekly Heatmap
    ↓ Click breadcrumb "January 2025"
Monthly Heatmap
```

### Breadcrumb Trail
```tsx
const Breadcrumb = ({ level, data }: Props) => {
  switch (level) {
    case 'monthly':
      return (
        <nav>
          <Link to={`/projects/${projectId}`}>Project</Link> >
          <Link to={`/projects/${projectId}/resources`}>Resources</Link> >
          <span>Heatmap</span>
        </nav>
      );

    case 'weekly':
      return (
        <nav>
          <Link to={`/projects/${projectId}`}>Project</Link> >
          <Link to={`/projects/${projectId}/resources`}>Resources</Link> >
          <Link to={`/projects/${projectId}/resources/heatmap`}>Heatmap</Link> >
          <Link to={`/projects/${projectId}/resources/heatmap`}>{data.month} 2025</Link> >
          <span>Week {data.weekNumber}</span>
        </nav>
      );

    case 'daily':
      return (
        <nav>
          <Link to={`/projects/${projectId}`}>Project</Link> >
          <Link to={`/projects/${projectId}/resources`}>Resources</Link> >
          <Link to={`/projects/${projectId}/resources/heatmap`}>Heatmap</Link> >
          <Link to={`/projects/${projectId}/resources/heatmap`}>{data.month} 2025</Link> >
          <Link to={`/projects/${projectId}/resources/heatmap/week/${data.weekStartDate}`}>Week {data.weekNumber}</Link> >
          <span>Daily View</span>
        </nav>
      );
  }
};
```

### Back Button Behavior
- **Weekly View**: "Back to Monthly View" → Navigate to `/projects/:projectId/resources/heatmap`
- **Daily View**: "Back to Weekly View" → Navigate to `/projects/:projectId/resources/heatmap/week/:weekStartDate`

### URL Structure
```
Monthly: /projects/:projectId/resources/heatmap
         ?startDate=2025-01-01&endDate=2025-12-31

Weekly:  /projects/:projectId/resources/heatmap/week/:weekStartDate
         Example: /projects/abc/resources/heatmap/week/2025-01-13

Daily:   /projects/:projectId/resources/heatmap/week/:weekStartDate/daily
         Example: /projects/abc/resources/heatmap/week/2025-01-13/daily
```

---

## Resource CRUD Operations

### Create Resource (RT-UC01)
**Endpoint**: `POST /api/resources`

**Request Body**:
```json
{
  "projectId": "uuid",
  "name": "Alice Johnson",
  "role": "Developer",
  "customRoleName": null,
  "skills": ["React", "TypeScript"],
  "weeklyAvailability": 40.0,
  "weeklyWorkload": 0.0,
  "notes": "Available Mon-Fri"
}
```

**Validation**:
- projectId: Must exist
- name: Min 2 characters, unique within project
- role: Valid enum value
- customRoleName: Required if role = 'Other'
- weeklyAvailability: Must be > 0
- weeklyWorkload: Must be >= 0

**Business Logic**:
1. Validate project exists
2. Check for duplicate name (optional, configurable)
3. Validate role and customRoleName
4. Set defaults: availability = 40, workload = 0
5. **Calculate Load% and RAG**:
   ```typescript
   if (availability <= 0) {
     loadPercentage = 0;
     ragStatus = 'green';
   } else {
     loadPercentage = (workload / availability) * 100;
     if (loadPercentage < 80) {
       ragStatus = 'green';
     } else if (loadPercentage <= 100) {
       ragStatus = 'amber';
     } else {
       ragStatus = 'red';
     }
   }
   ```
6. Create resource record
7. Return resource with calculated fields

**Response**: See example in Screen 1

---

### Update Resource (RT-UC02)
**Endpoint**: `PATCH /api/resources/:id`

**Request Body** (all fields optional):
```json
{
  "name": "Alice Johnson-Smith",
  "role": "Senior Developer",
  "skills": ["React", "TypeScript", "GraphQL"],
  "weeklyAvailability": 35.0,
  "weeklyWorkload": 32.0,
  "notes": "Part-time (7h/day)"
}
```

**Business Logic**:
1. Validate resource exists
2. Update provided fields
3. If role changed to 'Other': Require customRoleName
4. **Recalculate Load% and RAG** if availability or workload changed
5. Save updated resource
6. Return updated resource

---

### Archive Resource (RT-UC03)
**Endpoint**: `PATCH /api/resources/:id/archive`

**Request Body**: None (or `{ "isArchived": true }`)

**Business Logic**:
1. Set `isArchived = true`
2. Resource no longer appears in active lists
3. Historical workload data preserved
4. Can be unarchived by setting `isArchived = false`

---

### View Resource Details (RT-UC16)
**Endpoint**: `GET /api/resources/:id`

**Response**:
```json
{
  "id": "uuid",
  "project": { "id": "uuid", "name": "Project Alpha" },
  "name": "Alice Johnson",
  "role": "Developer",
  "skills": ["React", "TypeScript"],
  "weeklyAvailability": 40.0,
  "weeklyWorkload": 35.0,
  "loadPercentage": 87.5,
  "ragStatus": "amber",
  "notes": "Available Mon-Fri",
  "isArchived": false,
  "workloads": [
    { "weekStartDate": "2025-01-13", "loadPercentage": 95.0, "ragStatus": "amber" },
    { "weekStartDate": "2025-01-20", "loadPercentage": 0.0, "ragStatus": "green" }
  ]
}
```

---

## Load % Calculation

### Formula
```
Load % = (Weekly Workload ÷ Weekly Availability) × 100
```

### Examples

#### Example 1: Healthy Load
```
Availability: 40 hours/week
Workload: 30 hours/week
Load%: (30 ÷ 40) × 100 = 75%
RAG: Green (< 80%)
Interpretation: Underutilized, has 10h capacity for additional work
```

#### Example 2: At Capacity
```
Availability: 40 hours/week
Workload: 40 hours/week
Load%: (40 ÷ 40) × 100 = 100%
RAG: Amber (80-100%)
Interpretation: Fully utilized, at maximum capacity
```

#### Example 3: Overloaded
```
Availability: 40 hours/week
Workload: 50 hours/week
Load%: (50 ÷ 40) × 100 = 125%
RAG: Red (> 100%)
Interpretation: Overallocated by 10 hours, requires overtime or task reallocation
```

#### Example 4: Part-Time
```
Availability: 20 hours/week (50% part-time)
Workload: 18 hours/week
Load%: (18 ÷ 20) × 100 = 90%
RAG: Amber (80-100%)
Interpretation: Part-time resource at 90% capacity
```

#### Example 5: Vacation Week
```
Availability: 0 hours/week (on vacation)
Workload: 0 hours/week
Load%: 0%
RAG: Green
Interpretation: No availability, no work assigned (expected)
```

### Validation Rules
1. **Availability > 0**: Cannot divide by zero
   - If availability = 0: Set Load% = 0, RAG = green
2. **Workload >= 0**: Cannot have negative workload
3. **Load% Calculation**: Round to 2 decimal places for display

### Recalculation Triggers
Load% and RAG are **auto-calculated** whenever:
1. Resource is created
2. Weekly availability is updated
3. Weekly workload is updated
4. Weekly workload entry is added/updated/deleted

---

## RAG Status Calculation

### Thresholds
```typescript
enum ResourceRAGStatus {
  GREEN = 'green',  // Load% < 80%
  AMBER = 'amber',  // Load% 80-100%
  RED = 'red',      // Load% > 100%
}

function calculateRAGStatus(loadPercentage: number): ResourceRAGStatus {
  if (loadPercentage < 80) {
    return ResourceRAGStatus.GREEN;
  } else if (loadPercentage >= 80 && loadPercentage <= 100) {
    return ResourceRAGStatus.AMBER;
  } else {
    return ResourceRAGStatus.RED;
  }
}
```

### RAG Meanings

#### GREEN (< 80%)
**Interpretation**: Underutilized / Healthy capacity
**Actions**:
- Resource has available capacity for additional work
- Can take on new tasks
- Good work-life balance

**Examples**:
- 50% Load: Part-time or low workload
- 75% Load: Healthy utilization with buffer

#### AMBER (80-100%)
**Interpretation**: At Capacity / Normal load
**Actions**:
- Resource is fully utilized
- Minimal spare capacity
- Monitor for potential overload

**Examples**:
- 85% Load: Near full capacity
- 95% Load: Almost at limit
- 100% Load: Fully allocated

#### RED (> 100%)
**Interpretation**: Overloaded / Requires attention
**Actions**:
- Resource is over-allocated
- Risk of burnout, missed deadlines
- Immediate action required:
  - Reduce workload
  - Reassign tasks to other resources
  - Adjust deadlines
  - Hire additional resources

**Examples**:
- 110% Load: 10% over capacity (4h overtime/week)
- 125% Load: 25% over capacity (10h overtime/week)
- 150% Load: 50% over capacity (critical overallocation)

### Visual Indicators

#### Table View
```tsx
const RAGBadge = ({ ragStatus }: Props) => {
  const config = {
    green: { color: '#48bb78', bg: '#c6f6d5', label: 'Green' },
    amber: { color: '#ed8936', bg: '#feebc8', label: 'Amber' },
    red: { color: '#f56565', bg: '#fed7d7', label: 'Red' },
  };

  const { color, bg, label } = config[ragStatus];

  return (
    <span
      style={{
        backgroundColor: bg,
        color: color,
        padding: '4px 12px',
        borderRadius: '12px',
        fontWeight: 'bold',
        fontSize: '12px',
      }}
    >
      {label}
    </span>
  );
};
```

#### Heatmap View
- Bubble color: Green/Amber/Red
- Bubble size: Intensity of load

---

## Filter & Sort

### Filter Options

#### 1. Filter by Role
**UI**: Dropdown with checkboxes
**Options**:
- Developer
- QA
- BA
- Designer
- Architect
- Project Coordinator
- Other

**API**: `GET /api/resources/filter?projectId=xxx&role=Developer`

**Backend**:
```sql
SELECT * FROM resources
WHERE project_id = ? AND role = ?
```

---

#### 2. Filter by Name (Search)
**UI**: Search input field
**Behavior**: Case-insensitive, partial match

**API**: `GET /api/resources/filter?projectId=xxx&name=Alice`

**Backend**:
```sql
SELECT * FROM resources
WHERE project_id = ? AND name ILIKE '%Alice%'
```

---

#### 3. Filter by Load % Range
**UI**: Range slider (0-150%)
**Options**:
- Min Load: 0%
- Max Load: 150%

**API**: `GET /api/resources/filter?projectId=xxx&minLoad=80&maxLoad=100`

**Backend**:
```sql
SELECT * FROM resources
WHERE project_id = ?
  AND load_percentage >= 80
  AND load_percentage <= 100
```

**Use Cases**:
- Find overloaded resources: minLoad=100, maxLoad=200
- Find underutilized resources: minLoad=0, maxLoad=60
- Find at-capacity resources: minLoad=80, maxLoad=100

---

#### 4. Filter by RAG Status
**UI**: Checkboxes
**Options**:
- Green (< 80%)
- Amber (80-100%)
- Red (> 100%)

**API**: `GET /api/resources/filter?projectId=xxx&ragStatus=red`

**Backend**:
```sql
SELECT * FROM resources
WHERE project_id = ? AND rag_status = 'red'
```

---

#### 5. Filter by Archived Status
**UI**: Toggle switch "Include Archived"
**Default**: Exclude archived

**API**: `GET /api/resources?projectId=xxx&includeArchived=true`

**Backend**:
```sql
SELECT * FROM resources
WHERE project_id = ?
  AND (is_archived = false OR ? = true)  -- includeArchived parameter
```

---

### Sort Options

#### 1. Sort by Name
**Options**:
- A → Z (ascending)
- Z → A (descending)

**Backend**: `ORDER BY name ASC` or `ORDER BY name DESC`

---

#### 2. Sort by Load %
**Options**:
- Low → High (ascending, 0% first)
- High → Low (descending, 150% first)

**Backend**: `ORDER BY load_percentage ASC` or `ORDER BY load_percentage DESC`

**Use Case**: Quickly identify most overloaded resources (High → Low)

---

#### 3. Sort by Role
**Options**: Alphabetical by role

**Backend**: `ORDER BY role ASC`

---

### Combined Filter & Sort Example
**User Action**: Filter by "Red" RAG status, sort by Load% (High → Low)

**API**: `GET /api/resources/filter?projectId=xxx&ragStatus=red&sortBy=loadPercentage&sortOrder=DESC`

**Response**:
```json
[
  { "name": "Charlie Davis", "role": "Designer", "loadPercentage": 135.0, "ragStatus": "red" },
  { "name": "Alice Johnson", "role": "Developer", "loadPercentage": 112.5, "ragStatus": "red" },
  { "name": "Eve Martinez", "role": "QA", "loadPercentage": 105.0, "ragStatus": "red" }
]
```

---

## Export Heatmaps

### Export Options

#### 1. Export to PDF
**UI**: "Export to PDF" button in heatmap view

**API Call**:
```http
GET /api/resources/heatmap/export/pdf?projectId=xxx&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer <access_token>
```

**Backend**:
- Use library: `pdfkit` or `puppeteer`
- Generate PDF with:
  - Project name
  - Date range
  - Heatmap visualization (monthly bubble view)
  - Color legend
  - Summary statistics
  - Timestamp
- Return PDF file

**Response**: `Content-Type: application/pdf`

**Filename**: `ProjectAlpha_ResourceTracker_Monthly_2025-01-30.pdf`

---

#### 2. Export to Excel
**UI**: "Export to Excel" button

**API Call**:
```http
GET /api/resources/heatmap/export/excel?projectId=xxx&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer <access_token>
```

**Backend**:
- Use library: `exceljs`
- Generate Excel with:
  - **Sheet 1**: Resource Summary Table
    - Columns: Name, Role, Weekly Availability, Weekly Workload, Load%, RAG Status
  - **Sheet 2**: Weekly Heatmap Data
    - Rows: Resources
    - Columns: Weeks (Week 1, Week 2, etc.)
    - Cells: Load% values with conditional formatting (color-coded)
  - **Sheet 3**: Raw Data (all workload entries)

**Response**: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Filename**: `ProjectAlpha_ResourceTracker_2025-01-30.xlsx`

---

#### 3. Export as Image (PNG)
**UI**: "Export as Image" button

**API Call**:
```http
GET /api/resources/heatmap/export/png?projectId=xxx&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer <access_token>
```

**Backend**:
- Use library: `puppeteer` (headless Chrome)
- Render heatmap view
- Capture screenshot
- Return PNG file

**Response**: `Content-Type: image/png`

**Filename**: `ProjectAlpha_Heatmap_2025-01-30.png`

---

## Over/Under Utilization Alerts

### Dashboard Widget
**Component**: `ResourceCapacitySummary.tsx`

**API**: `GET /api/resources/summary/capacity?projectId=xxx`

**Response**:
```json
{
  "totalResources": 12,
  "underutilized": 5,   // Load% < 80%
  "ideal": 4,           // Load% 80-100%
  "overloaded": 3,      // Load% > 100%
  "ragDistribution": {
    "green": 5,
    "amber": 4,
    "red": 3
  }
}
```

**Widget Display**:
```
┌────────────────────────────────────────┐
│  Resource Capacity Summary             │
├────────────────────────────────────────┤
│  Total Resources: 12                   │
│                                        │
│  🟢 Underutilized: 5 (42%)             │
│  🟡 At Capacity: 4 (33%)               │
│  🔴 Overloaded: 3 (25%)                │
│                                        │
│  [View Resource Tracker] →             │
└────────────────────────────────────────┘
```

---

### Visual Alerts in Table
**Rule**: Resources with RAG = Red are highlighted

**Implementation**:
```tsx
<tr
  className={resource.ragStatus === 'red' ? 'row-alert' : ''}
  style={{
    backgroundColor: resource.ragStatus === 'red' ? '#fed7d7' : 'transparent',
  }}
>
  {/* Table cells */}
</tr>
```

---

### Email Notifications (Future Enhancement)
**Trigger**: When a resource's RAG status changes to Red

**Email Template**:
```
Subject: [Alert] Resource Overallocation - Alice Johnson

Dear Project Manager,

Resource Alice Johnson (Developer) in Project Alpha is currently overallocated:

- Weekly Availability: 40 hours
- Weekly Workload: 50 hours
- Load%: 125%
- Status: RED (Overloaded)

Recommended Actions:
1. Review and reassign tasks to other team members
2. Reduce workload or extend deadlines
3. Consider additional resources

View details: [Link to Resource Tracker]

Best regards,
StandupSnap System
```

---

## API Endpoints

### Resource Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| POST | `/api/resources` | Create resource | Required | CREATE_PROJECT |
| GET | `/api/resources?projectId=xxx` | List resources for project | Required | VIEW_PROJECT |
| GET | `/api/resources/:id` | Get resource details | Required | VIEW_PROJECT |
| PATCH | `/api/resources/:id` | Update resource | Required | EDIT_PROJECT |
| PATCH | `/api/resources/:id/archive` | Archive resource | Required | EDIT_PROJECT |
| DELETE | `/api/resources/:id` | Delete resource (hard delete) | Required | DELETE_PROJECT |

### Workload Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| POST | `/api/resources/workload` | Create/Update weekly workload | Required | EDIT_PROJECT |
| GET | `/api/resources/:id/workload` | Get resource workload entries | Required | VIEW_PROJECT |

### Heatmap Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| GET | `/api/resources/heatmap/data?projectId=xxx&startDate=xxx&endDate=xxx` | Get heatmap data | Required | VIEW_PROJECT |

### Filter & Sort Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| GET | `/api/resources/filter?projectId=xxx&role=xxx&name=xxx&minLoad=xxx&maxLoad=xxx&isArchived=xxx` | Filter resources | Required | VIEW_PROJECT |

### Summary Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| GET | `/api/resources/summary/capacity?projectId=xxx` | Get capacity summary (dashboard widget) | Required | VIEW_PROJECT |

---

## Complete User Journeys

### Journey 1: Add Resources and Set Weekly Workload

**Scenario**: Project Manager wants to add team members and plan their capacity for the next quarter.

**Steps**:

1. **Navigate to Resources**:
   - Click project "Website Redesign"
   - Click "Resources" tab
   - See empty state: "No resources added yet"

2. **Add First Resource**:
   - Click "Add Resource"
   - Fill in:
     - Name: Alice Johnson
     - Role: Developer
     - Skills: React, TypeScript, Node.js
     - Weekly Availability: 40h
     - Weekly Workload: 0h (default)
   - Submit
   - Resource added with Load% = 0%, RAG = Green

3. **Add More Resources**:
   - Add Bob Smith (QA, 40h availability)
   - Add Charlie Davis (Designer, 35h availability, part-time)
   - Add Dana Lee (BA, 40h availability)
   - Total: 4 resources, all Green (no workload yet)

4. **Set Weekly Workload for Sprint 1 (Jan 13-19)**:
   - Click "Manage Workload" for Alice
   - Click "Add Weekly Workload"
   - Week: Jan 13 (auto-snaps to Monday)
   - Availability: 40h
   - Workload: 35h (Sprint 1 allocation)
   - Notes: "Sprint 1 - Homepage development"
   - Submit
   - Alice's Load% for that week: 87.5% (Amber)

5. **Set Vacation Week** for Bob:
   - Click "Manage Workload" for Bob
   - Add week: Jan 20
   - Availability: 0h (on vacation)
   - Workload: 0h
   - Notes: "Annual leave"
   - Submit
   - Bob's Load% for that week: 0% (Green)

6. **View Heatmap**:
   - Click "View Heatmap"
   - See monthly bubble view:
     - Alice: Jan 13-19 shows Amber bubble
     - Bob: Jan 20-26 shows Gray bubble (no data/vacation)
   - Click on Alice's week bubble → Drill down to weekly view
   - See thermal load bar at 87.5%
   - Click "View Daily Breakdown" → See GitHub-style grid
   - All 5 days show same load (87.5%)

---

### Journey 2: Identify and Resolve Overallocations

**Scenario**: Mid-sprint, PM notices a resource is overallocated and needs to rebalance workload.

**Initial State**:
```
Alice Johnson (Developer):
  - Week Jan 27 - Feb 2:
    - Availability: 40h
    - Workload: 50h
    - Load%: 125% (RED)
    - Notes: "Sprint 2 - Feature A (30h) + Bug fixes (20h)"
```

**Steps**:

1. **Identify Overallocation**:
   - PM opens Resource Register
   - Summary shows: "Overloaded: 1 (RED)"
   - Alice's row is highlighted in red
   - Load%: 125% (50h / 40h)

2. **Drill Down to Details**:
   - Click "Manage Workload" for Alice
   - See week Jan 27: Load% 125% (RED)
   - Notes indicate: Feature A (30h) + Bug fixes (20h)

3. **Analyze Options**:
   - **Option 1**: Reduce Alice's workload (reassign tasks)
   - **Option 2**: Increase Alice's availability (overtime, not ideal)
   - **Option 3**: Extend deadline (postpone Bug fixes)

4. **Take Action** (Option 1: Reassign tasks):
   - Reassign Bug fixes (20h) to Bob Smith (QA, currently at 60% load)
   - Update Alice's workload:
     - Edit week Jan 27
     - Change workload from 50h to 30h
     - Notes: "Sprint 2 - Feature A only"
     - Submit
   - Alice's Load% recalculates: 75% (GREEN)

5. **Update Bob's Workload**:
   - Click "Manage Workload" for Bob
   - Add/Update week Jan 27:
     - Availability: 40h
     - Workload: 24h + 20h = 44h
     - Load%: 110% (AMBER → RED)
     - Notes: "Testing (24h) + Bug fixes from Alice (20h)"
   - Submit

6. **Realize Problem**:
   - Bob is now overallocated (110%)!
   - Need to further rebalance

7. **Final Rebalancing**:
   - Reduce Bug fixes scope from 20h to 15h (postpone some to next sprint)
   - Update Bob's workload to 39h (97.5%, AMBER)
   - Update Alice's workload to 30h + 5h bug fixes = 35h (87.5%, AMBER)

8. **Verify in Heatmap**:
   - Click "View Heatmap"
   - Navigate to week Jan 27
   - See all resources in Green/Amber range
   - No Red bubbles
   - Success!

---

## Business Rules

### BR-01: Resource Name Uniqueness
- **Rule**: Resource names should be unique within a project (optional constraint)
- **Validation**: Check for duplicate name on create
- **Enforcement**: API returns 409 Conflict if duplicate exists
- **Exception**: Can be disabled in settings if multiple resources can have same name

### BR-02: Weekly Availability Must Be Positive
- **Rule**: Weekly availability must be > 0 for load calculation
- **Validation**: Frontend and backend validation
- **Enforcement**: API returns 400 Bad Request if availability <= 0
- **Exception**: Vacation weeks can have 0 availability

### BR-03: Weekly Workload Cannot Be Negative
- **Rule**: Weekly workload must be >= 0
- **Validation**: Frontend and backend validation
- **Enforcement**: API returns 400 Bad Request if workload < 0

### BR-04: Custom Role Name Required for "Other" Role
- **Rule**: If role = "Other", customRoleName must be provided
- **Validation**: Checked on create/update
- **Enforcement**: API returns 400 Bad Request if violated

### BR-05: Load % and RAG Auto-Calculation
- **Rule**: Load% and RAG are always auto-calculated, never user-set
- **Validation**: System-enforced, no user override
- **Enforcement**: Calculated fields are read-only

### BR-06: Weekly Workload Unique Per Resource Per Week
- **Rule**: Only one workload entry allowed per resource per week
- **Validation**: Database UNIQUE constraint
- **Enforcement**: API returns 409 Conflict if duplicate week
- **Behavior**: Existing entry is updated instead of creating duplicate

### BR-07: Week Start Date Must Be Monday
- **Rule**: Week always starts on Monday (ISO 8601 standard)
- **Validation**: Frontend auto-snaps to Monday
- **Enforcement**: Backend recalculates if not Monday

### BR-08: Archived Resources Excluded by Default
- **Rule**: Archived resources are excluded from active lists/heatmaps unless explicitly requested
- **Validation**: Default query filter
- **Enforcement**: `WHERE is_archived = false` by default

### BR-09: Cannot Assign Workload to Archived Resource
- **Rule**: Cannot create workload entry for archived resource
- **Validation**: Checked on workload create/update
- **Enforcement**: API returns 400 Bad Request

### BR-10: RAG Thresholds Are Fixed
- **Rule**: RAG thresholds are:
  - Green: < 80%
  - Amber: 80-100%
  - Red: > 100%
- **Validation**: Hard-coded in calculation logic
- **Enforcement**: Not configurable (future enhancement: custom thresholds)

### BR-11: Load % Calculation Uses Weekly Granularity
- **Rule**: All load calculations are based on weekly data
- **Validation**: Daily data is derived from weekly (default distribution)
- **Enforcement**: Daily breakdown is calculated, not stored

### BR-12: Workload Entries Are Historical
- **Rule**: Past workload entries should not be deleted, only archived
- **Validation**: Soft delete recommended (optional)
- **Enforcement**: Warning on delete (future: prevent deletion of past weeks)

### BR-13: Heatmap Date Range Limited to 1 Year
- **Rule**: Heatmap API restricts date range to max 1 year for performance
- **Validation**: Backend validates date range
- **Enforcement**: API returns 400 Bad Request if range > 365 days

### BR-14: Skills Are Free-Form Tags
- **Rule**: Skills are stored as array of strings, no predefined list
- **Validation**: None (free-form)
- **Enforcement**: Frontend autocomplete for common skills (optional)

### BR-15: Over/Under Utilization Thresholds
- **Rule**: Resources are categorized as:
  - Underutilized: Load% < 80%
  - At Capacity: Load% 80-100%
  - Overloaded: Load% > 100%
- **Validation**: Used for dashboard summary
- **Enforcement**: Informational only, no system actions

---

**End of Resource Tracker Documentation** (48 pages)
