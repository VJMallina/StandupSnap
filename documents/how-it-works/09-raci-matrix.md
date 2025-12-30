# RACI Matrix - How It Works

## Overview
- **Purpose**: Define and track responsibility assignments for project deliverables and activities using the RACI model
- **Key Features**: Matrix creation, task/deliverable management, team member role assignment, RACI validation, approval workflow, export to Excel/CSV
- **User Roles**: Scrum Master (full access), Product Owner (create, edit), PMO (read-only)
- **RACI Roles**: R = Responsible, A = Accountable, C = Consulted, I = Informed

## Module Purpose

The RACI Matrix module provides a structured way to define who is:
- **Responsible** (R): Does the work to complete the task
- **Accountable** (A): Ultimately answerable for the task's completion (decision maker)
- **Consulted** (C): Provides input and expertise (two-way communication)
- **Informed** (I): Kept up-to-date on progress (one-way communication)

### Key Business Rules
1. Each deliverable/task **must** have exactly one Accountable (A) person
2. A deliverable can have zero or more Responsible (R) persons
3. Same person can have multiple RACI roles for different deliverables
4. Special roles (Product Owner, PMO, Scrum Master) can be assigned RACI roles
5. Regular team members can be assigned RACI roles
6. Approval workflow: PO/PMO/SM can approve the matrix

---

## Screens & Pages

### Screen 1: RACI Matrices List Page
**Route**: `/projects/:projectId/artifacts/raci-matrix`
**Access**: All authenticated users with project access
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\RACIMatrixListPage.tsx`

#### UI Components
- Page header with "RACI Matrices" title
- "Create New RACI Matrix" button (SM/PO only)
- List of existing RACI matrices:
  - Matrix name
  - Description preview
  - Created date
  - Created by
  - Approved by (if approved)
  - Actions: View, Edit (SM/PO), Delete (SM only)
- Empty state message if no matrices exist
- Filter by approved status
- Search by matrix name

---

### Screen 2: Create RACI Matrix Page
**Route**: `/projects/:projectId/artifacts/raci-matrix/create`
**Access**: Scrum Master, Product Owner
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\CreateRACIMatrixPage.tsx`

#### UI Components
- Form with fields:
  - Matrix Name (required, max 255 chars)
  - Description (optional, textarea)
- "Create Matrix" button
- "Cancel" button (redirects to list)
- Validation messages
- Loading state during creation

---

