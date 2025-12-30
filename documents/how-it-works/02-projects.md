# Projects - How It Works

## Overview
- **Purpose**: Core project lifecycle management and team composition
- **Key Features**: Create/edit/archive projects, assign Product Owner and PMO, manage project dates, team assignment
- **User Roles**: Scrum Master (full access), Product Owner (view/edit), PMO (view only)

## Screens & Pages

### Screen 1: Projects List Page
**Route**: `/projects`
**Access**: All authenticated users with `VIEW_PROJECT` permission
**Component**: `F:\StandupSnap\frontend\src\pages\projects\ProjectsListPage.tsx`

#### UI Components
- Project cards grid/list view
- "Create Project" button (SM only)
- Filter dropdown: Active/Archived/All
- Search bar (by project name)
- Each project card shows:
  - Project name
  - Description
  - Start and end dates
  - Product Owner avatar/name
  - PMO avatar/name
  - Status badge (Active/Archived)
  - Action menu (View Details, Edit, Archive)

#### User Actions

##### Action 1: View All Projects

**What happens**: Load all projects user has access to

**Frontend**:
1. On page load, fetch projects from API
2. Default filter: Active projects only
3. Display in card/list layout

**API Call**:
```http
GET /api/projects?isActive=true&isArchived=false
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\project\project.controller.ts` - `@Get()`
- **Service**: `ProjectService.findAll(isActive, isArchived)`

**Backend Flow**:
1. Build WHERE clause based on query params
2. Query `projects` table with filters
3. Eager load relations: `members`, `members.user`, `sprints`, `productOwner`, `pmo`, `teamMembers`
4. Order by `createdAt DESC` (newest first)
5. Return project array

**Database**:
```sql
SELECT p.*, po.*, pmo.*
FROM projects p
LEFT JOIN users po ON p.product_owner_id = po.id
LEFT JOIN users pmo ON p.pmo_id = pmo.id
WHERE p.is_active = true AND p.is_archived = false
ORDER BY p.created_at DESC
```

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "E-Commerce Platform",
    "description": "Build customer-facing e-commerce solution",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "isActive": true,
    "isArchived": false,
    "productOwner": { "id": "uuid", "name": "Jane Doe", "email": "jane@example.com" },
    "pmo": { "id": "uuid", "name": "Bob Smith", "email": "bob@example.com" },
    "members": [...],
    "sprints": [...],
    "teamMembers": [...]
  }
]
```

**UI Update**: Render project cards with all details

---

##### Action 2: Click "Create Project" Button

**What happens**: Navigate to project creation form

**Frontend**:
- Only visible if user has `CREATE_PROJECT` permission (SM only)
- Navigates to `/projects/create`

---

##### Action 3: Filter Projects

**What happens**: Update list based on status filter

**Frontend**:
1. User selects "Active", "Archived", or "All" from dropdown
2. Update query params and refetch

**API Call**:
```http
GET /api/projects?isActive=false&isArchived=true
```

**Backend**: Same as Action 1, different WHERE clause

**UI Update**: Display filtered results

---

##### Action 4: Search Projects

**What happens**: Client-side filtering (or API search if implemented)

**Frontend**:
- Filter projects array by name/description matching search term
- Case-insensitive search

**UI Update**: Show matching projects only

---

### Screen 2: Create Project Page
**Route**: `/projects/create`
**Access**: Scrum Master only (`CREATE_PROJECT` permission)
**Component**: `F:\StandupSnap\frontend\src\pages\projects\CreateProjectPage.tsx`

#### UI Components
- Project name input (with uniqueness validation)
- Description textarea
- Start date picker
- End date picker
- Product Owner selector (dropdown or invite option)
- PMO selector (dropdown or invite option)
- "Invite via Email" toggles for PO/PMO
- Email inputs (if inviting)
- "Create Project" button
- "Cancel" button

#### User Actions

##### Action 1: Enter Project Name (with Real-Time Validation)

**What happens**: Check if project name is unique

**Frontend**:
1. User types project name
2. Debounced API call after 500ms of no typing
3. Show loading spinner next to input
4. Display validation message (green checkmark or red error)

**API Call**:
```http
GET /api/projects/check-name?name=E-Commerce%20Platform
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `ProjectController.checkNameUniqueness()`
- **Service**: `ProjectService.isNameUnique(name, excludeId?)`

