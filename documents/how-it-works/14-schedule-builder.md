# Schedule Builder (Gantt Chart) - How It Works

## Overview
- **Purpose**: MS Project-like scheduling with Gantt visualization, Work Breakdown Structure (WBS), task dependencies, Critical Path Method (CPM), and auto-scheduling
- **Key Features**: WBS hierarchy, 4 dependency types (FS/SS/FF/SF), lag/lead time, CPM calculation, AUTO vs MANUAL scheduling modes, working calendar integration
- **Integration**: gantt-task-react library for Gantt visualization
- **Complexity Level**: VERY HIGH - Enterprise project management capabilities

## Table of Contents
1. [Database Schema](#database-schema)
2. [Screens & Pages](#screens--pages)
3. [Work Breakdown Structure (WBS)](#work-breakdown-structure-wbs)
4. [Gantt Chart Visualization](#gantt-chart-visualization)
5. [Task Dependencies](#task-dependencies)
6. [Critical Path Method (CPM)](#critical-path-method-cpm)
7. [Auto-Scheduling](#auto-scheduling)
8. [Working Calendar](#working-calendar)
9. [Task Management Operations](#task-management-operations)
10. [API Endpoints](#api-endpoints)
11. [Complete User Journeys](#complete-user-journeys)
12. [Business Rules](#business-rules)

---

## Database Schema

### Table 1: `schedules`
**Purpose**: Container for schedule per project (1:1 relationship with project)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique schedule identifier |
| project_id | UUID | FK → projects, CASCADE DELETE | Parent project |
| name | VARCHAR(255) | NOT NULL | Schedule name |
| description | TEXT | NULLABLE | Schedule description |
| schedule_start_date | DATE | NOT NULL | Project start date |
| schedule_end_date | DATE | NOT NULL | Project end date (may extend via CPM) |
| is_archived | BOOLEAN | DEFAULT false | Soft delete flag |
| calendar_id | UUID | FK → working_calendars, SET NULL | Working calendar for this schedule |
| created_by | UUID | FK → users | Creator |
| updated_by | UUID | FK → users | Last updater |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

**Relationships**:
- 1:1 with `projects` (one schedule per project)
- 1:N with `schedule_tasks` (schedule contains many tasks)
- N:1 with `working_calendars` (optional calendar)

---

### Table 2: `schedule_tasks`
**Purpose**: Individual tasks in the schedule with WBS hierarchy

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique task identifier |
| schedule_id | UUID | FK → schedules, CASCADE DELETE | Parent schedule |
| parent_task_id | UUID | FK → schedule_tasks, CASCADE DELETE, NULLABLE | Parent task (for WBS hierarchy) |
| title | VARCHAR(255) | NOT NULL | Task name |
| description | TEXT | NULLABLE | Task description |
| start_date | DATE | NOT NULL | Task start date |
| end_date | DATE | NOT NULL | Task end date |
| duration_days | INTEGER | NOT NULL | Duration in days |
| wbs_code | VARCHAR(50) | NOT NULL | WBS code (e.g., "1.2.3") |
| level | INTEGER | DEFAULT 0 | Hierarchy level (0 = root) |
| order_index | INTEGER | NOT NULL | Order within siblings |
| assignee_id | UUID | FK → team_members, SET NULL, NULLABLE | Assigned team member |
| estimated_hours | DECIMAL(8,2) | NULLABLE | Estimated effort in hours |
| actual_hours | DECIMAL(8,2) | DEFAULT 0 | Actual hours worked |
| status | ENUM | DEFAULT NOT_STARTED | Task status (NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED) |
| progress | INTEGER | DEFAULT 0 | % complete (0-100) |
| scheduling_mode | ENUM | DEFAULT MANUAL | MANUAL or AUTO |
| is_milestone | BOOLEAN | DEFAULT false | Milestone flag (duration = 0) |
| baseline_start_date | DATE | NULLABLE | Original planned start (for variance) |
| baseline_end_date | DATE | NULLABLE | Original planned end (for variance) |
| baseline_duration | INTEGER | NULLABLE | Original planned duration |
| early_start | DATE | NULLABLE | CPM: Early Start date |
| early_finish | DATE | NULLABLE | CPM: Early Finish date |
| late_start | DATE | NULLABLE | CPM: Late Start date |
| late_finish | DATE | NULLABLE | CPM: Late Finish date |
| total_float | INTEGER | DEFAULT 0 | Total slack (in days) |
| free_float | INTEGER | DEFAULT 0 | Free slack (in days) |
| is_critical_path | BOOLEAN | DEFAULT false | Auto-calculated: totalFloat === 0 |
| notes | TEXT | NULLABLE | Task notes |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

**Relationships**:
- N:1 with `schedules` (task belongs to schedule)
- Self-referencing 1:N (parent-child for WBS)
- N:1 with `team_members` (assignee)
- 1:N with `task_dependencies` (as predecessor or successor)

**Indexes**:
- `schedule_id` (for filtering tasks by schedule)
- `parent_task_id` (for WBS queries)
- `wbs_code` (for sorting)
- `is_critical_path` (for critical path queries)

---

### Table 3: `task_dependencies`
**Purpose**: Define relationships between tasks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique dependency identifier |
| predecessor_task_id | UUID | FK → schedule_tasks, CASCADE DELETE | Predecessor task |
| successor_task_id | UUID | FK → schedule_tasks, CASCADE DELETE | Successor task |
| dependency_type | ENUM | DEFAULT FINISH_TO_START | Dependency type |
| lag_days | INTEGER | DEFAULT 0 | Lag (positive) or Lead (negative) in days |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

**Dependency Types** (Enum):
- `FINISH_TO_START` (FS) - Most common
- `START_TO_START` (SS)
- `FINISH_TO_FINISH` (FF)
- `START_TO_FINISH` (SF) - Rare

**Constraints**:
- UNIQUE(predecessor_task_id, successor_task_id) - No duplicate dependencies
- predecessor_task_id ≠ successor_task_id - No self-dependency
- No circular dependencies (enforced in code)

---

### Table 4: `working_calendars`
**Purpose**: Define working days and hours for schedule calculations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique calendar identifier |
| project_id | UUID | FK → projects, CASCADE DELETE, NULLABLE | Associated project |
| name | VARCHAR(255) | NOT NULL | Calendar name |
| description | TEXT | NULLABLE | Calendar description |
| working_days | JSON | DEFAULT [1,2,3,4,5] | Array of working days (0=Sun, 1=Mon, etc.) |
| hours_per_day | DECIMAL(4,2) | DEFAULT 8.0 | Standard hours per day |
| default_start_time | VARCHAR(5) | DEFAULT '09:00' | Start time (HH:MM) |
| default_end_time | VARCHAR(5) | DEFAULT '17:00' | End time (HH:MM) |
| timezone | VARCHAR(50) | DEFAULT 'UTC' | Timezone |
| is_default | BOOLEAN | DEFAULT false | Is this the default calendar? |
| created_by | UUID | FK → users | Creator |
| updated_by | UUID | FK → users | Last updater |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

**Relationships**:
- 1:N with `calendar_exceptions` (holidays, special days)

---

### Table 5: `calendar_exceptions`
**Purpose**: Define holidays and special working days

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique exception identifier |
| calendar_id | UUID | FK → working_calendars, CASCADE DELETE | Parent calendar |
| date | DATE | NOT NULL | Exception date |
| type | ENUM | NOT NULL | NON_WORKING (holiday) or WORKING (special work day) |
| name | VARCHAR(255) | NULLABLE | Exception name (e.g., "Christmas") |
| description | TEXT | NULLABLE | Exception description |
| working_hours | DECIMAL(4,2) | NULLABLE | Hours available if WORKING type |
| is_recurring | BOOLEAN | DEFAULT false | Yearly recurring? (e.g., Dec 25 every year) |
| created_by | UUID | FK → users | Creator |
| updated_by | UUID | FK → users | Last updater |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

---

## Screens & Pages

### Screen 1: Schedule List View
**Route**: `/projects/:projectId/schedules`
**Access**: Users with `VIEW_PROJECT` permission
**Component**: `ScheduleListPage.tsx`

#### UI Components
- Project breadcrumb navigation
- "Create Schedule" button (top-right)
- Schedule cards displaying:
  - Schedule name
  - Date range (start - end)
  - Total tasks count
  - Critical path tasks count
  - Last updated timestamp
  - Archive/Delete actions
- Empty state: "No schedules yet. Create your first schedule."

#### User Actions

##### Action 1: User Clicks "Create Schedule"
**Frontend**:
1. Opens modal: "Create Schedule"
2. Form fields:
   - Name (required)
   - Description (optional)
   - Start Date (required, date picker)
   - End Date (required, date picker, must be >= start date)
   - Working Calendar (dropdown, optional)
3. Validation:
   - Name: min 3 characters
   - End Date >= Start Date
4. On submit: `POST /api/artifacts/schedules`

**API Call**:
```http
POST /api/artifacts/schedules
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "projectId": "uuid",
  "name": "Project Alpha Schedule",
  "description": "Main schedule for Project Alpha",
  "scheduleStartDate": "2025-01-15",
  "scheduleEndDate": "2025-06-30",
  "calendarId": "uuid" // optional
}
```

**Backend**:
- **Controller**: `schedule.controller.ts` - `@Post()`
- **Service**: `schedule.service.ts` - `create(dto, userId)`

**Backend Flow**:
1. Validate project exists
2. Create schedule record
3. Set createdBy and updatedBy to current user
4. Save to database
5. Return created schedule with relations

**Response**:
```json
{
  "id": "schedule-uuid",
  "project": { "id": "uuid", "name": "Project Alpha" },
  "name": "Project Alpha Schedule",
  "description": "Main schedule for Project Alpha",
  "scheduleStartDate": "2025-01-15",
  "scheduleEndDate": "2025-06-30",
  "isArchived": false,
  "calendar": null,
  "createdBy": { "id": "user-uuid", "name": "John Doe" },
  "createdAt": "2025-01-10T10:00:00Z",
  "updatedAt": "2025-01-10T10:00:00Z"
}
```

**UI Update**:
- Close modal
- Redirect to Gantt View for the created schedule
- Show success toast: "Schedule created successfully"

---

### Screen 2: Gantt Chart View (Main Schedule Screen)
**Route**: `/projects/:projectId/schedules/:scheduleId`
**Access**: Users with `VIEW_PROJECT` permission
**Component**: `GanttChartPage.tsx`

#### UI Layout
- **Top Bar**:
  - Schedule name
  - Date range display
  - "Add Task" button
  - "Auto-Schedule All" button
  - "Calculate Critical Path" button
  - View options: Gantt / Table / Split
  - Zoom controls: Day / Week / Month
  - Export: PDF / Excel
- **Left Panel**: Task List (WBS tree view)
  - Hierarchical task list
  - Expandable/collapsible parent tasks
  - Task details: WBS code, title, duration, dates, assignee, progress
  - Inline editing capabilities
- **Right Panel**: Gantt Chart
  - Horizontal timeline (X-axis: dates)
  - Task bars (Y-axis: tasks in WBS order)
  - Dependency lines connecting tasks
  - Critical path highlighted in red
  - Today marker (vertical line)
  - Milestones (diamond icon)
- **Bottom Panel** (optional): Task Details
  - Selected task properties
  - Dependencies list
  - Notes

#### Gantt Chart Features
1. **Task Bars**:
   - Length = duration
   - Position = start/end dates
   - Color coding:
     - Blue: Normal tasks
     - Red: Critical path tasks
     - Green: Completed tasks (progress = 100%)
     - Orange: In progress tasks
     - Gray: Parent tasks (summary tasks)
   - Progress overlay (darker shade for % complete)
   - Diamond icon for milestones

2. **Dependency Lines**:
   - Arrow from predecessor to successor
   - Line color matches dependency type:
     - Black: Finish-to-Start
     - Blue: Start-to-Start
     - Green: Finish-to-Finish
     - Purple: Start-to-Finish
   - Lag indicator (number on line)

3. **Interactivity**:
   - Drag task bar to change dates (if MANUAL mode)
   - Resize task bar to change duration
   - Click task to select and show details
   - Double-click to edit task
   - Right-click for context menu:
     - Edit Task
     - Add Subtask
     - Add Dependency
     - Delete Task
     - Switch to AUTO/MANUAL mode

4. **Timeline Controls**:
   - Zoom: Day view (hourly), Week view (daily), Month view (weekly)
   - Scroll horizontally through timeline
   - Today button: Jump to current date
   - Fit to screen: Zoom to show all tasks

---

### Screen 3: Create Task Modal
**Triggered by**: "Add Task" button or "Add Subtask" context menu
**Component**: `CreateTaskModal.tsx`

#### Form Fields
1. **Basic Details**:
   - **Title** (required): Task name
   - **Description** (optional): Detailed description
   - **Parent Task** (optional, dropdown): Select parent for WBS hierarchy
   - **Order Index** (auto-generated or manual): Position within siblings

2. **Scheduling**:
   - **Scheduling Mode** (radio buttons):
     - MANUAL: User sets dates manually
     - AUTO: System calculates dates from dependencies
   - **Start Date** (required if MANUAL, disabled if AUTO): Date picker
   - **End Date** (required if MANUAL, disabled if AUTO): Date picker
   - **Duration** (calculated or manual): Days
   - **Is Milestone** (checkbox): Zero-duration task

3. **Assignment**:
   - **Assignee** (dropdown): Select team member
   - **Estimated Hours** (optional): Effort estimate

4. **Status**:
   - **Status** (dropdown): NOT_STARTED (default), IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED
   - **Progress %** (slider): 0-100%

5. **Baseline** (optional):
   - **Set as Baseline** (checkbox): Copy start/end/duration to baseline fields

6. **Notes** (optional): Additional notes

#### Validation Rules
- Title: min 3 characters, max 255
- If MANUAL mode: Start Date and End Date required
- End Date >= Start Date
- Duration > 0 unless is_milestone = true
- If parent task selected: Must belong to same schedule
- Progress: 0-100

#### Submit Action

**API Call**:
```http
POST /api/artifacts/schedules/{scheduleId}/tasks
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Design Database Schema",
  "description": "Design and document database schema for all modules",
  "parentTaskId": "parent-uuid", // optional
  "orderIndex": 1,
  "schedulingMode": "MANUAL",
  "startDate": "2025-01-20",
  "endDate": "2025-01-25",
  "assigneeId": "team-member-uuid",
  "estimatedHours": 40,
  "status": "NOT_STARTED",
  "progress": 0,
  "isMilestone": false,
  "notes": "Include all entities and relationships"
}
```

**Backend**:
- **Controller**: `schedule.controller.ts` - `@Post(':id/tasks')`
- **Service**: `schedule.service.ts` - `createTask(scheduleId, dto, userId)`

**Backend Flow**:
1. **Validate Schedule**: Ensure schedule exists
2. **Validate Parent Task** (if provided):
   - Parent must exist
   - Parent must belong to same schedule
3. **Validate Assignee** (if provided): Team member must exist
4. **Generate WBS Code**:
   - If no parent: `orderIndex` (e.g., "1", "2", "3")
   - If parent exists: `parentWbsCode.orderIndex` (e.g., "1.1", "1.2", "2.1")
5. **Calculate Level**:
   - No parent: level = 0
   - With parent: level = parent.level + 1
6. **Calculate Duration**:
   - If milestone: duration = 0
   - Else: duration = (endDate - startDate) + 1 days
7. **Create Task Record**:
   ```sql
   INSERT INTO schedule_tasks (
     schedule_id, parent_task_id, title, description,
     start_date, end_date, duration_days,
     wbs_code, level, order_index,
     assignee_id, estimated_hours,
     status, progress, scheduling_mode, is_milestone, notes
   ) VALUES (...)
   ```
8. **Rollup Parent Dates** (if parent exists):
   - Recalculate parent's start/end dates based on all children
   - Parent start = MIN(children start dates)
   - Parent end = MAX(children end dates)
   - Recursively update grandparents

9. **Return Task** with all relations loaded

**Response**:
```json
{
  "id": "task-uuid",
  "schedule": { "id": "schedule-uuid" },
  "parentTask": { "id": "parent-uuid", "title": "Phase 1", "wbsCode": "1" },
  "title": "Design Database Schema",
  "description": "Design and document database schema for all modules",
  "startDate": "2025-01-20",
  "endDate": "2025-01-25",
  "durationDays": 6,
  "wbsCode": "1.1",
  "level": 1,
  "orderIndex": 1,
  "assignee": { "id": "team-member-uuid", "name": "Jane Smith" },
  "estimatedHours": 40,
  "actualHours": 0,
  "status": "NOT_STARTED",
  "progress": 0,
  "schedulingMode": "MANUAL",
  "isMilestone": false,
  "earlyStart": null,
  "earlyFinish": null,
  "lateStart": null,
  "lateFinish": null,
  "totalFloat": 0,
  "freeFloat": 0,
  "isCriticalPath": false,
  "notes": "Include all entities and relationships",
  "predecessors": [],
  "successors": [],
  "children": [],
  "createdAt": "2025-01-10T10:30:00Z",
  "updatedAt": "2025-01-10T10:30:00Z"
}
```

**UI Update**:
- Close modal
- Add task to WBS tree in correct position
- Render task bar on Gantt chart
- Show success toast: "Task created successfully"

---

### Screen 4: Add Dependency Modal
**Triggered by**: "Add Dependency" button or context menu
**Component**: `AddDependencyModal.tsx`

#### Form Fields
1. **Predecessor Task** (dropdown, required):
   - List all tasks in schedule (exclude current task)
   - Display WBS code + title
   - Searchable dropdown

2. **Successor Task** (auto-filled):
   - The task currently selected (read-only)

3. **Dependency Type** (radio buttons, required):
   - **Finish-to-Start (FS)**: Successor starts after predecessor finishes (default)
   - **Start-to-Start (SS)**: Successor starts when predecessor starts
   - **Finish-to-Finish (FF)**: Successor finishes when predecessor finishes
   - **Start-to-Finish (SF)**: Successor finishes when predecessor starts (rare)

4. **Lag/Lead Days** (number input, default 0):
   - Positive = Lag (delay after predecessor)
   - Negative = Lead (overlap before predecessor completes)
   - Example: Lag +2 means "wait 2 days after predecessor completes"

#### Validation Rules
- Predecessor ≠ Successor (no self-dependency)
- No duplicate dependencies
- No circular dependencies (enforced in backend)

#### Visual Examples (shown in modal)
```
FS (Finish-to-Start):
  Predecessor: ████████
  Successor:           ████████
  Formula: Successor Start = Predecessor End + Lag

SS (Start-to-Start):
  Predecessor: ████████████
  Successor:   ████████████
  Formula: Successor Start = Predecessor Start + Lag

FF (Finish-to-Finish):
  Predecessor: ████████████
  Successor:       ████████████
  Formula: Successor End = Predecessor End + Lag

SF (Start-to-Finish):
  Predecessor:     ████████
  Successor:   ████████
  Formula: Successor End = Predecessor Start + Lag
```

#### Submit Action

**API Call**:
```http
POST /api/artifacts/schedules/tasks/{taskId}/dependencies
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "predecessorTaskId": "predecessor-uuid",
  "successorTaskId": "successor-uuid",
  "dependencyType": "FINISH_TO_START",
  "lagDays": 2
}
```

**Backend**:
- **Controller**: `schedule.controller.ts` - `@Post('tasks/:taskId/dependencies')`
- **Service**: `schedule.service.ts` - `addDependency(dto)`

**Backend Flow**:
1. **Validate Tasks Exist**: Both predecessor and successor must exist
2. **Validate Same Schedule**: Tasks must belong to same schedule
3. **Prevent Self-Dependency**: predecessorTaskId ≠ successorTaskId
4. **Check for Duplicate**:
   ```sql
   SELECT * FROM task_dependencies
   WHERE predecessor_task_id = ? AND successor_task_id = ?
   ```
   If exists: throw ConflictException
5. **Validate No Circular Dependency**:
   - Use Depth-First Search (DFS) to check if adding this dependency creates a cycle
   - Start from successor, traverse all successors recursively
   - If we reach the predecessor, cycle detected
   - Pseudocode:
     ```
     function wouldCreateCycle(newPredecessor, newSuccessor):
       visited = Set()
       stack = [newSuccessor]

       while stack not empty:
         current = stack.pop()
         if current in visited: continue
         if current == newPredecessor: return TRUE // Cycle detected

         visited.add(current)
         for each successor of current:
           stack.push(successor)

       return FALSE // No cycle
     ```
   - If cycle detected: throw BadRequestException('Adding this dependency would create a circular dependency')

6. **Create Dependency Record**:
   ```sql
   INSERT INTO task_dependencies (
     predecessor_task_id, successor_task_id, dependency_type, lag_days
   ) VALUES (?, ?, ?, ?)
   ```

7. **Return Dependency** with task relations loaded

**Response**:
```json
{
  "id": "dependency-uuid",
  "predecessorTask": {
    "id": "predecessor-uuid",
    "wbsCode": "1.1",
    "title": "Design Database Schema",
    "startDate": "2025-01-20",
    "endDate": "2025-01-25"
  },
  "successorTask": {
    "id": "successor-uuid",
    "wbsCode": "1.2",
    "title": "Implement Database Schema",
    "startDate": "2025-01-28",
    "endDate": "2025-02-01"
  },
  "dependencyType": "FINISH_TO_START",
  "lagDays": 2,
  "createdAt": "2025-01-10T10:45:00Z"
}
```

**UI Update**:
- Close modal
- Draw dependency line on Gantt chart
- If successor is in AUTO mode: Trigger auto-schedule for successor
- Show success toast: "Dependency added successfully"

---

## Work Breakdown Structure (WBS)

### What is WBS?
Work Breakdown Structure (WBS) is a hierarchical decomposition of project work into smaller, manageable components. It organizes tasks into parent-child relationships, creating a tree structure.

### WBS Code Generation

#### Algorithm
```typescript
function generateWbsCode(parentTask: Task | null, orderIndex: number): string {
  if (!parentTask) {
    // Root level task
    return `${orderIndex}`; // e.g., "1", "2", "3"
  }

  // Child task: append to parent's WBS code
  return `${parentTask.wbsCode}.${orderIndex}`; // e.g., "1.1", "1.2", "2.1.3"
}
```

#### Examples
```
Project: Website Redesign
├─ 1. Planning Phase
│  ├─ 1.1 Requirements Gathering
│  ├─ 1.2 Stakeholder Interviews
│  └─ 1.3 Create Sitemap
├─ 2. Design Phase
│  ├─ 2.1 Wireframes
│  │  ├─ 2.1.1 Homepage Wireframe
│  │  ├─ 2.1.2 Product Page Wireframe
│  │  └─ 2.1.3 Checkout Wireframe
│  ├─ 2.2 Visual Design
│  └─ 2.3 Design Review
└─ 3. Development Phase
   ├─ 3.1 Frontend Development
   └─ 3.2 Backend Development
```

### Level Tracking

#### Algorithm
```typescript
function calculateLevel(parentTask: Task | null): number {
  if (!parentTask) {
    return 0; // Root level
  }
  return parentTask.level + 1;
}
```

#### Level Definitions
- **Level 0**: Top-level tasks (phases, major deliverables)
- **Level 1**: Sub-tasks under phases
- **Level 2**: Sub-sub-tasks
- **Level N**: Unlimited nesting depth

### Adding Tasks at Different Levels

#### Use Case 1: Add Root-Level Task
**User Action**: Click "Add Task" (no parent selected)
**Result**: Task created at level 0, WBS code = orderIndex

**Example**:
```
Before:
1. Planning Phase
2. Design Phase

After (add "Testing Phase" with orderIndex=3):
1. Planning Phase
2. Design Phase
3. Testing Phase
```

#### Use Case 2: Add Child Task
**User Action**: Select parent task, click "Add Subtask"
**Result**: Task created as child of parent, level = parent.level + 1

**Example**:
```
Before:
1. Planning Phase

After (add "Requirements Gathering" under "1. Planning Phase"):
1. Planning Phase
   1.1 Requirements Gathering
```

#### Use Case 3: Add Sibling Task
**User Action**: Select task, click "Add Task" (same parent)
**Result**: Task created at same level, WBS code shares parent prefix

**Example**:
```
Before:
1. Planning Phase
   1.1 Requirements Gathering

After (add "Stakeholder Interviews" under "1. Planning Phase"):
1. Planning Phase
   1.1 Requirements Gathering
   1.2 Stakeholder Interviews
```

### Moving Tasks in Hierarchy

#### Use Case: Change Parent Task
**User Action**: Drag task to new parent in WBS tree OR edit task and change parent dropdown

**Backend Flow**:
1. **Validate New Parent**:
   - New parent must exist
   - New parent cannot be the task itself
   - New parent cannot be a descendant of the task (prevent circular hierarchy)
2. **Update WBS Code**:
   - Recalculate WBS code based on new parent
   - Recursively update all children's WBS codes
3. **Update Level**:
   - Recalculate level based on new parent
   - Recursively update all children's levels
4. **Rollup Dates**:
   - Remove task from old parent's date calculations
   - Add task to new parent's date calculations

**Example**:
```
Before:
1. Planning Phase
   1.1 Requirements Gathering
2. Design Phase
   2.1 Wireframes

After (move "1.1 Requirements Gathering" under "2. Design Phase"):
1. Planning Phase
2. Design Phase
   2.1 Wireframes
   2.2 Requirements Gathering  ← WBS code changed from 1.1 to 2.2
```

### Deleting Tasks

#### Cascade Deletion of Children
When a parent task is deleted, all its children (and grandchildren, etc.) are automatically deleted due to `CASCADE DELETE` foreign key constraint.

**Example**:
```
Before:
1. Planning Phase
   1.1 Requirements Gathering
   1.2 Stakeholder Interviews
      1.2.1 Interview CEO
      1.2.2 Interview Marketing Team

After (delete "1.2 Stakeholder Interviews"):
1. Planning Phase
   1.1 Requirements Gathering
   ← All descendants (1.2.1, 1.2.2) also deleted
```

**Backend Flow**:
1. **Find Task**: Load task with all relations
2. **Check Dependencies**:
   - If task has successors (other tasks depend on it): Warn user OR auto-delete dependencies
3. **Delete Task**:
   ```sql
   DELETE FROM schedule_tasks WHERE id = ?
   ```
   - Cascades to all children automatically
   - Cascades to all dependencies automatically
4. **Rollup Parent Dates** (if task had parent):
   - Recalculate parent's start/end dates without this task

### Rollup Parent Dates

#### Algorithm
When a child task's dates change (create, update, delete), the parent task's dates must be recalculated to span all children.

```typescript
async function rollupParentDates(parentTask: Task): Promise<void> {
  // Get all children of this parent
  const children = await getChildTasks(parentTask.id);

  if (children.length === 0) {
    return; // No children, no rollup needed
  }

  // Calculate min start date and max end date
  const startDates = children.map(c => new Date(c.startDate).getTime());
  const endDates = children.map(c => new Date(c.endDate).getTime());

  const minStart = new Date(Math.min(...startDates));
  const maxEnd = new Date(Math.max(...endDates));

  // Update parent task dates
  parentTask.startDate = minStart;
  parentTask.endDate = maxEnd;
  parentTask.durationDays = calculateDaysBetween(minStart, maxEnd) + 1;

  await saveTask(parentTask);

  // Recursively rollup grandparent if this parent has a parent
  if (parentTask.parentTask) {
    const grandparent = await getTask(parentTask.parentTask.id);
    await rollupParentDates(grandparent);
  }
}
```

**Example**:
```
Before:
1. Planning Phase (Jan 1 - Jan 15)  ← Will be recalculated
   1.1 Requirements Gathering (Jan 1 - Jan 5)
   1.2 Stakeholder Interviews (Jan 10 - Jan 15)

After (add "1.3 Create Sitemap" Jan 18 - Jan 20):
1. Planning Phase (Jan 1 - Jan 20)  ← Automatically extended to Jan 20
   1.1 Requirements Gathering (Jan 1 - Jan 5)
   1.2 Stakeholder Interviews (Jan 10 - Jan 15)
   1.3 Create Sitemap (Jan 18 - Jan 20)
```

---

## Gantt Chart Visualization

### gantt-task-react Library Integration

#### Installation
```bash
npm install gantt-task-react
```

#### Component Structure
```tsx
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

function GanttChartComponent({ tasks, dependencies }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);

  // Convert schedule tasks to gantt-task-react format
  const ganttTasks: Task[] = tasks.map(task => ({
    id: task.id,
    name: task.title,
    start: new Date(task.startDate),
    end: new Date(task.endDate),
    progress: task.progress,
    type: task.isMilestone ? 'milestone' : 'task',
    isDisabled: task.schedulingMode === 'AUTO', // Prevent manual dragging
    styles: {
      progressColor: task.isCriticalPath ? '#ff0000' : '#3182ce',
      progressSelectedColor: '#ff0000',
      backgroundColor: task.isCriticalPath ? '#ff6b6b' : '#bee3f8',
      backgroundSelectedColor: '#90cdf4',
    },
    dependencies: task.predecessors.map(dep => dep.predecessorTask.id),
  }));

  return (
    <Gantt
      tasks={ganttTasks}
      viewMode={viewMode}
      onDateChange={handleTaskDateChange}
      onProgressChange={handleTaskProgressChange}
      onDoubleClick={handleTaskDoubleClick}
      onDelete={handleTaskDelete}
      listCellWidth="200px"
      columnWidth={viewMode === ViewMode.Day ? 65 : viewMode === ViewMode.Week ? 250 : 300}
      todayColor="rgba(252, 211, 77, 0.5)" // Highlight today
    />
  );
}
```

### Task Bar Rendering

#### Bar Properties
1. **Position**:
   - X-axis: Start date on timeline
   - Y-axis: Row position based on WBS order
2. **Width**: Duration in days × column width
3. **Color**:
   - Normal: Blue (#3182ce)
   - Critical Path: Red (#ff0000)
   - Completed: Green (#48bb78)
   - In Progress: Orange (#ed8936)
   - Parent (Summary): Gray (#718096)
4. **Progress Bar**:
   - Inner overlay showing % complete
   - Darker shade of bar color
   - Width = barWidth × (progress / 100)
5. **Milestone**:
   - Diamond icon instead of bar
   - Positioned at start/end date
   - Duration = 0

### Dependency Lines Rendering

#### Line Drawing Algorithm
```typescript
function drawDependencyLine(predecessor: Task, successor: Task, type: DependencyType): SVGPath {
  const predBar = getTaskBarElement(predecessor.id);
  const succBar = getTaskBarElement(successor.id);

  let startPoint: Point;
  let endPoint: Point;

  switch (type) {
    case DependencyType.FINISH_TO_START:
      startPoint = { x: predBar.right, y: predBar.centerY };
      endPoint = { x: succBar.left, y: succBar.centerY };
      break;

    case DependencyType.START_TO_START:
      startPoint = { x: predBar.left, y: predBar.centerY };
      endPoint = { x: succBar.left, y: succBar.centerY };
      break;

    case DependencyType.FINISH_TO_FINISH:
      startPoint = { x: predBar.right, y: predBar.centerY };
      endPoint = { x: succBar.right, y: succBar.centerY };
      break;

    case DependencyType.START_TO_FINISH:
      startPoint = { x: predBar.left, y: predBar.centerY };
      endPoint = { x: succBar.right, y: succBar.centerY };
      break;
  }

  // Draw path: horizontal → vertical → horizontal (L-shaped connector)
  const path = `M ${startPoint.x},${startPoint.y}
                H ${(startPoint.x + endPoint.x) / 2}
                V ${endPoint.y}
                H ${endPoint.x}`;

  return (
    <path
      d={path}
      stroke={getColorForDependencyType(type)}
      strokeWidth={2}
      fill="none"
      markerEnd="url(#arrowhead)"
    />
  );
}
```

#### Dependency Line Colors
- **Finish-to-Start**: Black (#000000)
- **Start-to-Start**: Blue (#3182ce)
- **Finish-to-Finish**: Green (#48bb78)
- **Start-to-Finish**: Purple (#805ad5)

#### Lag Indicator
If lag > 0 or lag < 0, display lag value on the dependency line:
```tsx
<text
  x={(startPoint.x + endPoint.x) / 2}
  y={(startPoint.y + endPoint.y) / 2 - 5}
  fontSize="12"
  fill="#4a5568"
>
  {lagDays > 0 ? `+${lagDays}d` : `${lagDays}d`}
</text>
```

### Critical Path Highlighting

#### Visual Indicators
1. **Task Bars**:
   - Background: Red (#ff6b6b)
   - Progress: Dark red (#ff0000)
   - Border: Thick red border (3px)
2. **WBS List**:
   - Icon: Red flag or star next to task name
   - Text: Bold red text
3. **Tooltip**:
   - "Critical Path Task - Zero float"

#### Algorithm
Tasks with `isCriticalPath = true` are styled differently. This flag is auto-calculated by CPM.

### Today Marker

#### Vertical Line
```tsx
const TodayMarker = ({ timelineStart, columnWidth }: Props) => {
  const today = new Date();
  const daysSinceStart = Math.floor(
    (today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const xPosition = daysSinceStart * columnWidth;

  return (
    <line
      x1={xPosition}
      y1={0}
      x2={xPosition}
      y2="100%"
      stroke="rgba(252, 211, 77, 0.8)"
      strokeWidth={2}
      strokeDasharray="5,5"
    />
  );
};
```

### Milestone Display

#### Diamond Icon
```tsx
const MilestoneDiamond = ({ task }: Props) => {
  if (!task.isMilestone) return null;

  const x = getDatePosition(task.startDate);
  const y = getRowCenterY(task);

  return (
    <polygon
      points={`${x},${y-10} ${x+10},${y} ${x},${y+10} ${x-10},${y}`}
      fill="#ed8936"
      stroke="#c05621"
      strokeWidth={2}
    />
  );
};
```

### Drag-and-Drop Functionality

#### Task Date Change
```typescript
function handleTaskDateChange(task: Task, start: Date, end: Date): void {
  if (task.schedulingMode === 'AUTO') {
    // Prevent manual changes for AUTO tasks
    showToast('This task is in AUTO mode. Disable auto-scheduling to edit dates manually.', 'warning');
    return;
  }

  // Update task dates
  updateTask(task.id, {
    startDate: start,
    endDate: end,
    durationDays: calculateDaysBetween(start, end) + 1,
  });

  // If task has parent, rollup parent dates
  if (task.parentTask) {
    rollupParentDates(task.parentTask);
  }

  // If task has successors in AUTO mode, trigger auto-schedule
  if (task.successors.some(s => s.schedulingMode === 'AUTO')) {
    autoScheduleTask(task.id);
  }
}
```

#### Task Progress Change
```typescript
function handleTaskProgressChange(task: Task, progress: number): void {
  updateTask(task.id, { progress });

  // If progress = 100%, optionally auto-update status to COMPLETED
  if (progress === 100 && task.status !== 'COMPLETED') {
    const confirmComplete = confirm('Mark this task as Completed?');
    if (confirmComplete) {
      updateTask(task.id, { status: 'COMPLETED' });
    }
  }
}
```

### Zoom Levels

#### View Modes
1. **Day View**:
   - Timeline unit: Hours
   - Column width: 65px per day
   - Best for: Short projects (< 1 month)

2. **Week View**:
   - Timeline unit: Days
   - Column width: 250px per week
   - Best for: Medium projects (1-6 months)

3. **Month View**:
   - Timeline unit: Weeks
   - Column width: 300px per month
   - Best for: Long projects (> 6 months)

#### Zoom Controls
```tsx
<ButtonGroup>
  <Button onClick={() => setViewMode(ViewMode.Day)}>Day</Button>
  <Button onClick={() => setViewMode(ViewMode.Week)}>Week</Button>
  <Button onClick={() => setViewMode(ViewMode.Month)}>Month</Button>
</ButtonGroup>
```

---

## Task Dependencies

### Dependency Types (In Extreme Detail)

### 1. Finish-to-Start (FS) - MOST COMMON

#### Definition
The successor task **cannot start** until the predecessor task **finishes**.

#### Formula
```
Successor Start Date = Predecessor End Date + Lag Days
```

#### Visual Representation
```
Predecessor:  ████████████
Successor:                 ████████████
              FS +0

With Lag (+2 days):
Predecessor:  ████████████
Successor:                   ████████████
              FS +2
```

#### Real-World Examples
1. **Construction**: "Pour Foundation" must finish before "Build Walls" can start
2. **Software**: "Design Database" must finish before "Implement Database" can start
3. **Publishing**: "Write Chapter" must finish before "Edit Chapter" can start

#### Calculation Logic (Auto-Scheduling)
```typescript
function calculateFSStartDate(
  predecessorEndDate: Date,
  lagDays: number,
  calendarId?: string
): Date {
  // Add lag days to predecessor's end date
  return addWorkingDays(predecessorEndDate, lagDays, calendarId);
}

// Example:
// Predecessor ends: Jan 15
// Lag: +2 days
// Result: Successor starts Jan 17 (if no weekends) or Jan 19 (if weekend falls in between)
```

#### With Lead Time (Negative Lag)
```
Lead = -2 days means successor can start 2 days BEFORE predecessor finishes

Predecessor:  ████████████
Successor:           ████████████
              FS -2

This allows overlapping work (fast tracking)
```

---

### 2. Start-to-Start (SS)

#### Definition
The successor task **cannot start** until the predecessor task **starts**.

#### Formula
```
Successor Start Date = Predecessor Start Date + Lag Days
```

#### Visual Representation
```
Predecessor:  ████████████████
Successor:    ████████████
              SS +0

With Lag (+3 days):
Predecessor:  ████████████████
Successor:       ████████████
              SS +3
```

#### Real-World Examples
1. **Construction**: "Install Plumbing" and "Install Electrical" can both start after "Frame Building" starts
2. **Software**: "Frontend Development" and "Backend Development" can both start after "Design Approval" starts
3. **Marketing**: "Social Media Campaign" and "Email Campaign" can both start after "Campaign Launch" starts

#### When to Use
- Parallel tasks that must start together (or shortly after)
- Tasks that can proceed simultaneously
- Fast-tracking to reduce project duration

#### Calculation Logic
```typescript
function calculateSSStartDate(
  predecessorStartDate: Date,
  lagDays: number,
  calendarId?: string
): Date {
  return addWorkingDays(predecessorStartDate, lagDays, calendarId);
}

// Example:
// Predecessor starts: Jan 10
// Lag: +3 days
// Result: Successor starts Jan 13
```

---

### 3. Finish-to-Finish (FF)

#### Definition
The successor task **cannot finish** until the predecessor task **finishes**.

#### Formula
```
Successor End Date = Predecessor End Date + Lag Days
Successor Start Date = Successor End Date - Successor Duration
```

#### Visual Representation
```
Predecessor:  ████████████████
Successor:         ████████████
              FF +0

With Lag (+2 days):
Predecessor:  ████████████████
Successor:         ██████████████
              FF +2
```

#### Real-World Examples
1. **Construction**: "Inspect Building" cannot finish until "Final Cleanup" finishes
2. **Software**: "User Acceptance Testing" cannot finish until "Bug Fixing" finishes
3. **Publishing**: "Indexing" cannot finish until "Final Proofreading" finishes

#### When to Use
- Tasks that must finish together
- Quality control activities tied to main work
- Deliverables that must be synchronized

#### Calculation Logic
```typescript
function calculateFFDates(
  predecessorEndDate: Date,
  successorDuration: number,
  lagDays: number,
  calendarId?: string
): { startDate: Date; endDate: Date } {
  // Successor must finish when predecessor finishes (+ lag)
  const endDate = addWorkingDays(predecessorEndDate, lagDays, calendarId);

  // Work backwards to calculate start date
  const startDate = subtractWorkingDays(endDate, successorDuration, calendarId);

  return { startDate, endDate };
}

// Example:
// Predecessor ends: Jan 20
// Successor duration: 5 days
// Lag: +2 days
// Result:
//   Successor ends: Jan 22
//   Successor starts: Jan 17 (Jan 22 - 5 days)
```

---

### 4. Start-to-Finish (SF) - RARE

#### Definition
The successor task **cannot finish** until the predecessor task **starts**.

#### Formula
```
Successor End Date = Predecessor Start Date + Lag Days
Successor Start Date = Successor End Date - Successor Duration
```

#### Visual Representation
```
Predecessor:       ████████████
Successor:    ████████████
              SF +0

With Lag (+2 days):
Predecessor:         ████████████
Successor:    ██████████████
              SF +2
```

#### Real-World Examples (Very Uncommon)
1. **Shift Handover**: "Night Shift" cannot finish until "Day Shift" starts
2. **Just-in-Time Delivery**: "Old Inventory Usage" cannot finish until "New Inventory Arrives" starts
3. **Phased Rollout**: "Beta Version" cannot be retired until "Production Version" starts

#### When to Use (Rarely)
- Handover scenarios
- Just-in-time processes
- Phased transitions

#### Calculation Logic
```typescript
function calculateSFDates(
  predecessorStartDate: Date,
  successorDuration: number,
  lagDays: number,
  calendarId?: string
): { startDate: Date; endDate: Date } {
  // Successor must finish when predecessor starts (+ lag)
  const endDate = addWorkingDays(predecessorStartDate, lagDays, calendarId);

  // Work backwards to calculate start date
  const startDate = subtractWorkingDays(endDate, successorDuration, calendarId);

  return { startDate, endDate };
}

// Example:
// Predecessor starts: Jan 20
// Successor duration: 7 days
// Lag: +2 days
// Result:
//   Successor ends: Jan 22
//   Successor starts: Jan 15 (Jan 22 - 7 days)
```

---

### Lag and Lead Time

#### Lag (Positive Value)
**Definition**: Delay time between predecessor and successor.

**Examples**:
- **Lag +2**: Wait 2 days after predecessor completes
- **Lag +5**: Wait 5 days (e.g., concrete curing time)

**Use Cases**:
- Mandatory waiting periods (curing, drying, approval)
- Buffer time between activities
- Resource constraints (team needs break)

**Example Scenario**:
```
Task A: Pour Concrete Foundation (Jan 1 - Jan 3)
Task B: Build Walls (requires 7-day curing time)
Dependency: A → B (FS +7)

Result:
  A finishes: Jan 3
  Wait: 7 days
  B starts: Jan 10
```

#### Lead (Negative Value)
**Definition**: Overlap time, allowing successor to start before predecessor completes.

**Examples**:
- **Lag -2**: Start 2 days before predecessor finishes
- **Lag -5**: Start 5 days before predecessor finishes

**Use Cases**:
- Fast-tracking (overlapping activities to reduce duration)
- Iterative work (e.g., testing can start before all development completes)

**Example Scenario**:
```
Task A: Write Documentation (Jan 1 - Jan 10)
Task B: Review Documentation (can start early with partial docs)
Dependency: A → B (FS -3)

Result:
  A finishes: Jan 10
  Lead: -3 days
  B starts: Jan 7 (3 days before A finishes)
```

---

## Critical Path Method (CPM)

### What is CPM?

#### Definition
The Critical Path Method (CPM) is a project management technique that identifies the **longest sequence of dependent tasks** that determines the **minimum project duration**. Tasks on the critical path have **zero slack** (float), meaning any delay in these tasks will delay the entire project.

#### Key Concepts
1. **Critical Path**: The longest path through the project network
2. **Float/Slack**: The amount of time a task can be delayed without delaying the project
3. **Early Dates**: The earliest a task can start/finish
4. **Late Dates**: The latest a task can start/finish without delaying the project

---

### CPM Calculation Algorithm (Detailed Explanation)

The CPM calculation consists of **4 main steps**:

### Step 1: Forward Pass (Calculate Early Start & Early Finish)

#### Purpose
Calculate the earliest possible start and finish dates for each task, considering all predecessor constraints.

#### Algorithm
```
For each task (in topological order, starting from tasks with no predecessors):

  IF task has no predecessors:
    Early Start (ES) = Project Start Date
  ELSE:
    ES = MAX(all predecessors' Early Finish + lag adjustment)

  Early Finish (EF) = ES + Duration
```

#### Pseudocode
```typescript
async function calculateForwardPass(tasks: Task[], scheduleStartDate: Date): Promise<void> {
  // Build task map for quick lookups
  const taskMap = new Map<string, Task>();
  tasks.forEach(task => taskMap.set(task.id, task));

  // Track which tasks have been calculated
  const calculated = new Set<string>();

  // Recursive function to calculate early dates
  async function calculateEarlyDates(task: Task): Promise<void> {
    if (calculated.has(task.id)) {
      return; // Already calculated
    }

    // Base case: No predecessors
    if (!task.predecessors || task.predecessors.length === 0) {
      task.earlyStart = scheduleStartDate;
      task.earlyFinish = addDays(task.earlyStart, task.durationDays);
      calculated.add(task.id);
      return;
    }

    // Recursive case: Has predecessors
    const earlyStartCandidates: Date[] = [];

    for (const dep of task.predecessors) {
      const predTask = taskMap.get(dep.predecessorTask.id);

      // Ensure predecessor is calculated first (topological order)
      if (!calculated.has(predTask.id)) {
        await calculateEarlyDates(predTask);
      }

      // Calculate early start based on dependency type
      const candidateDate = calculateDependentDate(
        dep.dependencyType,
        predTask.earlyStart,
        predTask.earlyFinish,
        task.durationDays,
        dep.lagDays,
        true // isForward pass
      );

      earlyStartCandidates.push(candidateDate);
    }

    // Early Start = latest of all predecessor constraints
    task.earlyStart = new Date(Math.max(...earlyStartCandidates.map(d => d.getTime())));
    task.earlyFinish = addDays(task.earlyStart, task.durationDays);
    calculated.add(task.id);
  }

  // Calculate for all tasks
  for (const task of tasks) {
    await calculateEarlyDates(task);
  }
}

// Helper: Calculate dependent date based on dependency type
function calculateDependentDate(
  depType: DependencyType,
  predStart: Date,
  predFinish: Date,
  successorDuration: number,
  lagDays: number,
  isForward: boolean
): Date {
  if (isForward) {
    // Forward pass - calculating early start of successor
    switch (depType) {
      case DependencyType.FINISH_TO_START:
        return addDays(predFinish, lagDays);

      case DependencyType.START_TO_START:
        return addDays(predStart, lagDays);

      case DependencyType.FINISH_TO_FINISH:
        // Successor finishes when pred finishes, so start = finish - duration
        return subtractDays(addDays(predFinish, lagDays), successorDuration);

      case DependencyType.START_TO_FINISH:
        // Successor finishes when pred starts, so start = finish - duration
        return subtractDays(addDays(predStart, lagDays), successorDuration);
    }
  }
  // Backward pass logic (see Step 2)
}
```

#### Example Calculation
```
Tasks:
  A: Duration 5 days, no predecessors
  B: Duration 3 days, depends on A (FS +0)
  C: Duration 4 days, depends on A (FS +2)
  D: Duration 2 days, depends on B and C (FS +0)

Project Start: Jan 1

Forward Pass:
  Task A:
    No predecessors → ES = Jan 1
    EF = Jan 1 + 5 days = Jan 5

  Task B:
    Predecessor A (FS +0) → ES = A.EF + 0 = Jan 5
    EF = Jan 5 + 3 days = Jan 7

  Task C:
    Predecessor A (FS +2) → ES = A.EF + 2 = Jan 7
    EF = Jan 7 + 4 days = Jan 10

  Task D:
    Predecessor B (FS +0) → candidate ES = Jan 7
    Predecessor C (FS +0) → candidate ES = Jan 10
    ES = MAX(Jan 7, Jan 10) = Jan 10  ← Must wait for both
    EF = Jan 10 + 2 days = Jan 11

Project End Date = Jan 11 (latest EF)
```

---

### Step 2: Backward Pass (Calculate Late Start & Late Finish)

#### Purpose
Calculate the latest possible start and finish dates for each task without delaying the project.

#### Algorithm
```
Project End Date = MAX(all tasks' Early Finish)

For each task (in reverse topological order, starting from tasks with no successors):

  IF task has no successors:
    Late Finish (LF) = Project End Date
  ELSE:
    LF = MIN(all successors' Late Start - lag adjustment)

  Late Start (LS) = LF - Duration
```

#### Pseudocode
```typescript
async function calculateBackwardPass(tasks: Task[]): Promise<void> {
  const taskMap = new Map<string, Task>();
  tasks.forEach(task => taskMap.set(task.id, task));

  // Find project end date (latest early finish)
  const projectEndDate = new Date(Math.max(...tasks.map(t => t.earlyFinish.getTime())));

  const calculated = new Set<string>();

  async function calculateLateDates(task: Task): Promise<void> {
    if (calculated.has(task.id)) {
      return;
    }

    // Base case: No successors
    if (!task.successors || task.successors.length === 0) {
      task.lateFinish = projectEndDate;
      task.lateStart = subtractDays(task.lateFinish, task.durationDays);
      calculated.add(task.id);
      return;
    }

    // Recursive case: Has successors
    const lateFinishCandidates: Date[] = [];

    for (const dep of task.successors) {
      const succTask = taskMap.get(dep.successorTask.id);

      // Ensure successor is calculated first (reverse order)
      if (!calculated.has(succTask.id)) {
        await calculateLateDates(succTask);
      }

      // Calculate late finish based on dependency type
      const candidateDate = calculateDependentDate(
        dep.dependencyType,
        succTask.lateStart,
        succTask.lateFinish,
        task.durationDays,
        dep.lagDays,
        false // isBackward pass
      );

      lateFinishCandidates.push(candidateDate);
    }

    // Late Finish = earliest of all successor constraints
    task.lateFinish = new Date(Math.min(...lateFinishCandidates.map(d => d.getTime())));
    task.lateStart = subtractDays(task.lateFinish, task.durationDays);
    calculated.add(task.id);
  }

  // Calculate for all tasks (reverse order)
  for (const task of tasks.reverse()) {
    await calculateLateDates(task);
  }
}
```

#### Example Calculation (Continued)
```
Project End Date: Jan 11

Backward Pass:
  Task D:
    No successors → LF = Jan 11
    LS = Jan 11 - 2 days = Jan 10

  Task C:
    Successor D (FS +0) → LF = D.LS - 0 = Jan 10
    LS = Jan 10 - 4 days = Jan 7

  Task B:
    Successor D (FS +0) → LF = D.LS - 0 = Jan 10
    LS = Jan 10 - 3 days = Jan 7

  Task A:
    Successor B (FS +0) → candidate LF = Jan 7
    Successor C (FS +2) → candidate LF = Jan 7 - 2 = Jan 5
    LF = MIN(Jan 7, Jan 5) = Jan 5  ← Must finish early enough for C
    LS = Jan 5 - 5 days = Jan 1
```

---

### Step 3: Calculate Float (Slack)

#### Total Float
**Definition**: The amount of time a task can be delayed without delaying the project.

**Formula**:
```
Total Float = Late Start - Early Start
            = Late Finish - Early Finish
```

**Interpretation**:
- **Total Float = 0**: Task is on critical path, no slack
- **Total Float > 0**: Task has slack, can be delayed

#### Free Float
**Definition**: The amount of time a task can be delayed without delaying any successor task.

**Formula**:
```
Free Float = MIN(successors' Early Start) - Early Finish
```

**Interpretation**:
- **Free Float = 0**: Task immediately affects successors
- **Free Float > 0**: Task can be delayed without impacting successors

#### Pseudocode
```typescript
async function calculateFloat(tasks: Task[]): Promise<void> {
  const taskMap = new Map<string, Task>();
  tasks.forEach(task => taskMap.set(task.id, task));

  for (const task of tasks) {
    // Total Float = LS - ES (or LF - EF, both are equivalent)
    task.totalFloat = getDaysBetween(task.earlyStart, task.lateStart);

    // Free Float
    if (!task.successors || task.successors.length === 0) {
      // No successors: free float = total float
      task.freeFloat = task.totalFloat;
    } else {
      // Get earliest successor early start
      const successorEarlyStarts = task.successors
        .map(dep => taskMap.get(dep.successorTask.id).earlyStart)
        .filter(date => date !== undefined);

      if (successorEarlyStarts.length > 0) {
        const minSuccessorES = new Date(Math.min(...successorEarlyStarts.map(d => d.getTime())));
        task.freeFloat = getDaysBetween(task.earlyFinish, minSuccessorES);
      } else {
        task.freeFloat = task.totalFloat;
      }
    }
  }
}
```

#### Example Calculation (Continued)
```
Task A:
  ES = Jan 1, LS = Jan 1
  Total Float = Jan 1 - Jan 1 = 0 days  ← CRITICAL

  Successors: B (ES = Jan 5), C (ES = Jan 7)
  Min Successor ES = Jan 5
  EF = Jan 5
  Free Float = Jan 5 - Jan 5 = 0 days

Task B:
  ES = Jan 5, LS = Jan 7
  Total Float = Jan 7 - Jan 5 = 2 days  ← HAS SLACK

  Successor: D (ES = Jan 10)
  EF = Jan 7
  Free Float = Jan 10 - Jan 7 = 3 days

Task C:
  ES = Jan 7, LS = Jan 7
  Total Float = Jan 7 - Jan 7 = 0 days  ← CRITICAL

  Successor: D (ES = Jan 10)
  EF = Jan 10
  Free Float = Jan 10 - Jan 10 = 0 days

Task D:
  ES = Jan 10, LS = Jan 10
  Total Float = Jan 10 - Jan 10 = 0 days  ← CRITICAL

  No successors
  Free Float = 0 days
```

---

### Step 4: Identify Critical Path

#### Definition
Tasks where **Total Float = 0** are on the critical path.

#### Algorithm
```typescript
async function identifyCriticalPath(tasks: Task[]): Promise<void> {
  for (const task of tasks) {
    task.isCriticalPath = (task.totalFloat === 0);
  }
}
```

#### Example Result
```
Critical Path: A → C → D
  - Task A: Total Float = 0
  - Task C: Total Float = 0
  - Task D: Total Float = 0

Non-Critical:
  - Task B: Total Float = 2 days (can be delayed up to 2 days)
```

---

### Complete CPM Service Implementation

**File**: `F:\StandupSnap\backend\src\artifacts\critical-path.service.ts`

```typescript
@Injectable()
export class CriticalPathService {
  /**
   * Main orchestration method - Recalculates entire schedule
   */
  async recalculateSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);
    }

    // Get all tasks with dependencies
    const tasks = await this.taskRepository.find({
      where: { schedule: { id: scheduleId } },
      relations: ['predecessors', 'predecessors.predecessorTask', 'successors', 'successors.successorTask'],
      order: { orderIndex: 'ASC' },
    });

    if (tasks.length === 0) {
      return; // Nothing to calculate
    }

    // Step 1: Forward Pass
    await this.calculateForwardPass(tasks, schedule);

    // Step 2: Backward Pass
    await this.calculateBackwardPass(tasks, schedule.calendar?.id);

    // Step 3: Calculate Float
    await this.calculateFloat(tasks, schedule.calendar?.id);

    // Step 4: Identify Critical Path
    await this.identifyCriticalPath(tasks);

    // Save all updated tasks
    await this.taskRepository.save(tasks);
  }

  /**
   * Get all critical path tasks for a schedule
   */
  async getCriticalPathTasks(scheduleId: string): Promise<ScheduleTask[]> {
    const tasks = await this.taskRepository.find({
      where: { schedule: { id: scheduleId }, isCriticalPath: true },
      relations: ['assignee', 'predecessors', 'successors'],
      order: { orderIndex: 'ASC' },
    });

    return tasks;
  }
}
```

---

### CPM API Endpoints

#### 1. Calculate Critical Path
```http
POST /api/artifacts/schedules/:scheduleId/calculate-critical-path
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "message": "Critical path calculated successfully"
}
```

**Backend Flow**:
1. Call `criticalPathService.recalculateSchedule(scheduleId)`
2. Forward pass, backward pass, float calculation, identify critical path
3. Save all updated tasks
4. Return success message

#### 2. Get Critical Path Tasks
```http
GET /api/artifacts/schedules/:scheduleId/critical-path-tasks
Authorization: Bearer <access_token>
```

**Response**:
```json
[
  {
    "id": "task-a-uuid",
    "wbsCode": "1",
    "title": "Task A",
    "earlyStart": "2025-01-01",
    "earlyFinish": "2025-01-05",
    "lateStart": "2025-01-01",
    "lateFinish": "2025-01-05",
    "totalFloat": 0,
    "freeFloat": 0,
    "isCriticalPath": true
  },
  {
    "id": "task-c-uuid",
    "wbsCode": "3",
    "title": "Task C",
    "earlyStart": "2025-01-07",
    "earlyFinish": "2025-01-10",
    "lateStart": "2025-01-07",
    "lateFinish": "2025-01-10",
    "totalFloat": 0,
    "freeFloat": 0,
    "isCriticalPath": true
  }
]
```

---

### Visual Diagrams

#### CPM Calculation Flow
```
┌─────────────────────────────────────────┐
│  Step 1: Forward Pass                   │
│  ┌────┐    ┌────┐    ┌────┐            │
│  │ A  │───▶│ B  │───▶│ D  │            │
│  │ES:1│    │ES:5│    │ES:10           │
│  │EF:5│    │EF:7│    │EF:11           │
│  └────┘    └────┘    └────┘            │
│     │                                   │
│     └──────▶┌────┐                      │
│             │ C  │──────┘               │
│             │ES:7│                      │
│             │EF:10                      │
│             └────┘                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 2: Backward Pass                  │
│  ┌────┐    ┌────┐    ┌────┐            │
│  │ A  │───▶│ B  │───▶│ D  │            │
│  │LS:1│    │LS:7│    │LS:10           │
│  │LF:5│    │LF:10    │LF:11           │
│  └────┘    └────┘    └────┘            │
│     │                                   │
│     └──────▶┌────┐                      │
│             │ C  │──────┘               │
│             │LS:7│                      │
│             │LF:10                      │
│             └────┘                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Step 3: Calculate Float                │
│  ┌────┐    ┌────┐    ┌────┐            │
│  │ A  │───▶│ B  │───▶│ D  │            │
│  │TF:0│    │TF:2│    │TF:0│            │
│  │ 🔴 │    │    │    │ 🔴 │            │
│  └────┘    └────┘    └────┘            │
│     │                                   │
│     └──────▶┌────┐                      │
│             │ C  │──────┘               │
│             │TF:0│                      │
│             │ 🔴 │                      │
│             └────┘                      │
│                                         │
│  🔴 = Critical Path (TF = 0)           │
└─────────────────────────────────────────┘
```

---

## Auto-Scheduling

### MANUAL vs AUTO Mode

#### MANUAL Mode
**Description**: User manually sets task dates. System respects these dates and does not auto-calculate.

**Use Cases**:
- Specific date constraints (e.g., client deadline)
- External dependencies (e.g., vendor delivery date)
- Milestones (e.g., product launch date)

**Behavior**:
- User can drag task bars on Gantt chart
- User can edit start/end dates in task form
- Dependencies are informational only (system warns if dates violate dependencies but doesn't auto-adjust)

#### AUTO Mode
**Description**: System automatically calculates task dates based on dependencies and predecessor dates.

**Use Cases**:
- Standard task flows (design → develop → test)
- Tasks with clear dependencies
- Most tasks in a typical project schedule

**Behavior**:
- Task bars are locked on Gantt chart (cannot drag)
- Start/end date fields are disabled in task form (calculated fields)
- When predecessor changes, successor auto-recalculates
- Duration can still be edited manually

---

### Auto-Scheduling Algorithm

#### Overview
When a task in AUTO mode is created or its predecessor changes, the system automatically calculates the task's start and end dates based on:
1. Predecessor task dates
2. Dependency type (FS/SS/FF/SF)
3. Lag/lead days
4. Working calendar (skip weekends/holidays)

#### Triggers
Auto-scheduling runs when:
1. **User creates a new task in AUTO mode**
2. **User adds a dependency to an AUTO task**
3. **User updates a predecessor task** (propagates to AUTO successors)
4. **User clicks "Auto-Schedule All"** (recalculates entire schedule)
5. **User changes a task from MANUAL to AUTO**

---

### Auto-Schedule All Algorithm

**Endpoint**: `POST /api/artifacts/schedules/:scheduleId/auto-schedule`

**Service**: `auto-schedule.service.ts` - `autoScheduleAll(scheduleId)`

#### Pseudocode
```typescript
async function autoScheduleAll(scheduleId: string): Promise<void> {
  // Get schedule with calendar
  const schedule = await getSchedule(scheduleId);
  const calendarId = schedule.calendar?.id;

  // Get all tasks with dependencies
  const tasks = await getAllTasks(scheduleId);

  // Build task map for quick lookups
  const taskMap = new Map<string, Task>();
  tasks.forEach(task => taskMap.set(task.id, task));

  // Track which tasks have been scheduled
  const scheduled = new Set<string>();

  // Recursive function to schedule a task
  async function scheduleTask(task: Task): Promise<void> {
    if (scheduled.has(task.id)) {
      return; // Already scheduled
    }

    // If task is in MANUAL mode, skip auto-scheduling
    if (task.schedulingMode === SchedulingMode.MANUAL) {
      scheduled.add(task.id);
      return;
    }

    // If task has no predecessors, use schedule start date
    if (!task.predecessors || task.predecessors.length === 0) {
      task.startDate = schedule.scheduleStartDate;
      task.endDate = addDays(task.startDate, task.durationDays, calendarId);
      scheduled.add(task.id);
      return;
    }

    // Schedule all predecessors first (topological order)
    for (const dep of task.predecessors) {
      const predTask = taskMap.get(dep.predecessorTask.id);
      if (predTask && !scheduled.has(predTask.id)) {
        await scheduleTask(predTask);
      }
    }

    // Calculate start date based on all predecessors
    const startCandidates: Date[] = [];

    for (const dep of task.predecessors) {
      const predTask = taskMap.get(dep.predecessorTask.id);
      if (!predTask) continue;

      const candidateDate = calculateStartDate(
        dep.dependencyType,
        predTask.startDate,
        predTask.endDate,
        task.durationDays,
        dep.lagDays,
        calendarId
      );

      startCandidates.push(candidateDate);
    }

    // Start date = latest of all predecessor constraints
    if (startCandidates.length > 0) {
      task.startDate = new Date(Math.max(...startCandidates.map(d => d.getTime())));
      task.endDate = addDays(task.startDate, task.durationDays, calendarId);
    }

    scheduled.add(task.id);
  }

  // Schedule all tasks
  for (const task of tasks) {
    await scheduleTask(task);
  }

  // Save all updated tasks
  await saveTasks(tasks);
}

// Helper: Calculate start date based on dependency type
function calculateStartDate(
  depType: DependencyType,
  predStart: Date,
  predFinish: Date,
  successorDuration: number,
  lagDays: number,
  calendarId?: string
): Date {
  switch (depType) {
    case DependencyType.FINISH_TO_START:
      // Successor starts after predecessor finishes
      return addDays(predFinish, lagDays, calendarId);

    case DependencyType.START_TO_START:
      // Successor starts when predecessor starts
      return addDays(predStart, lagDays, calendarId);

    case DependencyType.FINISH_TO_FINISH:
      // Successor finishes when predecessor finishes
      // So start = finish - duration
      const finishDate = addDays(predFinish, lagDays, calendarId);
      return subtractDays(finishDate, successorDuration, calendarId);

    case DependencyType.START_TO_FINISH:
      // Successor finishes when predecessor starts
      // So start = finish - duration
      const endDate = addDays(predStart, lagDays, calendarId);
      return subtractDays(endDate, successorDuration, calendarId);

    default:
      return predFinish;
  }
}
```

#### Example Execution
```
Initial State (all AUTO mode):
  Task A: Duration 5 days, no predecessors
  Task B: Duration 3 days, depends on A (FS +0)
  Task C: Duration 4 days, depends on A (FS +2)
  Task D: Duration 2 days, depends on B (FS +0) and C (FS +0)

Schedule Start: Jan 1

Execution Order (topological):
  1. Schedule A (no predecessors):
     Start: Jan 1
     End: Jan 1 + 5 = Jan 5

  2. Schedule B (depends on A):
     Candidate: A.End + 0 = Jan 5
     Start: Jan 5
     End: Jan 5 + 3 = Jan 7

  3. Schedule C (depends on A):
     Candidate: A.End + 2 = Jan 7
     Start: Jan 7
     End: Jan 7 + 4 = Jan 10

  4. Schedule D (depends on B and C):
     Candidate from B: B.End + 0 = Jan 7
     Candidate from C: C.End + 0 = Jan 10
     Start: MAX(Jan 7, Jan 10) = Jan 10  ← Must wait for both
     End: Jan 10 + 2 = Jan 11

Result:
  A: Jan 1 - Jan 5
  B: Jan 5 - Jan 7
  C: Jan 7 - Jan 10
  D: Jan 10 - Jan 11
```

---

### Auto-Schedule Single Task (Cascade Update)

**Endpoint**: `POST /api/artifacts/schedules/tasks/:taskId/auto-schedule`

**Service**: `auto-schedule.service.ts` - `autoScheduleTask(taskId)`

#### Purpose
When a predecessor task's dates change (e.g., user drags it on Gantt chart), auto-schedule all successor tasks in AUTO mode.

#### Cascade Propagation Algorithm
```typescript
async function autoScheduleTask(taskId: string): Promise<void> {
  const task = await getTask(taskId);
  const schedule = task.schedule;
  const calendarId = schedule.calendar?.id;

  // Get all tasks in the schedule
  const allTasks = await getAllTasks(schedule.id);
  const taskMap = new Map<string, Task>();
  allTasks.forEach(t => taskMap.set(t.id, t));

  // Update this task if it's in AUTO mode
  if (task.schedulingMode === SchedulingMode.AUTO) {
    await updateTaskDates(task, taskMap, calendarId);
  }

  // Propagate changes to all successors in AUTO mode
  await propagateToSuccessors(task, taskMap, calendarId);

  // Save all updated tasks
  await saveTasks(Array.from(taskMap.values()));
}

async function propagateToSuccessors(
  task: Task,
  taskMap: Map<string, Task>,
  calendarId?: string
): Promise<void> {
  if (!task.successors || task.successors.length === 0) {
    return; // No successors to propagate to
  }

  const processed = new Set<string>();

  async function propagate(currentTask: Task): Promise<void> {
    if (!currentTask.successors) return;

    for (const dep of currentTask.successors) {
      const succTask = taskMap.get(dep.successorTask.id);
      if (!succTask || processed.has(succTask.id)) continue;

      // Only update AUTO tasks
      if (succTask.schedulingMode === SchedulingMode.AUTO) {
        await updateTaskDates(succTask, taskMap, calendarId);
        processed.add(succTask.id);

        // Recursively propagate to successors of successor
        await propagate(succTask);
      }
    }
  }

  await propagate(task);
}

async function updateTaskDates(
  task: Task,
  taskMap: Map<string, Task>,
  calendarId?: string
): Promise<void> {
  if (task.schedulingMode === SchedulingMode.MANUAL) {
    return; // Don't update MANUAL tasks
  }

  if (!task.predecessors || task.predecessors.length === 0) {
    // No predecessors - use schedule start date
    const schedule = await getSchedule(task.schedule.id);
    task.startDate = schedule.scheduleStartDate;
    task.endDate = addDays(task.startDate, task.durationDays, calendarId);
    return;
  }

  const startCandidates: Date[] = [];

  for (const dep of task.predecessors) {
    const predTask = taskMap.get(dep.predecessorTask.id);
    if (!predTask) continue;

    const candidateDate = calculateStartDate(
      dep.dependencyType,
      predTask.startDate,
      predTask.endDate,
      task.durationDays,
      dep.lagDays,
      calendarId
    );

    startCandidates.push(candidateDate);
  }

  if (startCandidates.length > 0) {
    task.startDate = new Date(Math.max(...startCandidates.map(d => d.getTime())));
    task.endDate = addDays(task.startDate, task.durationDays, calendarId);
  }
}
```

#### Example: Cascade Update
```
Initial State:
  Task A (MANUAL): Jan 1 - Jan 5
  Task B (AUTO): Jan 5 - Jan 7 (depends on A, FS +0)
  Task C (AUTO): Jan 7 - Jan 10 (depends on B, FS +0)
  Task D (MANUAL): Jan 10 - Jan 12 (depends on C, FS +0)

User Action: Drag Task A to Jan 3 - Jan 7 (delayed by 2 days)

Cascade Execution:
  1. Task A updated: Jan 3 - Jan 7 (user action)

  2. Auto-schedule Task B (successor of A, AUTO mode):
     Predecessor A ends: Jan 7
     Start: Jan 7 + 0 = Jan 7
     End: Jan 7 + 2 = Jan 9  ← Updated from Jan 5-7 to Jan 7-9

  3. Auto-schedule Task C (successor of B, AUTO mode):
     Predecessor B ends: Jan 9
     Start: Jan 9 + 0 = Jan 9
     End: Jan 9 + 3 = Jan 11  ← Updated from Jan 7-10 to Jan 9-11

  4. Task D (MANUAL mode):
     NOT auto-updated, remains Jan 10 - Jan 12
     System shows warning: "Task D violates dependency with Task C"

Result:
  A: Jan 3 - Jan 7 (MANUAL, user-set)
  B: Jan 7 - Jan 9 (AUTO, recalculated)
  C: Jan 9 - Jan 11 (AUTO, recalculated)
  D: Jan 10 - Jan 12 (MANUAL, unchanged, violates dependency)
```

---

### MANUAL Tasks Block Propagation

#### Rule
AUTO propagation stops at MANUAL tasks. MANUAL tasks do not auto-update their dates, even if predecessors change.

#### Example
```
Task A (AUTO): Jan 1 - Jan 5
Task B (MANUAL): Jan 10 - Jan 15 (user-set deadline)
Task C (AUTO): Jan 15 - Jan 20 (depends on B, FS +0)

User Action: Task A delayed to Jan 1 - Jan 10

Result:
  Task A: Jan 1 - Jan 10 (updated)
  Task B: Jan 10 - Jan 15 (NOT updated, MANUAL mode)
  Task C: Jan 15 - Jan 20 (NOT updated, because B didn't change)
```

---

## Working Calendar

### Working Days Calendar

#### Purpose
Define which days are working days (e.g., Mon-Fri) vs non-working days (e.g., Sat-Sun, holidays).

#### Default Calendar
**Working Days**: Monday - Friday (1, 2, 3, 4, 5)
**Non-Working Days**: Saturday, Sunday (0, 6)
**Hours per Day**: 8.0
**Start Time**: 09:00
**End Time**: 17:00

#### Custom Calendar
Users can create custom calendars with different working days:
- **5-day week**: Mon-Fri
- **6-day week**: Mon-Sat
- **7-day operation**: All days
- **Shift work**: Custom patterns

---

### Calendar Exceptions

#### Types
1. **NON_WORKING**: Holiday or day off (normally a working day becomes non-working)
2. **WORKING**: Special working day (normally a non-working day becomes working)

#### Examples
```
Non-Working Exceptions (Holidays):
- Christmas Day (Dec 25) - Recurring
- New Year's Day (Jan 1) - Recurring
- Company Annual Shutdown (Dec 26-30) - One-time

Working Exceptions (Special Days):
- Weekend Overtime (Sat, Jan 15) - One-time
- Emergency Deployment (Sun, Feb 20) - One-time
```

#### Recurring Exceptions
**Use Case**: Annual holidays like Christmas, New Year, Independence Day

**Behavior**: Applies to the same month/day every year

**Example**:
```
Exception: Christmas Day
  Date: 2025-12-25
  Type: NON_WORKING
  isRecurring: true

Result:
  2025-12-25: Non-working
  2026-12-25: Non-working
  2027-12-25: Non-working
  ...
```

---

### Working Days Calculation

#### Add Working Days
**Use Case**: Calculate end date when duration is known

**Algorithm**:
```typescript
async function addWorkingDays(
  startDate: Date,
  daysToAdd: number,
  calendarId?: string
): Promise<Date> {
  const calendar = calendarId ? await getCalendar(calendarId) : null;
  const workingDays = calendar?.workingDays || [1, 2, 3, 4, 5]; // Default Mon-Fri
  const exceptions = calendar?.exceptions || [];

  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < daysToAdd) {
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);

    // Check if this day is a working day
    if (isWorkingDay(currentDate, workingDays, exceptions)) {
      daysAdded++;
    }
  }

  return currentDate;
}

function isWorkingDay(
  date: Date,
  workingDays: number[],
  exceptions: CalendarException[]
): boolean {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Check for calendar exceptions first
  const exception = findException(date, exceptions);
  if (exception) {
    return exception.type === ExceptionType.WORKING;
  }

  // Otherwise, check if it's a normal working day
  return workingDays.includes(dayOfWeek);
}
```

**Example**:
```
Calendar: Mon-Fri working, Sat-Sun non-working
Exception: Dec 25 (Tue) - Non-working (Christmas)

Add 5 working days to Dec 20 (Tue):
  Dec 20 (Tue) - Start
  Dec 21 (Wed) - Day 1
  Dec 22 (Thu) - Day 2
  Dec 23 (Fri) - Day 3
  Dec 24 (Sat) - Skip (weekend)
  Dec 25 (Sun) - Skip (weekend)
  Dec 26 (Mon) - Skip (Christmas, exception)
  Dec 27 (Tue) - Day 4
  Dec 28 (Wed) - Day 5
  Result: Dec 28 (Wed)
```

---

## Task Management Operations

### Create Task (Detailed Flow)

**User Journey**: User clicks "Add Task" → Fills form → Submits

**Frontend Validation**:
1. Title: 3-255 characters
2. Start Date < End Date (if MANUAL mode)
3. Duration > 0 (unless milestone)
4. Parent task must be from same schedule

**API Call**:
```http
POST /api/artifacts/schedules/:scheduleId/tasks
```

**Backend Operations**:
1. Validate schedule exists
2. Validate parent task (if provided)
3. Validate assignee (if provided)
4. Generate WBS code
5. Calculate level
6. Calculate duration (end - start + 1)
7. Create task record
8. Rollup parent dates (if parent exists)
9. Return task with relations

**Post-Creation Actions**:
- If AUTO mode: Auto-schedule this task
- If has parent: Update parent's summary dates
- Render on Gantt chart

---

### Update Task (Detailed Flow)

**User Journey**: User double-clicks task → Edits form → Submits

**API Call**:
```http
PUT /api/artifacts/schedules/tasks/:taskId
```

**Backend Operations**:
1. Validate task exists
2. Handle parent task change (if changed):
   - Validate no circular hierarchy
   - Recalculate WBS code
   - Recalculate level
   - Update child WBS codes recursively
3. Handle assignee change (if changed):
   - Validate assignee exists
4. Handle date changes (if changed):
   - Validate end >= start
   - Recalculate duration
5. Update all fields
6. Rollup parent dates (if parent exists)
7. If switching from MANUAL to AUTO: Trigger auto-schedule

**Post-Update Actions**:
- If has AUTO successors: Cascade auto-schedule
- Re-render Gantt chart
- Update WBS tree

---

### Delete Task (Detailed Flow)

**User Journey**: User right-clicks task → "Delete" → Confirm dialog → Delete

**API Call**:
```http
DELETE /api/artifacts/schedules/tasks/:taskId
```

**Backend Operations**:
1. Find task with all relations
2. Check dependencies (warn if other tasks depend on it)
3. Delete task:
   - Cascades to all children (WBS hierarchy)
   - Cascades to all dependencies
4. Rollup parent dates (if had parent)

**Confirmation Dialog**:
```
"Delete Task: 1.2 Stakeholder Interviews?

This will also delete:
  - 2 child tasks (1.2.1, 1.2.2)
  - 3 dependencies

This action cannot be undone."

[Cancel] [Delete]
```

---

### Add Dependency (Detailed Flow)

**User Journey**: User clicks "Add Dependency" → Selects predecessor → Selects type → Sets lag → Submits

**API Call**:
```http
POST /api/artifacts/schedules/tasks/:taskId/dependencies
```

**Backend Operations**:
1. Validate both tasks exist
2. Validate same schedule
3. Prevent self-dependency
4. Check for duplicate
5. Validate no circular dependency (DFS)
6. Create dependency record
7. If successor is AUTO: Trigger auto-schedule

---

### Remove Dependency (Detailed Flow)

**User Journey**: User clicks dependency line → "Delete Dependency" → Confirm

**API Call**:
```http
DELETE /api/artifacts/schedules/dependencies/:dependencyId
```

**Backend Operations**:
1. Find dependency
2. Delete dependency record
3. If successor is AUTO: Re-run auto-schedule (may change dates)

---

## API Endpoints

### Schedule Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| POST | `/api/artifacts/schedules` | Create schedule | Required | CREATE_PROJECT |
| GET | `/api/artifacts/schedules/project/:projectId` | Get all schedules for project | Required | VIEW_PROJECT |
| GET | `/api/artifacts/schedules/:id` | Get schedule by ID | Required | VIEW_PROJECT |
| PUT | `/api/artifacts/schedules/:id` | Update schedule | Required | EDIT_PROJECT |
| PATCH | `/api/artifacts/schedules/:id/archive` | Archive schedule | Required | EDIT_PROJECT |
| DELETE | `/api/artifacts/schedules/:id` | Delete schedule | Required | DELETE_PROJECT |

### Task Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| POST | `/api/artifacts/schedules/:id/tasks` | Create task | Required | CREATE_PROJECT |
| GET | `/api/artifacts/schedules/:id/tasks` | Get all tasks for schedule | Required | VIEW_PROJECT |
| GET | `/api/artifacts/schedules/tasks/:taskId` | Get task by ID | Required | VIEW_PROJECT |
| PUT | `/api/artifacts/schedules/tasks/:taskId` | Update task | Required | EDIT_PROJECT |
| DELETE | `/api/artifacts/schedules/tasks/:taskId` | Delete task | Required | DELETE_PROJECT |

### Dependency Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| POST | `/api/artifacts/schedules/tasks/:taskId/dependencies` | Add dependency | Required | CREATE_PROJECT |
| GET | `/api/artifacts/schedules/tasks/:taskId/dependencies` | Get task dependencies | Required | VIEW_PROJECT |
| DELETE | `/api/artifacts/schedules/dependencies/:dependencyId` | Delete dependency | Required | DELETE_PROJECT |

### Critical Path Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| POST | `/api/artifacts/schedules/:id/calculate-critical-path` | Calculate CPM | Required | EDIT_PROJECT |
| GET | `/api/artifacts/schedules/:id/critical-path-tasks` | Get critical path tasks | Required | VIEW_PROJECT |

### Auto-Schedule Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| POST | `/api/artifacts/schedules/:id/auto-schedule` | Auto-schedule all tasks | Required | EDIT_PROJECT |
| POST | `/api/artifacts/schedules/tasks/:taskId/auto-schedule` | Auto-schedule task + successors | Required | EDIT_PROJECT |

### Calendar Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| POST | `/api/artifacts/schedules/calendars` | Create calendar | Required | CREATE_PROJECT |
| GET | `/api/artifacts/schedules/project/:projectId/calendars` | Get project calendars | Required | VIEW_PROJECT |
| GET | `/api/artifacts/schedules/calendars/:calendarId` | Get calendar by ID | Required | VIEW_PROJECT |
| PUT | `/api/artifacts/schedules/calendars/:calendarId` | Update calendar | Required | EDIT_PROJECT |
| DELETE | `/api/artifacts/schedules/calendars/:calendarId` | Delete calendar | Required | DELETE_PROJECT |
| POST | `/api/artifacts/schedules/calendars/:calendarId/default` | Create default calendar | Required | CREATE_PROJECT |

### Calendar Exception Endpoints

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| POST | `/api/artifacts/schedules/calendars/exceptions` | Add exception | Required | EDIT_PROJECT |
| GET | `/api/artifacts/schedules/calendars/:calendarId/exceptions` | Get calendar exceptions | Required | VIEW_PROJECT |
| PUT | `/api/artifacts/schedules/calendars/exceptions/:exceptionId` | Update exception | Required | EDIT_PROJECT |
| DELETE | `/api/artifacts/schedules/calendars/exceptions/:exceptionId` | Delete exception | Required | DELETE_PROJECT |

---

## Complete User Journeys

### Journey 1: Create a Complete Project Schedule

**Scenario**: Project Manager wants to create a schedule for a new web development project.

**Steps**:

1. **Create Schedule**:
   - Navigate to project page
   - Click "Schedules" tab
   - Click "Create Schedule"
   - Fill in:
     - Name: "Website Redesign Q1 2025"
     - Start Date: Jan 15, 2025
     - End Date: Apr 30, 2025
     - Calendar: Default (Mon-Fri)
   - Submit

2. **Create Phase-Level Tasks** (Level 0):
   - Add Task: "1. Planning Phase"
     - Mode: MANUAL
     - Dates: Jan 15 - Jan 31
   - Add Task: "2. Design Phase"
     - Mode: MANUAL
     - Dates: Feb 1 - Feb 28
   - Add Task: "3. Development Phase"
     - Mode: MANUAL
     - Dates: Mar 1 - Apr 15
   - Add Task: "4. Testing & Launch"
     - Mode: MANUAL
     - Dates: Apr 16 - Apr 30

3. **Add Subtasks** (Level 1) under "1. Planning Phase":
   - Add Subtask: "1.1 Requirements Gathering"
     - Mode: AUTO
     - Duration: 5 days
   - Add Subtask: "1.2 Stakeholder Interviews"
     - Mode: AUTO
     - Duration: 7 days
   - Add Subtask: "1.3 Create Project Plan"
     - Mode: AUTO
     - Duration: 3 days

4. **Add Dependencies**:
   - "1.2 Stakeholder Interviews" depends on "1.1 Requirements Gathering" (FS +0)
   - "1.3 Create Project Plan" depends on "1.2 Stakeholder Interviews" (FS +0)

5. **Auto-Schedule**:
   - Click "Auto-Schedule All"
   - System calculates:
     - 1.1: Jan 15 - Jan 19 (schedule start)
     - 1.2: Jan 19 - Jan 25 (after 1.1 finishes)
     - 1.3: Jan 25 - Jan 27 (after 1.2 finishes)
   - Parent "1. Planning Phase" dates auto-rollup to Jan 15 - Jan 27

6. **Add Milestones**:
   - Add Task: "M1. Planning Complete"
     - Is Milestone: Yes
     - Date: Jan 31
     - Dependency: "1.3 Create Project Plan" (FS +3 to allow buffer)

7. **Calculate Critical Path**:
   - Click "Calculate Critical Path"
   - System identifies: 1.1 → 1.2 → 1.3 → M1 as critical path (all have TF = 0)
   - Tasks highlighted in red on Gantt chart

8. **Assign Resources**:
   - Assign "1.1 Requirements Gathering" to "Alice (BA)"
   - Assign "1.2 Stakeholder Interviews" to "Bob (PM)"
   - Assign "1.3 Create Project Plan" to "Charlie (PM)"

---

### Journey 2: Handle Schedule Delays

**Scenario**: A task is delayed, and the PM needs to see the impact on the project.

**Initial State**:
```
Task A: Design Mockups (AUTO, Feb 1 - Feb 10)
Task B: Client Review (MANUAL, Feb 10 - Feb 12, fixed deadline)
Task C: Implement Design (AUTO, Feb 12 - Feb 25, depends on B FS +0)
```

**Problem**: Task A is delayed by 3 days.

**Steps**:

1. **Update Task A**:
   - User drags Task A on Gantt from Feb 1-10 to Feb 1-13 (3-day delay)
   - System prompts: "Task A has AUTO successors. Auto-schedule them?"
   - User clicks "Yes"

2. **Auto-Schedule Cascade**:
   - System recalculates:
     - Task B: MANUAL mode, remains Feb 10-12 (no change)
     - System detects: Task B now violates dependency (starts before A finishes)
     - System shows warning: "Task B starts before predecessor Task A finishes. Consider adjusting dates."

3. **PM Decision**:
   - Option 1: Change Task B to AUTO mode → System reschedules to Feb 13-15
   - Option 2: Keep Task B MANUAL → Accept the violation, plan to expedite Task A
   - Option 3: Add lead time → Change dependency to FS -3 (allow overlap)

4. **Impact Analysis**:
   - If Task B changes to Feb 13-15:
     - Task C auto-updates to Feb 15-28 (also delayed by 3 days)
     - Project end date extends by 3 days
   - PM can then:
     - Reduce Task C duration (crash the schedule)
     - Add resources to Task C (fast-track)
     - Accept the delay

---

## Business Rules

### BR-01: Schedule Constraints
- **Rule**: Each project can have multiple schedules, but typically one primary schedule
- **Validation**: No validation, informational only
- **Enforcement**: None

### BR-02: WBS Code Uniqueness
- **Rule**: Each WBS code must be unique within a schedule
- **Validation**: Auto-generated codes ensure uniqueness
- **Enforcement**: System-generated, no user override

### BR-03: Task Date Constraints
- **Rule**: End Date must be >= Start Date
- **Validation**: Frontend and backend validation
- **Enforcement**: API returns 400 Bad Request if violated

### BR-04: Parent Task Date Rollup
- **Rule**: Parent task dates are auto-calculated to span all children (min start, max end)
- **Validation**: Automatic on child create/update/delete
- **Enforcement**: System recalculates parent dates automatically

### BR-05: No Circular Hierarchy
- **Rule**: A task cannot be its own ancestor (no circular parent-child relationships)
- **Validation**: Checked when changing parent task
- **Enforcement**: API returns 400 Bad Request if circular hierarchy detected

### BR-06: No Self-Dependency
- **Rule**: A task cannot depend on itself
- **Validation**: Checked when adding dependency
- **Enforcement**: API returns 400 Bad Request

### BR-07: No Duplicate Dependencies
- **Rule**: Only one dependency allowed between any two tasks (same predecessor and successor)
- **Validation**: Checked when adding dependency
- **Enforcement**: API returns 409 Conflict if duplicate exists

### BR-08: No Circular Dependencies
- **Rule**: Dependencies cannot form a cycle (A→B→C→A)
- **Validation**: DFS algorithm checks for cycles when adding dependency
- **Enforcement**: API returns 400 Bad Request if cycle detected

### BR-09: Dependencies Must Be Within Same Schedule
- **Rule**: Predecessor and successor tasks must belong to the same schedule
- **Validation**: Checked when adding dependency
- **Enforcement**: API returns 400 Bad Request

### BR-10: Milestone Duration
- **Rule**: Milestones must have duration = 0
- **Validation**: If is_milestone = true, duration forced to 0
- **Enforcement**: System auto-sets duration to 0

### BR-11: AUTO Mode Date Locking
- **Rule**: Tasks in AUTO mode cannot have dates manually edited
- **Validation**: Frontend disables date fields for AUTO tasks
- **Enforcement**: Backend recalculates dates on update

### BR-12: MANUAL Mode Prevents Auto-Scheduling
- **Rule**: Tasks in MANUAL mode are not auto-scheduled, even if predecessors change
- **Validation**: Auto-schedule algorithm skips MANUAL tasks
- **Enforcement**: System respects user-set dates

### BR-13: Critical Path Tasks
- **Rule**: Tasks with Total Float = 0 are on the critical path
- **Validation**: Auto-calculated by CPM algorithm
- **Enforcement**: System sets is_critical_path flag

### BR-14: Working Days Calculation
- **Rule**: All date calculations respect working calendar (skip weekends, holidays)
- **Validation**: Calendar service checks working days and exceptions
- **Enforcement**: addDays/subtractDays functions use calendar

### BR-15: Parent Task Cannot Have Assignee
- **Rule**: Parent tasks (summary tasks) represent groups of work, not individual work
- **Validation**: If task has children, assignee should be null (optional rule)
- **Enforcement**: Warning in UI, not strictly enforced

---

**End of Schedule Builder Documentation** (54 pages)