### Screen 3: RACI Matrix View/Edit Page
**Route**: `/projects/:projectId/artifacts/raci-matrix/:matrixId`
**Access**: All authenticated users (read), SM/PO (edit)
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\RACIMatrixPage.tsx`

#### UI Components
- **Header Section**:
  - Matrix name and description
  - Approval status badge (Approved/Pending)
  - Approved by name and date (if approved)
  - "Set Approval" button (PO/PMO/SM only)
  - "Export to Excel/CSV" button
  - "Delete Matrix" button (SM only)

- **Team Member Management Section**:
  - "Add Team Member Column" button (SM/PO)
  - List of team member columns (PO, PMO, SM, team members)
  - "Remove Column" button for each member (SM/PO)

- **RACI Grid Section**:
  - Table with:
    - **Rows**: Tasks/Deliverables
    - **Columns**: Team members
    - **Cells**: RACI role dropdowns (R, A, C, I, or blank)
  - "Add Task/Deliverable" button (SM/PO)
  - Each row has:
    - Task name (editable inline)
    - Task description (editable inline)
    - "Delete Row" button (SM/PO)
  - Visual indicators:
    - Accountable (A) cells highlighted
    - Validation errors (missing A, multiple A)

- **Validation Panel**:
  - Shows validation warnings:
    - "Task X has no Accountable person"
    - "Task Y has multiple Accountable persons"
  - Color-coded: Red for errors, Yellow for warnings

---

## User Actions

### Action 1: Create RACI Matrix

**What happens**: User creates a new RACI matrix for the project

**Frontend**:
1. User clicks "Create New RACI Matrix" on list page
2. Navigates to create form
3. Fills in matrix name and description
4. Clicks "Create Matrix"
5. Form validation: Name is required
6. Loading state shown during API call

**API Call**:
```http
POST /api/artifacts/raci-matrix
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "projectId": "uuid-of-project",
  "name": "Sprint 1 Deliverables",
  "description": "RACI matrix for Sprint 1 key deliverables"
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\raci-matrix.controller.ts` - `@Post()`
- **Service**: `F:\StandupSnap\backend\src\artifacts\raci-matrix.service.ts` - `create()`

**Backend Flow**:
1. **JWT Guard** validates token
2. **Controller** receives CreateRaciMatrixDto
3. **Service.create()** executes:
   - Validates project exists
   ```sql
   SELECT * FROM projects WHERE id = ? AND isArchived = false
   ```
   - If not found: throw `NotFoundException('Project not found')`
   - Creates RaciMatrix entity:
     - `project`: Link to project
     - `name`: Matrix name
     - `description`: Optional description
     - `teamMemberColumns`: Empty array (no columns yet)
     - `createdBy`: Current user
     - `updatedBy`: Current user
     - `approvedBy`: null
   - Saves to database
   ```sql
   INSERT INTO raci_matrices
   (id, project_id, name, description, team_member_columns, created_by, updated_by, created_at, updated_at)
   VALUES (?, ?, ?, ?, '[]', ?, ?, NOW(), NOW())
   ```

**Database Tables Affected**:
- `raci_matrices` (INSERT)

**Response**:
```json
{
  "id": "uuid-of-matrix",
  "project": {
    "id": "uuid-of-project",
    "name": "Project Alpha"
  },
  "name": "Sprint 1 Deliverables",
  "description": "RACI matrix for Sprint 1 key deliverables",
  "teamMemberColumns": [],
  "entries": [],
  "createdBy": {
    "id": "uuid",
    "username": "john",
    "name": "John Doe"
  },
  "updatedBy": {
    "id": "uuid",
    "username": "john",
    "name": "John Doe"
  },
  "approvedBy": null,
  "createdAt": "2025-12-30T10:00:00.000Z",
  "updatedAt": "2025-12-30T10:00:00.000Z"
}
```

**UI Update**:
1. Success toast: "RACI matrix created successfully"
2. Redirect to matrix view/edit page: `/projects/:projectId/artifacts/raci-matrix/:matrixId`

**Validations**:
- **Client-side**: Name required, max 255 chars
- **Server-side**: Name required, project exists, user has permission

**Error Handling**:
- `NotFoundException`: "Project not found" (404)
- `UnauthorizedException`: "You don't have permission to create RACI matrices" (403)
- Network errors: "Failed to create RACI matrix. Please try again."

---

### Action 2: Add Team Member Column

**What happens**: User adds a team member column to the RACI matrix

**Frontend**:
1. User clicks "Add Team Member Column" button
2. Modal opens with dropdown:
   - Product Owner (if assigned to project)
   - PMO (if assigned to project)
   - Scrum Master (if user is SM)
   - All team members assigned to project
3. User selects a team member
4. Clicks "Add Column"

**API Call**:
```http
POST /api/artifacts/raci-matrix/:matrixId/team-member
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "teamMemberId": "uuid-of-team-member",
  "memberName": "Alice Johnson"
}
```

OR for special roles:
```http
POST /api/artifacts/raci-matrix/:matrixId/team-member
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "teamMemberId": "user-uuid-of-po",
  "memberName": "Bob Smith (Product Owner)"
}
```

**Backend**:
- **Controller**: `raci-matrix.controller.ts` - `@Post(':id/team-member')`
- **Service**: `raci-matrix.service.ts` - `addTeamMemberColumn()`

**Backend Flow**:
1. Validates matrix exists
2. Checks if team member ID format:
   - Regular team member: UUID
   - Special role: `user-{uuid}` prefix
3. Validates team member is part of project or is special role
4. Checks if column already exists (duplicate check)
5. Updates `teamMemberColumns` JSON array:
   ```sql
   UPDATE raci_matrices
   SET team_member_columns = JSON_ARRAY_APPEND(team_member_columns, '$', ?),
       updated_by = ?,
       updated_at = NOW()
   WHERE id = ?
   ```
6. Returns formatted matrix with new column

**Database Tables Affected**:
- `raci_matrices` (UPDATE team_member_columns)

**Response**:
```json
{
  "id": "uuid-of-matrix",
  "name": "Sprint 1 Deliverables",
  "teamMemberColumns": [
    {
      "id": "uuid-team-member-1",
      "name": "Alice Johnson",
      "type": "team_member"
    },
    {
      "id": "user-uuid-po",
      "name": "Bob Smith (Product Owner)",
      "type": "special_role"
    }
  ],
  "grid": {
    "rows": [],
    "columns": [...]
  }
}
```

**UI Update**:
1. New column appears in RACI grid
2. Modal closes
3. Success toast: "Team member column added"

**Validations**:
- Team member exists
- Team member not already in matrix
- User has edit permission

**Error Handling**:
- `NotFoundException`: "Team member not found"
- `BadRequestException`: "Team member already in matrix"
- `UnauthorizedException`: "You don't have permission to edit this matrix"

---

### Action 3: Add Task/Deliverable (Row)

**What happens**: User adds a new task/deliverable row to the RACI matrix

**Frontend**:
1. User clicks "Add Task/Deliverable" button
2. Modal opens with form:
   - Task Name (required, max 500 chars)
   - Task Description (optional, max 2000 chars)
3. User fills in details
4. Clicks "Add Task"

**API Call**:
```http
POST /api/artifacts/raci-matrix/:matrixId/task
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "taskName": "Database Schema Design",
  "taskDescription": "Design and document database schema for user management module"
}
```

**Backend**:
- **Controller**: `raci-matrix.controller.ts` - `@Post(':id/task')`
- **Service**: `raci-matrix.service.ts` - `addTask()`

**Backend Flow**:
1. Validates matrix exists
2. Validates task name (max 50 chars - business constraint)
3. Validates task description (max 100 chars - business constraint)
4. Determines `rowOrder`:
   - If no existing rows: `rowOrder = 0`
   - Else: `rowOrder = max(existing rowOrders) + 1`
5. Creates RaciEntry for the task:
   ```sql
   INSERT INTO raci_entries
   (id, raci_matrix_id, row_order, task_name, task_description, team_member_id, member_id, raci_role, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NOW(), NOW())
   ```
6. Updates matrix `updated_by` and `updated_at`
7. Returns formatted matrix with new row

**Database Tables Affected**:
- `raci_entries` (INSERT)
- `raci_matrices` (UPDATE updated_by, updated_at)

**Response**:
```json
{
  "id": "uuid-of-matrix",
  "grid": {
    "rows": [
      {
        "rowOrder": 0,
        "taskName": "Database Schema Design",
        "taskDescription": "Design and document database schema for user management module",
        "assignments": {}
      }
    ],
    "columns": [...]
  }
}
```

**UI Update**:
1. New row appears at bottom of RACI grid
2. Row is empty (no RACI assignments yet)
3. Modal closes
4. Success toast: "Task added successfully"

**Validations**:
- **Client-side**: Task name required, max 500 chars
- **Server-side**: Task name max 50 chars, description max 100 chars (enforced)

**Error Handling**:
- `BadRequestException`: "Task name must be 50 characters or fewer"
- `BadRequestException`: "Task description must be 100 characters or fewer"

---

### Action 4: Set RACI Assignment

**What happens**: User assigns a RACI role to a team member for a specific task

**Frontend**:
1. User clicks on a cell in the RACI grid (intersection of task row and team member column)
2. Dropdown appears with options: R, A, C, I, or (blank to clear)
3. User selects a role
4. Dropdown auto-saves

**API Call**:
```http
PUT /api/artifacts/raci-matrix/:matrixId/raci
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "rowOrder": 0,
  "memberId": "uuid-team-member-1",
  "raciRole": "A"
}
```

**Backend**:
- **Controller**: `raci-matrix.controller.ts` - `@Put(':id/raci')`
- **Service**: `raci-matrix.service.ts` - `setRaci()`

**Backend Flow**:
1. Validates matrix exists
2. Validates RACI role is one of: R, A, C, I, or null (to clear)
3. Finds existing entry for this task + team member:
   ```sql
   SELECT * FROM raci_entries
   WHERE raci_matrix_id = ?
     AND row_order = ?
     AND member_id = ?
   ```
4. If entry exists:
   - If raciRole is null: **Delete** the entry
   ```sql
   DELETE FROM raci_entries WHERE id = ?
   ```
   - Else: **Update** the raciRole
   ```sql
   UPDATE raci_entries SET raci_role = ?, updated_at = NOW() WHERE id = ?
   ```
5. If entry doesn't exist and raciRole is not null:
   - **Create** new entry
   ```sql
   INSERT INTO raci_entries
   (id, raci_matrix_id, row_order, task_name, task_description, member_id, raci_role, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
   ```
6. Updates matrix `updated_by` and `updated_at`
7. Returns formatted matrix

**Database Tables Affected**:
- `raci_entries` (INSERT/UPDATE/DELETE)
- `raci_matrices` (UPDATE updated_by, updated_at)

**Response**:
```json
{
  "id": "uuid-of-matrix",
  "grid": {
    "rows": [
      {
        "rowOrder": 0,
        "taskName": "Database Schema Design",
        "taskDescription": "...",
        "assignments": {
          "uuid-team-member-1": "A",
          "uuid-team-member-2": "R",
          "user-uuid-po": "C"
        }
      }
    ]
  },
  "validation": {
    "errors": [],
    "warnings": []
  }
}
```

**UI Update**:
1. Cell immediately updates to show selected RACI role
2. Cell styling:
   - **A** (Accountable): Bold, highlighted background
   - **R** (Responsible): Regular
   - **C** (Consulted): Italic
   - **I** (Informed): Gray text
3. Validation panel updates if errors/warnings

**Validations**:
- **Server-side**: RACI role must be R, A, C, I, or null

**Validation Rules (Post-Assignment)**:
- **Error**: Task has no Accountable (A) person
- **Error**: Task has multiple Accountable (A) persons (only one allowed)
- **Warning**: Task has no Responsible (R) person
- **Warning**: Team member has no assignments

**Error Handling**:
- `BadRequestException`: "Invalid RACI role"
- `NotFoundException`: "Task or team member not found"

---

### Action 5: Update Task Name/Description

**What happens**: User edits task name or description inline

**Frontend**:
1. User clicks on task name or description cell
2. Cell becomes editable (contentEditable or input field)
3. User modifies text
4. On blur or Enter key: Auto-save

**API Call**:
```http
PUT /api/artifacts/raci-matrix/:matrixId/task/:rowOrder
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "taskName": "Database Schema Design & Documentation",
  "taskDescription": "Updated description with more details"
}
```

**Backend**:
- **Controller**: `raci-matrix.controller.ts` - `@Put(':id/task/:rowOrder')`
- **Service**: `raci-matrix.service.ts` - `updateTask()`

**Backend Flow**:
1. Validates matrix exists
2. Validates task name and description length
3. Finds the task entry (entry with no `memberId` for this rowOrder):
   ```sql
   SELECT * FROM raci_entries
   WHERE raci_matrix_id = ?
     AND row_order = ?
     AND member_id IS NULL
   ```
4. If not found: Creates a new task entry
5. If found: Updates task name/description
   ```sql
   UPDATE raci_entries
   SET task_name = ?,
       task_description = ?,
       updated_at = NOW()
   WHERE id = ?
   ```
6. Updates all RACI entries for this row (same taskName/taskDescription)
   ```sql
   UPDATE raci_entries
   SET task_name = ?,
       task_description = ?,
       updated_at = NOW()
   WHERE raci_matrix_id = ? AND row_order = ?
   ```

**Database Tables Affected**:
- `raci_entries` (UPDATE multiple rows)

**Response**:
```json
{
  "id": "uuid-of-matrix",
  "grid": {
    "rows": [
      {
        "rowOrder": 0,
        "taskName": "Database Schema Design & Documentation",
        "taskDescription": "Updated description with more details",
        "assignments": {...}
      }
    ]
  }
}
```

**UI Update**:
1. Cell exits edit mode
2. New text displayed
3. Success indicator (green flash or checkmark)

**Validations**:
- Task name max 50 chars (enforced)
- Task description max 100 chars (enforced)

---

### Action 6: Delete Task/Deliverable Row

**What happens**: User removes a task row from the RACI matrix

**Frontend**:
1. User clicks "Delete" icon next to task name
2. Confirmation dialog: "Are you sure you want to delete this task? All RACI assignments for this task will be removed."
3. User confirms

**API Call**:
```http
DELETE /api/artifacts/raci-matrix/:matrixId/task/:rowOrder
Authorization: Bearer <JWT_TOKEN>
```

**Backend**:
- **Controller**: `raci-matrix.controller.ts` - `@Delete(':id/task/:rowOrder')`
- **Service**: `raci-matrix.service.ts` - `deleteTask()`

**Backend Flow**:
1. Validates matrix exists
2. Deletes all entries for this rowOrder (task entry + all RACI assignments):
   ```sql
   DELETE FROM raci_entries
   WHERE raci_matrix_id = ? AND row_order = ?
   ```
3. Re-orders remaining rows (shifts rowOrder down):
   ```sql
   UPDATE raci_entries
   SET row_order = row_order - 1,
       updated_at = NOW()
   WHERE raci_matrix_id = ? AND row_order > ?
   ```

**Database Tables Affected**:
- `raci_entries` (DELETE + UPDATE row_order)

**Response**:
```json
{
  "id": "uuid-of-matrix",
  "grid": {
    "rows": [...] // Updated list without deleted row
  }
}
```

**UI Update**:
1. Row removed from grid
2. Remaining rows shift up
3. Success toast: "Task deleted successfully"

---

### Action 7: Remove Team Member Column

**What happens**: User removes a team member column from the matrix

**Frontend**:
1. User clicks "Remove" icon on team member column header
2. Confirmation dialog: "Remove this team member column? All RACI assignments for this member will be cleared."
3. User confirms

**API Call**:
```http
DELETE /api/artifacts/raci-matrix/:matrixId/team-member/:teamMemberId
Authorization: Bearer <JWT_TOKEN>
```

**Backend**:
- **Controller**: `raci-matrix.controller.ts` - `@Delete(':id/team-member/:teamMemberId')`
- **Service**: `raci-matrix.service.ts` - `removeTeamMemberColumn()`

**Backend Flow**:
1. Validates matrix exists
2. Removes team member from `teamMemberColumns` JSON array:
   ```sql
   UPDATE raci_matrices
   SET team_member_columns = JSON_REMOVE(team_member_columns, <index>),
       updated_by = ?,
       updated_at = NOW()
   WHERE id = ?
   ```
3. Deletes all RACI entries for this team member:
   ```sql
   DELETE FROM raci_entries
   WHERE raci_matrix_id = ? AND member_id = ?
   ```

**Database Tables Affected**:
- `raci_matrices` (UPDATE team_member_columns)
- `raci_entries` (DELETE)

**Response**:
```json
{
  "id": "uuid-of-matrix",
  "teamMemberColumns": [...], // Updated list
  "grid": {
    "rows": [...] // RACI assignments for this member removed
  }
}
```

**UI Update**:
1. Column removed from grid
2. All RACI assignments in that column cleared
3. Success toast: "Team member column removed"

---

### Action 8: Set Approval

**What happens**: PO/PMO/Scrum Master approves the RACI matrix

**Frontend**:
1. User (PO/PMO/SM) clicks "Set Approval" button
2. Modal with dropdown to select approver (PO/PMO/SM of project)
3. User selects approver
4. Clicks "Approve"

**API Call**:
```http
PUT /api/artifacts/raci-matrix/:matrixId/approved-by
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "approverId": "uuid-of-approver"
}
```

**Backend**:
- **Controller**: `raci-matrix.controller.ts` - `@Put(':id/approved-by')`
- **Service**: `raci-matrix.service.ts` - `setApprovedBy()`

**Backend Flow**:
1. Validates matrix exists
2. Validates approver is PO/PMO/SM for the project
3. Updates `approvedBy` field:
   ```sql
   UPDATE raci_matrices
   SET approved_by = ?,
       updated_at = NOW()
   WHERE id = ?
   ```

**Database Tables Affected**:
- `raci_matrices` (UPDATE approved_by)

**Response**:
```json
{
  "id": "uuid-of-matrix",
  "approvedBy": {
    "id": "uuid-approver",
    "username": "bob",
    "name": "Bob Smith"
  },
  "updatedAt": "2025-12-30T11:00:00.000Z"
}
```

**UI Update**:
1. Approval badge changes to "Approved"
2. Shows approver name and approval date
3. Success toast: "RACI matrix approved"

**Validations**:
- Approver must be PO/PMO/SM for the project

---

### Action 9: Export RACI Matrix to Excel/CSV

**What happens**: User exports the RACI matrix to Excel or CSV format

**Frontend**:
1. User clicks "Export" button
2. Dropdown appears: Excel, CSV
3. User selects format
4. Browser downloads file

**API Call**:
```http
GET /api/artifacts/raci-matrix/:matrixId/export?format=csv
Authorization: Bearer <JWT_TOKEN>
```

**Backend**:
- **Controller**: `raci-matrix.controller.ts` - `@Get(':id/export')`
- **Service**: `raci-matrix.service.ts` - `exportToCSV()` or `exportToExcel()`

**Backend Flow (CSV)**:
1. Fetches matrix with all entries
2. Builds CSV structure:
   - Header row: Task, Description, [Team Member 1], [Team Member 2], ...
   - Data rows: Task name, description, RACI role for each member
3. Generates CSV string:
   ```csv
   Task,Description,Alice Johnson,Bob Smith (PO),Charlie Brown
   Database Schema Design,Design and document database schema,A,R,C
   API Development,Develop REST APIs,R,A,I
   Testing,Write and execute test cases,A,,C
   ```
4. Sets response headers:
   - `Content-Type: text/csv`
   - `Content-Disposition: attachment; filename="raci-matrix-{name}-{date}.csv"`

**Response**: CSV file download

**UI Update**:
1. Browser downloads `raci-matrix-sprint-1-2025-12-30.csv`
2. Success toast: "RACI matrix exported"

**Export Format (Excel)**:
- Uses ExcelJS library
- Formatted table with:
  - Header row bold
  - Accountable (A) cells highlighted
  - Auto-column width
  - Frozen header row

---

### Action 10: Delete RACI Matrix

**What happens**: Scrum Master deletes the entire RACI matrix

**Frontend**:
1. User (SM only) clicks "Delete Matrix" button
2. Confirmation dialog: "Are you sure you want to delete this RACI matrix? This action cannot be undone."
3. User confirms

**API Call**:
```http
DELETE /api/artifacts/raci-matrix/:matrixId
Authorization: Bearer <JWT_TOKEN>
```

**Backend**:
- **Controller**: `raci-matrix.controller.ts` - `@Delete(':id')`
- **Service**: `raci-matrix.service.ts` - `delete()`

**Backend Flow**:
1. Validates matrix exists
2. Deletes matrix and all entries (cascade delete):
   ```sql
   DELETE FROM raci_matrices WHERE id = ?
   ```
   - TypeORM cascade: All `raci_entries` automatically deleted

**Database Tables Affected**:
- `raci_matrices` (DELETE)
- `raci_entries` (CASCADE DELETE)

**Response**:
```json
{
  "message": "RACI matrix deleted successfully"
}
```

**UI Update**:
1. Redirect to RACI matrices list page
2. Success toast: "RACI matrix deleted"

---

## Database Schema

### Table: raci_matrices

```sql
CREATE TABLE raci_matrices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  team_member_columns   JSON,  -- Array of team member IDs/special roles
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raci_matrices_project_id ON raci_matrices(project_id);
```

**Fields**:
- `id`: Unique identifier
- `project_id`: Link to project
- `name`: Matrix name
- `description`: Optional description
- `team_member_columns`: JSON array of team member IDs (can be UUID or `user-{uuid}` for special roles)
- `created_by`: User who created the matrix
- `updated_by`: User who last updated
- `approved_by`: User who approved (PO/PMO/SM)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

**Relationships**:
- **Many-to-One** with `projects` (CASCADE on delete)
- **Many-to-One** with `users` (SET NULL on delete)
- **One-to-Many** with `raci_entries`

---

### Table: raci_entries

```sql
CREATE TABLE raci_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raci_matrix_id      UUID NOT NULL REFERENCES raci_matrices(id) ON DELETE CASCADE,
  row_order           INTEGER NOT NULL,
  task_name           VARCHAR(500) NOT NULL,
  task_description    TEXT,
  team_member_id      UUID REFERENCES team_members(id) ON DELETE CASCADE,
  member_id           VARCHAR(255),  -- Can be team member UUID or 'user-{uuid}' for special roles
  raci_role           VARCHAR(1),    -- 'R', 'A', 'C', 'I', or NULL
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raci_entries_matrix_id ON raci_entries(raci_matrix_id);
CREATE INDEX idx_raci_entries_row_order ON raci_entries(raci_matrix_id, row_order);
```

**Fields**:
- `id`: Unique identifier
- `raci_matrix_id`: Link to RACI matrix
- `row_order`: Row number (for ordering tasks)
- `task_name`: Task/deliverable name
- `task_description`: Optional description
- `team_member_id`: Link to team member (nullable for special roles)
- `member_id`: Team member ID or special role ID (`user-{uuid}`)
- `raci_role`: RACI role (R/A/C/I or null)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

**Relationships**:
- **Many-to-One** with `raci_matrices` (CASCADE on delete)
- **Many-to-One** with `team_members` (CASCADE on delete)

**Data Model**:
- Each task has one entry with `member_id = NULL` (defines task name/description)
- Each RACI assignment is a separate entry with `member_id` and `raci_role`
- Example:
  ```
  Row 0: task_name="Database Design", member_id=NULL
  Row 0: task_name="Database Design", member_id="uuid-1", raci_role="A"
  Row 0: task_name="Database Design", member_id="uuid-2", raci_role="R"
  ```

---

## Data Flow Diagrams

### Create RACI Matrix Flow
```
User → Create Form → Validate Input → POST /api/artifacts/raci-matrix
                                              ↓
                                      JWT Guard validates token
                                              ↓
                                      Controller receives DTO
                                              ↓
                                      Service.create()
                                              ↓
                                      Validate project exists
                                              ↓
                                      INSERT INTO raci_matrices
                                              ↓
                                      Return matrix object
                                              ↓