**Backend Flow**:
1. Query `projects` table for matching name (case-insensitive)
2. If `excludeId` provided, exclude that project (for edit mode)
3. Return `{ isUnique: boolean }`

**Database**:
```sql
SELECT COUNT(*) FROM projects
WHERE LOWER(name) = LOWER('E-Commerce Platform')
AND id != 'excludeId' (if provided)
```

**Response**:
```json
{ "isUnique": false }
```

**UI Update**:
- If unique: Show green checkmark, enable submit button
- If not unique: Show error "A project with this name already exists", disable submit

**Validations**:
- **Client-side**: Min 3 characters, max 100 characters
- **Server-side**: Unique constraint on `projects.name`

---

##### Action 2: Select Product Owner and PMO

**What happens**: Assign project leadership roles

**Frontend**:
1. Load all users from API on page mount
2. Populate dropdowns with users (filter by role ideally)
3. User selects from dropdown OR toggles "Invite via Email"

**API Call** (load users):
```http
GET /api/users
Authorization: Bearer {accessToken}
```

**If "Invite via Email" selected**:
- Show email input field
- System will send invitation after project creation

---

##### Action 3: Submit "Create Project" Form

**What happens**: Create new project with assigned roles

**Frontend**:
1. Validate all fields:
   - Name is unique and not empty
   - Start date < End date
   - Dates are valid
2. If PO/PMO invited via email, prepare invitation data
3. Submit form

**API Call**:
```http
POST /api/projects
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "E-Commerce Platform",
  "description": "Build customer-facing e-commerce solution",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "isActive": true,
  "productOwnerId": "uuid-of-po",  // null if inviting
  "pmoId": "uuid-of-pmo"  // null if inviting
}
```

**Backend**:
- **Controller**: `ProjectController.create(createProjectDto, req.user.userId)`
- **Service**: `ProjectService.create(dto, creatorUserId)`

**Backend Flow**:
1. **Validate DTO**: All required fields present
2. **Create Project Entity**:
   ```typescript
   const project = projectRepository.create({
     name, description, startDate, endDate, isActive
   });
   ```
3. **Assign Product Owner** (if `productOwnerId` provided):
   - Find user by ID
   - If not found, throw `NotFoundException`
   - Assign to `project.productOwner`
4. **Assign PMO** (same process)
5. **Save Project**:
   ```sql
   INSERT INTO projects (id, name, description, start_date, end_date, is_active, product_owner_id, pmo_id)
   VALUES (uuid_generate_v4(), ?, ?, ?, ?, ?, ?, ?)
   RETURNING *
   ```
6. **Auto-Add Creator as Member**:
   - Find creator user by `creatorUserId`
   - Create `ProjectMember` entry:
     ```sql
     INSERT INTO project_members (project_id, user_id, role, start_date, is_active)
     VALUES (?, ?, 'Scrum Master', NOW(), true)
     ```
7. **Return Created Project** with all relations

**If Inviting via Email** (handled separately after project creation):
```http
POST /api/invitations
{
  "email": "po@example.com",
  "assignedRole": "product_owner",
  "projectId": "newly-created-project-uuid"
}
```
- Sends email with registration link

**Database**:
- **Tables Affected**:
  - `projects` (INSERT)
  - `project_members` (INSERT for creator)
  - `invitations` (INSERT if inviting)

**Response**:
```json
{
  "id": "uuid",
  "name": "E-Commerce Platform",
  "description": "...",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "isActive": true,
  "isArchived": false,
  "productOwner": {...},
  "pmo": {...},
  "members": [{...}],  // Creator auto-added
  "createdAt": "2025-12-30T10:00:00Z"
}
```

**UI Update**:
- Show success toast: "Project created successfully"
- Redirect to project details page: `/projects/{id}`

**Validations**:
- **Client-side**:
  - Name required and unique
  - Start date required and valid
  - End date required and > start date
  - Description optional
- **Server-side**:
  - Name unique constraint
  - Start date must be before end date
  - Product Owner and PMO must exist (if IDs provided)

**Error Handling**:
- **Name conflict**: "A project with this name already exists"
- **Invalid dates**: "End date must be after start date"
- **PO/PMO not found**: "Selected Product Owner not found"
- **Permission denied**: Redirect to unauthorized page

---

#### Data Flow Diagram
```
User fills form → Validate name uniqueness (debounced) →
User selects PO/PMO or enters emails → Submit form →
POST /api/projects → Validate data → Create project →
Assign PO/PMO → Auto-add creator as member →
Send invitations (if emails provided) → Return project →
Redirect to project details → Show success message
```

---

### Screen 3: Project Details Page
**Route**: `/projects/:id`
**Access**: All users with `VIEW_PROJECT` permission
**Component**: `F:\StandupSnap\frontend\src\pages\projects\ProjectDetailsPage.tsx`

#### UI Components
- Project header with name, description
- Status badges (Active/Archived)
- Project timeline (start/end dates with progress bar)
- Product Owner card
- PMO card
- Tabs:
  - **Overview**: Project stats, key metrics
  - **Sprints**: List of sprints with status
  - **Team**: Team members assigned
  - **Settings**: Edit project (SM only)
- "Edit Project" button (SM only)
- "Archive Project" button (SM only)
- "Create Sprint" button (SM only)

#### User Actions

##### Action 1: Load Project Details

**What happens**: Fetch complete project information

**API Call**:
```http
GET /api/projects/{id}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `ProjectService.findOne(id)`

**Backend Flow**:
1. Query `projects` table by ID
2. Eager load all relations:
   - `members` (with `members.user`)
   - `sprints`
   - `productOwner`
   - `pmo`
   - `teamMembers`
3. Also fetch all cards for the project (if needed)
4. Return complete project object

**Database**:
```sql
SELECT p.*,
       po.id as po_id, po.name as po_name, po.email as po_email,
       pmo.id as pmo_id, pmo.name as pmo_name, pmo.email as pmo_email,
       json_agg(DISTINCT s.*) as sprints,
       json_agg(DISTINCT pm.*) as members
FROM projects p
LEFT JOIN users po ON p.product_owner_id = po.id
LEFT JOIN users pmo ON p.pmo_id = pmo.id
LEFT JOIN sprints s ON s.project_id = p.id
LEFT JOIN project_members pm ON pm.project_id = p.id
WHERE p.id = ?
GROUP BY p.id, po.id, pmo.id
```

**Response**: Full project object with nested data

**UI Update**: Render all project details, tabs, and action buttons

---

##### Action 2: View Team Members

**What happens**: Display project team roster

**API Call**:
```http
GET /api/projects/{id}/team
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `ProjectController.getProjectTeam(id)`
- **Service**: `TeamMemberService.getProjectTeam(projectId)`

**Backend Flow**:
1. Query `team_members` via `project_team_members` join table
2. Filter by `projectId`
3. Return team members with their details