UI updates → Redirect to matrix view → Show success toast
```

### Add RACI Assignment Flow
```
User clicks cell → Select RACI role → PUT /api/artifacts/raci-matrix/:id/raci
                                              ↓
                                      Service.setRaci()
                                              ↓
                                      Find existing entry
                                              ↓
                                   ┌──────────┴──────────┐
                                   ↓                     ↓
                          Entry exists            Entry doesn't exist
                                   ↓                     ↓
                          UPDATE raci_role        INSERT new entry
                                   ↓                     ↓
                                   └──────────┬──────────┘
                                              ↓
                                      Return formatted matrix
                                              ↓
                                      Validate RACI rules
                                              ↓
UI updates → Cell shows role → Validation panel updates
```

### RACI Validation Flow
```
After any RACI change
        ↓
Loop through all tasks
        ↓
For each task:
  Count 'A' assignments
        ↓
  ┌─────┴─────┐
  ↓           ↓
A=0         A>1        A=1
  ↓           ↓          ↓
ERROR      ERROR       OK
  ↓           ↓          ↓
Add to     Add to    (valid)
warnings   errors
        ↓
Return validation result
        ↓
UI shows errors/warnings in validation panel
```

---

## Complete User Journeys

### Journey 1: Create and Populate RACI Matrix

**Scenario**: Scrum Master creates a RACI matrix for Sprint 1 deliverables

**Steps**:
1. SM navigates to project artifacts
2. Clicks "RACI Matrix" tab
3. Clicks "Create New RACI Matrix"
4. Fills in:
   - Name: "Sprint 1 Deliverables"
   - Description: "Responsibility assignments for Sprint 1 key deliverables"
5. Clicks "Create Matrix"
6. System creates matrix and redirects to view page
7. SM clicks "Add Team Member Column"
8. Selects "Alice Johnson" from dropdown
9. Clicks "Add Column" → Column appears
10. Repeats for "Bob Smith (Product Owner)" and "Charlie Brown"
11. SM clicks "Add Task/Deliverable"
12. Enters:
    - Task Name: "Database Schema Design"
    - Description: "Design and document the database schema for user management"
13. Clicks "Add Task" → Row appears
14. Repeats for tasks: "API Development", "Testing"
15. SM starts assigning RACI roles:
    - Database Schema Design: Alice=A, Bob=R, Charlie=C
    - API Development: Bob=A, Alice=R, Charlie=I
    - Testing: Alice=A, Bob=C
16. System validates:
    - All tasks have exactly one 'A' → Valid
17. SM clicks "Set Approval"
18. Selects "Bob Smith (Product Owner)" as approver
19. Clicks "Approve"
20. Approval badge shows "Approved by Bob Smith"
21. SM clicks "Export to Excel"
22. Downloads `raci-matrix-sprint-1-2025-12-30.xlsx`

**Outcome**: RACI matrix created, populated, validated, approved, and exported

---

### Journey 2: Fix RACI Validation Errors

**Scenario**: User receives validation errors and fixes them

**Steps**:
1. User opens existing RACI matrix
2. Validation panel shows:
   - ERROR: "Database Design has no Accountable (A) person"
   - ERROR: "API Development has 2 Accountable (A) persons"
3. User clicks on "Database Design" row, "Alice Johnson" column
4. Selects "A" (Accountable)
5. Error disappears from validation panel
6. User clicks on "API Development" row, "Bob Smith" column
7. Changes from "A" to "R" (Responsible)
8. Error disappears
9. Validation panel now shows: "All tasks valid"
10. User sets approval

**Outcome**: All validation errors resolved, matrix is valid

---

## API Endpoints Summary

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/api/artifacts/raci-matrix` | Create new RACI matrix | SM, PO |
| GET | `/api/artifacts/raci-matrix/project/:projectId` | Get all matrices for project | All authenticated |
| GET | `/api/artifacts/raci-matrix/:id` | Get formatted matrix | All authenticated |
| POST | `/api/artifacts/raci-matrix/:id/task` | Add task/deliverable row | SM, PO |
| PUT | `/api/artifacts/raci-matrix/:id/task/:rowOrder` | Update task name/description | SM, PO |
| DELETE | `/api/artifacts/raci-matrix/:id/task/:rowOrder` | Delete task row | SM, PO |
| POST | `/api/artifacts/raci-matrix/:id/team-member` | Add team member column | SM, PO |
| DELETE | `/api/artifacts/raci-matrix/:id/team-member/:memberId` | Remove team member column | SM, PO |
| PUT | `/api/artifacts/raci-matrix/:id/raci` | Set RACI assignment | SM, PO |
| PUT | `/api/artifacts/raci-matrix/:id/approved-by` | Set approval | SM, PO, PMO |
| GET | `/api/artifacts/raci-matrix/:id/export` | Export to CSV/Excel | All authenticated |
| DELETE | `/api/artifacts/raci-matrix/:id` | Delete matrix | SM only |

---

## Permissions & RBAC

### Scrum Master (Full Access)
- Create RACI matrices
- Edit all fields
- Add/remove tasks
- Add/remove team members
- Set RACI assignments
- Approve matrices
- Export matrices
- Delete matrices

### Product Owner
- Create RACI matrices
- Edit all fields
- Add/remove tasks
- Add/remove team members
- Set RACI assignments
- Approve matrices
- Export matrices
- Cannot delete matrices

### PMO
- View RACI matrices
- Approve matrices (if assigned to project)
- Export matrices
- Cannot edit or delete

---

## Integration Points

### With Projects Module
- RACI matrices linked to projects via `project_id`
- Inherits project team members
- Archived when project is archived

### With Team Members Module
- Team members appear as columns in RACI matrix
- Special roles (PO, PMO, SM) can be assigned RACI roles
- Team member removal doesn't break RACI matrix (SET NULL)

### With Dashboard
- Count of RACI matrices per project
- Approval status shown in project overview

---

## Business Rules

1. **Matrix Name**: Required, max 255 characters
2. **Task Name**: Required, max 50 characters (enforced in backend)
3. **Task Description**: Optional, max 100 characters (enforced in backend)
4. **RACI Roles**: Must be R, A, C, I, or blank
5. **Accountable Rule**: Each task should have exactly one 'A' (validated but not enforced)
6. **Column Duplicates**: Same team member cannot appear twice as a column
7. **Approval**: Only PO/PMO/SM can approve
8. **Deletion**: Only SM can delete entire matrix