**Database**:
```sql
SELECT tm.*
FROM team_members tm
INNER JOIN project_team_members ptm ON tm.id = ptm.team_member_id
WHERE ptm.project_id = ?
```

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "designation": "Senior Developer",
    "phoneNumber": "+1234567890",
    "isActive": true
  }
]
```

**UI Update**: Display team members in table/card layout

---

##### Action 3: Add Team Member to Project

**What happens**: Assign existing team member to project

**Frontend**:
1. Click "Add Team Member" button
2. Modal opens with dropdown of available team members
3. Select member and submit

**API Call** (get available members):
```http
GET /api/projects/{id}/available-team
Authorization: Bearer {accessToken}
```

**API Call** (assign member):
```http
POST /api/projects/{id}/team
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "teamMemberIds": ["uuid1", "uuid2"]
}
```

**Backend**:
- **Service**: `TeamMemberService.addToProject(projectId, teamMemberIds)`

**Backend Flow**:
1. Validate all team member IDs exist
2. Create entries in `project_team_members` join table
3. Return updated team list

**Database**:
```sql
INSERT INTO project_team_members (project_id, team_member_id)
VALUES (?, ?), (?, ?)
ON CONFLICT DO NOTHING
```

**UI Update**: Refresh team list, close modal, show success toast

---

##### Action 4: Remove Team Member from Project

**What happens**: Unassign team member

**API Call**:
```http
DELETE /api/projects/{id}/team/{teamMemberId}
Authorization: Bearer {accessToken}
```

**Backend Flow**:
1. Delete from `project_team_members` join table
2. Return success

**Database**:
```sql
DELETE FROM project_team_members
WHERE project_id = ? AND team_member_id = ?
```

**UI Update**: Remove from list, show confirmation

---

### Screen 4: Edit Project Page
**Route**: `/projects/:id/edit`
**Access**: Scrum Master with `EDIT_PROJECT` permission
**Component**: `F:\StandupSnap\frontend\src\pages\projects\EditProjectPage.tsx`

#### User Actions

##### Action 1: Update Project Details

**What happens**: Modify project information

**Frontend**:
1. Load existing project data
2. Pre-fill form fields
3. User modifies fields
4. Submit update

**API Call**:
```http
PATCH /api/projects/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "productOwnerId": "new-uuid",
  "pmoId": "new-uuid"
}
```

**Backend**:
- **Controller**: `ProjectController.update(id, updateProjectDto)`
- **Service**: `ProjectService.update(id, dto)`

**Backend Flow**:
1. Find project by ID
2. If name changed, check uniqueness (excluding current project)
3. Validate dates (end > start)
4. Update fields:
   ```sql
   UPDATE projects
   SET name = ?, description = ?, start_date = ?, end_date = ?,
       product_owner_id = ?, pmo_id = ?, updated_at = NOW()
   WHERE id = ?
   ```
5. If PO/PMO IDs changed, update relations
6. Return updated project

**Validations**:
- Name must be unique (excluding self)
- End date must be after start date
- Cannot change dates if sprints exist with conflicting dates

**UI Update**: Show success message, redirect to details page

---

##### Action 2: Archive Project

**What happens**: Mark project as archived (soft delete)

**Frontend**:
1. Click "Archive Project" button
2. Confirmation modal: "Are you sure?"
3. Submit archive request

**API Call**:
```http
PATCH /api/projects/{id}/archive
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `ProjectService.archive(id)`

**Backend Flow**:
1. Find project
2. Set `isArchived = true`, `isActive = false`
3. Update database:
   ```sql
   UPDATE projects
   SET is_archived = true, is_active = false, updated_at = NOW()
   WHERE id = ?
   ```
4. Return updated project

**Business Rules**:
- Archived projects don't appear in default lists
- Cannot create new sprints in archived projects
- Can be un-archived by SM

**UI Update**: Redirect to projects list, show "Project archived" message

---

## Complete User Journey

### Journey 1: Create New Project with Team

1. **SM logs in**: Navigates to Projects page
2. **Click "Create Project"**: Opens creation form
3. **Fill project details**:
   - Name: "E-Commerce Platform"
   - Description: "Customer-facing online store"
   - Start: 2025-01-01
   - End: 2025-12-31
4. **Assign PO**: Select Jane Doe from dropdown
5. **Invite PMO**: Toggle "Invite via Email", enter bob@example.com
6. **Submit form**:
   - POST /api/projects → Project created
   - POST /api/invitations → Email sent to Bob
   - SM auto-added as member
7. **Redirect to project details**: Project is ready
8. **Add team members**:
   - Click "Add Team Member"
   - Select 5 developers from pool
   - POST /api/projects/{id}/team
   - Team assigned
9. **Journey complete**: Project ready for sprint planning

---

### Journey 2: Archive Old Project

1. **SM opens project**: Selects completed project
2. **Review project**: Check all sprints are closed
3. **Click "Archive"**: Confirmation modal appears
4. **Confirm archive**: PATCH /api/projects/{id}/archive
5. **Project archived**: Moves to "Archived" filter
6. **Journey complete**: Project hidden from active list

---

## Database Schema

### Tables Involved

#### `projects` Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR UNIQUE NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  product_owner_id UUID REFERENCES users(id),
  pmo_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_active ON projects(is_active, is_archived);
```

#### `project_members` Table (User access control)
```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL,  -- Scrum Master, Team Member, etc.
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `project_team_members` Join Table
```sql
CREATE TABLE project_team_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, team_member_id)
);
```

### Key Relationships
- **Project → Product Owner**: Many-to-One (User)
- **Project → PMO**: Many-to-One (User)
- **Project → Sprints**: One-to-Many
- **Project → Cards**: One-to-Many
- **Project ↔ Team Members**: Many-to-Many (via join table)

---

## API Endpoints Summary

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/projects` | List all projects | VIEW_PROJECT |
| GET | `/api/projects/check-name` | Check name uniqueness | VIEW_PROJECT |
| GET | `/api/projects/:id` | Get project details | VIEW_PROJECT |
| POST | `/api/projects` | Create new project | CREATE_PROJECT |
| PATCH | `/api/projects/:id` | Update project | EDIT_PROJECT |
| PATCH | `/api/projects/:id/archive` | Archive project | EDIT_PROJECT |
| DELETE | `/api/projects/:id` | Delete project (hard) | DELETE_PROJECT |
| GET | `/api/projects/:id/team` | Get team members | VIEW_TEAM_MEMBER |
| POST | `/api/projects/:id/team` | Add team members | ADD_TEAM_MEMBER |
| DELETE | `/api/projects/:id/team/:memberId` | Remove team member | REMOVE_TEAM_MEMBER |

---

## Permissions & RBAC

### Scrum Master
- Full CRUD on projects
- Can assign/change PO and PMO
- Can archive/un-archive
- Can manage team members

### Product Owner
- View all projects
- Edit project details (not delete)
- View team members

### PMO
- View only (all projects)
- No edit/delete capabilities

---

## Integration Points

### With Sprint Module
- Projects contain multiple sprints
- Sprint date ranges must fit within project dates
- Archived projects cannot have new sprints

### With Cards Module
- All cards belong to a project
- Cards are assigned within project context

### With Team Module
- Team members are assigned to projects
- Only assigned members can be assignees on cards

### With Dashboard Module
- Project selection filters all dashboard data
- RAG status aggregated from project's cards/sprints

---

## Common Issues & Solutions

### Issue 1: Cannot Create Project with Same Name
**Cause**: Unique constraint on `projects.name`
**Solution**: Choose different name or archive old project first

### Issue 2: Cannot Change Dates After Sprints Created
**Cause**: Business logic prevents date changes that invalidate existing sprints
**Solution**: Delete conflicting sprints first or adjust dates to accommodate

### Issue 3: PO/PMO Not Receiving Invitation Email
**Cause**: Email service not configured or SMTP failure
**Solution**: Check SMTP settings in backend .env, verify email address valid

### Issue 4: Team Member Not Available for Assignment
**Cause**: Team member already assigned or inactive
**Solution**: Check team member status, or select different member

### Issue 5: Project Deletion Fails
**Cause**: Cascading foreign key constraints (sprints, cards exist)
**Solution**: Archive instead of delete, or manually remove sprints/cards first

---

**Last Updated**: 2025-12-30
**Related Modules**: Sprints (Module 3), Cards (Module 4), Team Management (Module 7)