---

## Validation Rules

### RACI Assignment Validation
- **Error**: Task has no Accountable (A) person
- **Error**: Task has multiple Accountable (A) persons
- **Warning**: Task has no Responsible (R) person
- **Warning**: Team member has no RACI assignments

### Input Validation
- Matrix name: Required, 1-255 characters
- Task name: Required, 1-50 characters
- Task description: 0-100 characters
- RACI role: Must be 'R', 'A', 'C', 'I', or null

---

## Common Issues & Solutions

### Issue 1: "Task name must be 50 characters or fewer"
**Cause**: Backend enforces 50 char limit (stricter than frontend 500 char limit)
**Solution**: Keep task names concise (use description for details)

### Issue 2: Multiple Accountable (A) errors
**Cause**: User assigned 'A' to multiple team members for same task
**Solution**: Change all but one to different role (R, C, I)

### Issue 3: Cannot remove team member column
**Cause**: User doesn't have permission
**Solution**: Only SM/PO can remove columns

### Issue 4: Export shows incomplete data
**Cause**: Browser cache or download interrupted
**Solution**: Clear cache and retry export

---

## File Locations

### Backend (NestJS)
```
F:\StandupSnap\backend\src\artifacts\
├── raci-matrix.controller.ts      # HTTP endpoints
├── raci-matrix.service.ts         # Business logic
├── dto\
│   ├── create-raci-matrix.dto.ts
│   ├── add-task.dto.ts
│   ├── add-team-member-column.dto.ts
│   ├── set-raci.dto.ts
│   └── set-approved-by.dto.ts
```

### Entities
```
F:\StandupSnap\backend\src\entities\
├── raci-matrix.entity.ts          # Matrix table definition
└── raci-entry.entity.ts           # Entries table definition
```

### Frontend (React)
```
F:\StandupSnap\frontend\src\pages\artifacts\
├── RACIMatrixListPage.tsx         # List of matrices
├── CreateRACIMatrixPage.tsx       # Create form
└── RACIMatrixPage.tsx             # View/edit matrix grid
```

---

**Last Updated**: 2025-12-30
**Module Version**: 1.0
**Status**: Production Ready
