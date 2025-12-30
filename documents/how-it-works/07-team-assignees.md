# Team & Assignees - How It Works

## Overview
- **Purpose**: Team member management and assignee performance tracking
- **Key Features**: Team member pool, multi-project assignment, workload tracking, performance analytics
- **Integration**: Projects, Cards, Snaps, Dashboard
- **Dual Module**: Part A (Team Member Management) + Part B (Assignee Tracking)

## Database Schema

### TeamMember Entity
**Table**: `team_members`
**File**: `F:\StandupSnap\backend\src\entities\team-member.entity.ts`

#### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto-generated |
| `fullName` | String | Full legal name | Required |
| `displayName` | String | Preferred display name | Nullable |
| `designationRole` | Enum | Job role/designation | Required |
| `projects` | Relation | Projects assigned to | ManyToMany |
| `createdAt` | Timestamp | Creation timestamp | Auto-generated |
| `updatedAt` | Timestamp | Update timestamp | Auto-updated |

#### DesignationRole Enum
```typescript
export enum DesignationRole {
  DEVELOPER = 'Developer',
  QA_TESTER = 'QA / Tester',
  BUSINESS_ANALYST = 'Business Analyst',
  UI_UX_DESIGNER = 'UI/UX Designer',
  DEVOPS_ENGINEER = 'DevOps Engineer',
  AUTOMATION_ENGINEER = 'Automation Engineer',
  BACKEND_DEVELOPER = 'Backend Developer',
  FRONTEND_DEVELOPER = 'Frontend Developer',
  FULL_STACK_DEVELOPER = 'Full Stack Developer',
}
```

---

### Project Relationship
**Table**: `project_team_members` (join table)
**File**: `F:\StandupSnap\backend\src\entities\project.entity.ts`

Many-to-Many relationship between `projects` and `team_members`.

#### Fields
| Field | Type | Description |
|-------|------|-------------|
| `project_id` | UUID | Project reference |
| `team_member_id` | UUID | Team member reference |

**Composite Primary Key**: `[project_id, team_member_id]`

---

## Part A: Team Member Management

### Screen 1: Team Members List
**Route**: `/team-members`
**Access**: Requires `VIEW_TEAM_MEMBER` permission
**Component**: `F:\StandupSnap\frontend\src\pages\TeamMembersList.tsx` (inferred)

#### UI Components
- **Page Header**: "Team Members" title, "Add Team Member" button
- **Search Bar**: Search by name or designation
- **Filter Dropdown**: Filter by designation role
- **Team Members Grid/Table**:
  - Full Name column
  - Display Name column
  - Designation/Role column
  - Projects Assigned count badge
  - Actions: Edit, Delete, View Details
- **Pagination**: If more than 50 team members
- **Empty State**: "No team members yet. Add your first team member."

#### User Actions

##### Action 1: View All Team Members

**What happens**: Load and display all team members in the pool

**Frontend**:
1. On page mount, fetch all team members
2. Display in table/grid format
3. Show project count for each member

**API Call**:
```http
GET /api/team-members
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\team-member\team-member.controller.ts` - `@Get()`
- **Service**: `F:\StandupSnap\backend\src\team-member\team-member.service.ts` - `findAll()`

**Service Logic**:
```typescript
async findAll(): Promise<TeamMember[]> {
  return this.teamMemberRepository.find({
    relations: ['projects'],
    order: { fullName: 'ASC' },
  });
}
```

**Database Query**:
```sql
SELECT tm.*, p.* FROM team_members tm
LEFT JOIN project_team_members ptm ON tm.id = ptm.team_member_id
LEFT JOIN projects p ON ptm.project_id = p.id
ORDER BY tm.full_name ASC
```

**Response**:
```json
[
  {
    "id": "tm-1",
    "fullName": "John Doe",
    "displayName": "John",
    "designationRole": "Backend Developer",
    "projects": [
      { "id": "proj-1", "name": "Project Alpha" },
      { "id": "proj-2", "name": "Project Beta" }
    ],
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  },
  {
    "id": "tm-2",
    "fullName": "Sarah Smith",
    "displayName": "Sarah",
    "designationRole": "QA / Tester",
    "projects": [
      { "id": "proj-1", "name": "Project Alpha" }
    ],
    "createdAt": "2025-01-16T09:30:00Z",
    "updatedAt": "2025-01-16T09:30:00Z"
  }
]
```

**UI Update**:
1. Render table with all team members
2. Show project count badge (e.g., "2 projects")
3. Enable search and filter
4. Pagination if needed

**Validations**:
- User must have `VIEW_TEAM_MEMBER` permission

**Error Handling**:
- **No team members**: Show empty state
- **Network error**: Show retry button

---

##### Action 2: Search Team Members

**What happens**: Filter team members by name or designation

**Frontend**:
1. User types in search bar
2. Debounced search (500ms delay)
3. Filter displayed results client-side

**Implementation**:
```typescript
const filteredMembers = teamMembers.filter(tm =>
  tm.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
  tm.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  tm.designationRole.toLowerCase().includes(searchQuery.toLowerCase())
);
```

**UI Update**:
1. Display filtered results
2. Show count: "Showing 3 of 25 team members"
3. Clear button to reset search

---

### Screen 2: Create Team Member
**Route**: `/team-members/create`
**Access**: Requires `ADD_TEAM_MEMBER` permission
**Component**: `F:\StandupSnap\frontend\src\pages\CreateTeamMember.tsx` (inferred)

#### UI Components
- **Page Header**: "Add Team Member"
- **Form Fields**:
  - Full Name (text input, required)
  - Display Name (text input, optional)
  - Designation/Role (dropdown, required)
- **Save Button**: "Add Team Member"
- **Cancel Button**: Returns to list
- **Validation Hints**: Real-time validation feedback

#### User Actions

##### Action 1: Create New Team Member

**What happens**: Add team member to global pool

**Frontend**:
1. User fills in form fields
2. Validates required fields
3. On submit, calls create API

**API Call**:
```http
POST /api/team-members
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fullName": "Alice Johnson",
  "displayName": "Alice",
  "designationRole": "Frontend Developer"
}
```

**Backend**:
- **Controller**: `team-member.controller.ts` - `@Post()`
- **Service**: `team-member.service.ts` - `create()`

**Service Logic**:
```typescript
async create(createTeamMemberDto: CreateTeamMemberDto): Promise<TeamMember> {
  const teamMember = this.teamMemberRepository.create(createTeamMemberDto);
  return this.teamMemberRepository.save(teamMember);
}
```

**Database Query**:
```sql
INSERT INTO team_members (id, full_name, display_name, designation_role, created_at, updated_at)
VALUES (?, ?, ?, ?, NOW(), NOW())
RETURNING *
```

**Response**:
```json
{
  "id": "tm-3",
  "fullName": "Alice Johnson",
  "displayName": "Alice",
  "designationRole": "Frontend Developer",
  "projects": [],
  "createdAt": "2025-12-30T14:20:00Z",
  "updatedAt": "2025-12-30T14:20:00Z"
}
```

**UI Update**:
1. Show success toast "Team member added successfully"
2. Redirect to team members list
3. New member appears in list

**Validations**:
- **Full Name**: Required, min 2 characters, max 100 characters
- **Display Name**: Optional, max 50 characters
- **Designation Role**: Required, must be from enum

**Error Handling**:
- **Duplicate name**: Warning (not enforced, but notify user)
- **Invalid role**: "Please select a valid designation"
- **Network error**: Show error toast

---

### Screen 3: Edit Team Member
**Route**: `/team-members/:id/edit`
**Access**: Requires `EDIT_TEAM_MEMBER` permission

#### User Actions

##### Action 1: Update Team Member Details

**What happens**: Modify team member information

**Frontend**:
1. Load existing team member data
2. Pre-fill form
3. User edits fields
4. On save, call update API

**API Call 1** (Load):
```http
GET /api/team-members/{id}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `team-member.controller.ts` - `@Get(':id')`
- **Service**: `team-member.service.ts` - `findOne()`

**Service Logic**:
```typescript
async findOne(id: string): Promise<TeamMember> {
  const teamMember = await this.teamMemberRepository.findOne({
    where: { id },
    relations: ['projects'],
  });

  if (!teamMember) {
    throw new NotFoundException(`Team member with ID ${id} not found`);
  }

  return teamMember;
}
```

**Database Query**:
```sql
SELECT tm.*, p.* FROM team_members tm
LEFT JOIN project_team_members ptm ON tm.id = ptm.team_member_id
LEFT JOIN projects p ON ptm.project_id = p.id
WHERE tm.id = ?
```

**Response**:
```json
{
  "id": "tm-1",
  "fullName": "John Doe",
  "displayName": "John",
  "designationRole": "Backend Developer",
  "projects": [
    { "id": "proj-1", "name": "Project Alpha" }
  ]
}
```

**API Call 2** (Update):
```http
PATCH /api/team-members/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fullName": "John Doe Jr.",
  "displayName": "Johnny",
  "designationRole": "Full Stack Developer"
}
```

**Backend**:
- **Controller**: `team-member.controller.ts` - `@Patch(':id')`
- **Service**: `team-member.service.ts` - `update()`

**Service Logic**:
```typescript
async update(id: string, updateTeamMemberDto: UpdateTeamMemberDto): Promise<TeamMember> {
  const teamMember = await this.findOne(id);
  Object.assign(teamMember, updateTeamMemberDto);
  return this.teamMemberRepository.save(teamMember);
}
```

**Database Query**:
```sql
UPDATE team_members
SET full_name = ?, display_name = ?, designation_role = ?, updated_at = NOW()
WHERE id = ?
RETURNING *
```

**Response**:
```json
{
  "id": "tm-1",
  "fullName": "John Doe Jr.",
  "displayName": "Johnny",
  "designationRole": "Full Stack Developer",
  "updatedAt": "2025-12-30T15:00:00Z"
}
```

**UI Update**:
1. Show success toast "Team member updated"
2. Redirect to team members list or details page

**Validations**:
- Same as create
- Team member must exist

**Error Handling**:
- **Team member not found**: "Team member not found"
- **No changes**: Allow save (idempotent)

---

### Screen 4: Delete Team Member
**Route**: Action on team members list
**Access**: Requires `REMOVE_TEAM_MEMBER` permission

#### User Actions

##### Action 1: Delete Team Member (with Validation)

**What happens**: Remove team member from pool (with card assignment check)

**Frontend**:
1. User clicks Delete icon on team member row
2. Confirmation modal: "Delete [Name]? This action cannot be undone."
3. **Important**: Check if member is assigned to any cards
4. If assigned, show warning: "Cannot delete. [Name] is assigned to 5 cards. Please reassign cards first."
5. If not assigned, allow deletion

**API Call 1** (Check Assignments - Optional, can be done in delete endpoint):
```http
GET /api/cards?assigneeId={teamMemberId}
Authorization: Bearer {accessToken}
```

**API Call 2** (Delete):
```http
DELETE /api/team-members/{id}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `team-member.controller.ts` - `@Delete(':id')`
- **Service**: `team-member.service.ts` - `remove()`

**Service Logic**:
```typescript
async remove(id: string): Promise<void> {
  const teamMember = await this.findOne(id);

  // Optional: Check if assigned to any cards
  // This validation can be done here or in frontend
  // If cascading delete is configured, cards will be affected
  // Best practice: Prevent deletion if assigned to cards

  await this.teamMemberRepository.remove(teamMember);
}
```

**Database Query**:
```sql
-- Check card assignments (if validation implemented)
SELECT COUNT(*) FROM cards WHERE assignee_id = ?

-- Delete team member
DELETE FROM team_members WHERE id = ?

-- Cascade: Remove from project_team_members join table
DELETE FROM project_team_members WHERE team_member_id = ?
```

**Response**: `204 No Content`

**UI Update**:
1. Show success toast "Team member deleted"
2. Remove row from table
3. Update total count

**Validations**:
- Team member must exist
- **Business Rule**: Should not be assigned to any active cards (recommended validation)

**Error Handling**:
- **Assigned to cards**: "Cannot delete. Team member is assigned to active cards."
- **Team member not found**: "Team member not found"

**Business Rules**:
1. **Soft Delete Recommended**: Instead of hard delete, mark as inactive
2. **Card Assignment Check**: Prevent deletion if assigned to cards
3. **Project Removal**: Automatically removed from all projects (cascade)

---

### Screen 5: Multi-Project Assignment
**Route**: `/projects/:projectId/team`
**Access**: Requires `EDIT_PROJECT` permission
**Component**: Part of Project Details page

#### UI Components
- **Current Team Section**: List of assigned team members
- **Add Team Members Button**: Opens modal
- **Team Member Assignment Modal**:
  - Search bar
  - Available team members list (not assigned to this project)
  - Checkboxes for multi-select
  - "Add to Project" button
- **Remove Button**: Next to each team member in current team

#### User Actions

##### Action 1: View Team Members for a Project

**What happens**: Display all team members assigned to project

**Frontend**:
1. Load project details page
2. Fetch team members for this project

**API Call**:
```http
GET /api/projects/{projectId}/team
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\project\project.controller.ts` - `@Get(':id/team')`
- **Service**: `F:\StandupSnap\backend\src\team-member\team-member.service.ts` - `getProjectTeam()`

**Service Logic**:
```typescript
async getProjectTeam(projectId: string): Promise<any[]> {
  const project = await this.projectRepository.findOne({
    where: { id: projectId },
    relations: ['teamMembers', 'productOwner', 'pmo', 'members', 'members.user'],
  });

  if (!project) {
    throw new NotFoundException(`Project with ID ${projectId} not found`);
  }

  const teamMembers: any[] = [];

  // Add regular team members
  if (project.teamMembers) {
    teamMembers.push(...project.teamMembers.map(tm => ({
      id: tm.id,
      fullName: tm.fullName,
      displayName: tm.displayName,
      designationRole: tm.designationRole,
      type: 'team_member',
    })));
  }

  // Add Product Owner if exists
  if (project.productOwner) {
    teamMembers.push({
      id: `user-${project.productOwner.id}`,
      fullName: project.productOwner.name,
      displayName: project.productOwner.name,
      designationRole: 'Product Owner',
      type: 'special_role',
      userId: project.productOwner.id,
    });
  }

  // Add PMO if exists
  if (project.pmo) {
    teamMembers.push({
      id: `user-${project.pmo.id}`,
      fullName: project.pmo.name,
      displayName: project.pmo.name,
      designationRole: 'PMO',
      type: 'special_role',
      userId: project.pmo.id,
    });
  }

  // Add Scrum Master from project members
  if (project.members) {
    const scrumMasters = project.members.filter(
      member => member.role.toLowerCase().includes('scrum') && member.isActive
    );

    for (const sm of scrumMasters) {
      if (sm.user) {
        teamMembers.push({
          id: `user-${sm.user.id}`,
          fullName: sm.user.name,
          displayName: sm.user.name,
          designationRole: 'Scrum Master',
          type: 'special_role',
          userId: sm.user.id,
        });
      }
    }
  }

  return teamMembers;
}
```

**Database Query**:
```sql
SELECT p.*, tm.*, po.*, pmo_user.*, pm.*, u.*
FROM projects p
LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
LEFT JOIN team_members tm ON ptm.team_member_id = tm.id
LEFT JOIN users po ON p.product_owner_id = po.id
LEFT JOIN users pmo_user ON p.pmo_id = pmo_user.id
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN users u ON pm.user_id = u.id
WHERE p.id = ?
```

**Response**:
```json
[
  {
    "id": "tm-1",
    "fullName": "John Doe",
    "displayName": "John",
    "designationRole": "Backend Developer",
    "type": "team_member"
  },
  {
    "id": "user-user-1",
    "fullName": "Jane Manager",
    "displayName": "Jane Manager",
    "designationRole": "Product Owner",
    "type": "special_role",
    "userId": "user-1"
  },
  {
    "id": "user-user-2",
    "fullName": "Bob Master",
    "displayName": "Bob Master",
    "designationRole": "Scrum Master",
    "type": "special_role",
    "userId": "user-2"
  }
]
```

**UI Update**:
1. Display all team members in "Team" section
2. Show role badges (team_member vs special_role)
3. Enable remove action for team_member type only
4. Special roles (PO, PMO, SM) cannot be removed here (managed separately)

---

##### Action 2: Add Team Members to Project

**What happens**: Assign team members from pool to project

**Frontend**:
1. Click "Add Team Members" button
2. Modal opens
3. Fetch available team members (not assigned to this project)
4. User selects multiple team members
5. Click "Add to Project"

**API Call 1** (Get Available):
```http
GET /api/projects/{projectId}/team/available
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `team-member.service.ts` - `getAvailableTeamMembers()`

**Service Logic**:
```typescript
async getAvailableTeamMembers(projectId: string): Promise<TeamMember[]> {
  const project = await this.projectRepository.findOne({
    where: { id: projectId },
    relations: ['teamMembers'],
  });

  if (!project) {
    throw new NotFoundException(`Project with ID ${projectId} not found`);
  }

  const assignedIds = project.teamMembers.map(tm => tm.id);

  if (assignedIds.length === 0) {
    return this.teamMemberRepository.find({
      order: { fullName: 'ASC' },
    });
  }

  return this.teamMemberRepository.find({
    where: {
      id: Not(In(assignedIds)),
    },
    order: { fullName: 'ASC' },
  });
}
```

**Database Query**:
```sql
SELECT tm.* FROM team_members tm
WHERE tm.id NOT IN (
  SELECT team_member_id FROM project_team_members WHERE project_id = ?
)
ORDER BY tm.full_name ASC
```

**Response**:
```json
[
  {
    "id": "tm-4",
    "fullName": "Mike Chen",
    "displayName": "Mike",
    "designationRole": "QA / Tester"
  },
  {
    "id": "tm-5",
    "fullName": "Emily Brown",
    "displayName": "Em",
    "designationRole": "UI/UX Designer"
  }
]
```

**API Call 2** (Add to Project):
```http
POST /api/projects/{projectId}/team
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "teamMemberIds": ["tm-4", "tm-5"]
}
```

**Backend**:
- **Controller**: `project.controller.ts` - `@Post(':id/team')`
- **Service**: `team-member.service.ts` - `addToProject()`

**Service Logic**:
```typescript
async addToProject(projectId: string, addToProjectDto: AddToProjectDto): Promise<Project> {
  const project = await this.projectRepository.findOne({
    where: { id: projectId },
    relations: ['teamMembers'],
  });

  if (!project) {
    throw new NotFoundException(`Project with ID ${projectId} not found`);
  }

  if (project.isArchived) {
    throw new BadRequestException('Cannot modify team in archived project');
  }

  const teamMembers = await this.teamMemberRepository.findBy({
    id: In(addToProjectDto.teamMemberIds),
  });

  if (teamMembers.length !== addToProjectDto.teamMemberIds.length) {
    throw new NotFoundException('One or more team members not found');
  }

  // Check for duplicates
  const existingIds = new Set(project.teamMembers.map(tm => tm.id));
  const duplicates = teamMembers.filter(tm => existingIds.has(tm.id));

  if (duplicates.length > 0) {
    throw new ConflictException(
      `Team member(s) already assigned to project: ${duplicates.map(d => d.fullName).join(', ')}`,
    );
  }

  project.teamMembers = [...project.teamMembers, ...teamMembers];
  return this.projectRepository.save(project);
}
```

**Database Query**:
```sql
-- Get project and current team
SELECT p.*, tm.* FROM projects p
LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
LEFT JOIN team_members tm ON ptm.team_member_id = tm.id
WHERE p.id = ?

-- Validate team members exist
SELECT * FROM team_members WHERE id IN (?, ?)

-- Insert into join table
INSERT INTO project_team_members (project_id, team_member_id)
VALUES (?, ?), (?, ?)
```

**Response**:
```json
{
  "id": "proj-1",
  "name": "Project Alpha",
  "teamMembers": [
    { "id": "tm-1", "fullName": "John Doe" },
    { "id": "tm-4", "fullName": "Mike Chen" },
    { "id": "tm-5", "fullName": "Emily Brown" }
  ]
}
```

**UI Update**:
1. Close modal
2. Refresh team members list
3. Show success toast "2 team members added"
4. New members appear in Current Team section

**Validations**:
- Team members must exist
- No duplicates (already assigned)
- Project must not be archived
- User must have `EDIT_PROJECT` permission

**Error Handling**:
- **Duplicate**: "Mike Chen is already assigned to this project"
- **Not found**: "One or more team members not found"
- **Archived project**: "Cannot modify team in archived project"

---

##### Action 3: Remove Team Member from Project

**What happens**: Unassign team member from project

**Frontend**:
1. Click Remove icon next to team member
2. Confirmation modal: "Remove [Name] from project?"
3. **Important**: Check if assigned to any cards in this project
4. If assigned, show warning: "Cannot remove. [Name] is assigned to 3 cards in this project."

**API Call**:
```http
DELETE /api/projects/{projectId}/team/{teamMemberId}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `project.controller.ts` - `@Delete(':id/team/:memberId')`
- **Service**: `team-member.service.ts` - `removeFromProject()`

**Service Logic**:
```typescript
async removeFromProject(projectId: string, teamMemberId: string): Promise<Project> {
  const project = await this.projectRepository.findOne({
    where: { id: projectId },
    relations: ['teamMembers'],
  });

  if (!project) {
    throw new NotFoundException(`Project with ID ${projectId} not found`);
  }

  if (project.isArchived) {
    throw new BadRequestException('Cannot modify team in archived project');
  }

  const memberIndex = project.teamMembers.findIndex(tm => tm.id === teamMemberId);

  if (memberIndex === -1) {
    throw new NotFoundException(`Team member not found in this project`);
  }

  // Optional: Check if assigned to any cards
  // This should be done to prevent orphaned cards
  // const cardsCount = await this.cardRepository.count({
  //   where: { assignee: { id: teamMemberId }, project: { id: projectId } }
  // });
  // if (cardsCount > 0) {
  //   throw new BadRequestException(`Cannot remove. Assigned to ${cardsCount} cards.`);
  // }

  project.teamMembers.splice(memberIndex, 1);
  return this.projectRepository.save(project);
}
```

**Database Query**:
```sql
-- Get project and team
SELECT p.*, tm.* FROM projects p
LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
LEFT JOIN team_members tm ON ptm.team_member_id = tm.id
WHERE p.id = ?

-- Optional: Check card assignments
SELECT COUNT(*) FROM cards
WHERE assignee_id = ? AND project_id = ?

-- Remove from join table
DELETE FROM project_team_members
WHERE project_id = ? AND team_member_id = ?
```

**Response**:
```json
{
  "id": "proj-1",
  "name": "Project Alpha",
  "teamMembers": [
    { "id": "tm-1", "fullName": "John Doe" }
  ]
}
```

**UI Update**:
1. Remove team member from list
2. Show success toast "Team member removed from project"
3. Update team count

**Validations**:
- Team member must be assigned to project
- Project must not be archived
- **Recommended**: Check card assignments before allowing removal

**Business Rules**:
- Removing from project does NOT delete team member from global pool
- Only removes association in `project_team_members` join table
- Should validate no active card assignments

---

## Part B: Assignee Tracking & Performance

### Screen 6: Assignee List View (Project Context)
**Route**: `/projects/:projectId/assignees`
**Access**: Requires `VIEW_TEAM_MEMBER` permission
**Component**: `F:\StandupSnap\frontend\src\pages\AssigneesList.tsx` (inferred)

#### UI Components
- **Page Header**: "Team Performance - [Project Name]"
- **Summary Cards**:
  - Total Assignees
  - Average Cards per Assignee
  - Team RAG Distribution (pie chart)
- **Assignees Table**:
  - Assignee Name
  - Designation
  - Active Cards Count
  - Completed Cards Count
  - Current RAG Status (color indicator)
  - Workload % (progress bar)
  - Actions: View Details
- **Filter Panel**:
  - Filter by RAG status (RED/AMBER/GREEN)
  - Filter by workload (overloaded, balanced, underutilized)
- **Sort Options**: Name, Cards Count, RAG Status, Workload

#### User Actions

##### Action 1: View Assignees for Active Sprint

**What happens**: Display performance metrics for all assignees

**Frontend**:
1. Load project and active sprint
2. Fetch team members and their metrics
3. Calculate workload and RAG status

**API Call 1** (Get Project Team):
```http
GET /api/projects/{projectId}/team
Authorization: Bearer {accessToken}
```

**API Call 2** (Get Active Sprint):
```http
GET /api/sprints?projectId={projectId}&status=active
Authorization: Bearer {accessToken}
```

**API Call 3** (Get Cards for Sprint):
```http
GET /api/cards?sprintId={sprintId}
Authorization: Bearer {accessToken}
```

**Frontend Aggregation**:
```typescript
// Group cards by assignee
const assigneeMetrics = teamMembers.map(tm => {
  const assignedCards = cards.filter(card => card.assignee?.id === tm.id);
  const activeCards = assignedCards.filter(card =>
    card.status !== 'completed' && card.status !== 'closed'
  );
  const completedCards = assignedCards.filter(card =>
    card.status === 'completed' || card.status === 'closed'
  );

  // Calculate assignee RAG (worst-case)
  let assigneeRAG = 'green';
  if (activeCards.some(c => c.ragStatus === 'red')) {
    assigneeRAG = 'red';
  } else if (activeCards.some(c => c.ragStatus === 'amber')) {
    assigneeRAG = 'amber';
  }

  // Calculate workload %
  const totalET = activeCards.reduce((sum, c) => sum + c.estimatedTime, 0);
  const availableHours = sprintDuration * 6; // Assume 6 hours/day productive
  const workload = (totalET / availableHours) * 100;

  return {
    assignee: tm,
    activeCardsCount: activeCards.length,
    completedCardsCount: completedCards.length,
    assigneeRAG,
    workload: Math.round(workload),
  };
});
```

**UI Update**:
1. Display summary cards with aggregated metrics
2. Render table with all assignees
3. Color-code RAG status
4. Show workload progress bar (red if > 100%, amber if 80-100%, green if < 80%)

**Calculations**:

**Assignee RAG Calculation** (Worst-Case):
```
IF any active card is RED → Assignee is RED
ELSE IF any active card is AMBER → Assignee is AMBER
ELSE → Assignee is GREEN
```

**Workload Percentage**:
```
Total ET (hours) = Sum of estimatedTime for all active cards
Available Hours = Sprint Duration (days) × 6 hours/day
Workload % = (Total ET ÷ Available Hours) × 100
```

**Workload Thresholds**:
- **Overloaded**: > 100% (RED)
- **At Capacity**: 80-100% (AMBER)
- **Balanced**: 50-80% (GREEN)
- **Underutilized**: < 50% (BLUE)

---

### Screen 7: Assignee Details Page
**Route**: `/assignees/:assigneeId`
**Access**: Requires `VIEW_TEAM_MEMBER` permission
**Component**: `F:\StandupSnap\frontend\src\pages\AssigneeDetails.tsx` (inferred)

#### UI Components
- **Page Header**: Assignee name, designation, avatar
- **Performance Dashboard** (Widgets):
  1. **Cards Overview Widget**:
     - Total Cards Assigned (lifetime)
     - Active Cards (current sprint)
     - Completed Cards (current sprint)
     - Cards in RED/AMBER/GREEN
  2. **Completion Metrics Widget**:
     - Completion Rate (%)
     - Average Time to Complete (days)
     - On-Time Delivery Rate (%)
  3. **RAG Distribution Chart**:
     - Pie chart showing RED/AMBER/GREEN breakdown
  4. **Workload Widget**:
     - Current Workload %
     - Total Estimated Hours
     - Hours Remaining
     - Comparison with team average
  5. **Snap History Widget**:
     - Total Snaps Created
     - Snaps per Day (average)
     - Consistency Score (snaps every day vs gaps)
     - Days Without Snaps (list)
  6. **Blocker Frequency Widget**:
     - Total Blockers Reported
     - Blocker Rate (% of snaps with blockers)
     - Most Common Blockers (if AI categorization exists)
- **Active Cards List**: Table of current cards
- **Snap Timeline**: Calendar view of snap history

#### User Actions

##### Action 1: View Assignee Performance Dashboard

**What happens**: Display comprehensive metrics for individual assignee

**Frontend**:
1. Load assignee details
2. Fetch all cards assigned to this assignee (current sprint + historical)
3. Fetch all snaps created by this assignee
4. Calculate metrics

**API Call 1** (Get Assignee):
```http
GET /api/team-members/{assigneeId}
Authorization: Bearer {accessToken}
```

**API Call 2** (Get Cards for Assignee):
```http
GET /api/cards?assigneeId={assigneeId}
Authorization: Bearer {accessToken}
```

**API Call 3** (Get Snaps by Assignee - inferred endpoint):
```http
GET /api/snaps/assignee/{assigneeId}?sprintId={sprintId}
Authorization: Bearer {accessToken}
```

**Frontend Calculations**:

**1. Cards Overview**:
```typescript
const totalCards = cards.length;
const activeCards = cards.filter(c =>
  c.status === 'in_progress' || c.status === 'not_started'
).length;
const completedCards = cards.filter(c =>
  c.status === 'completed' || c.status === 'closed'
).length;

const ragDistribution = {
  red: cards.filter(c => c.ragStatus === 'red').length,
  amber: cards.filter(c => c.ragStatus === 'amber').length,
  green: cards.filter(c => c.ragStatus === 'green').length,
};
```

**2. Completion Metrics**:
```typescript
// Completion Rate
const completionRate = totalCards > 0
  ? (completedCards / totalCards) * 100
  : 0;

// Average Time to Complete
const completedWithTime = cards.filter(c => c.completedAt && c.createdAt);
const avgTimeToComplete = completedWithTime.length > 0
  ? completedWithTime.reduce((sum, c) => {
      const days = (new Date(c.completedAt) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0) / completedWithTime.length
  : 0;

// On-Time Delivery Rate (if deadline exists in cards)
// Assuming cards have a 'dueDate' field
const cardsWithDeadline = cards.filter(c => c.dueDate && c.completedAt);
const onTimeCards = cardsWithDeadline.filter(c =>
  new Date(c.completedAt) <= new Date(c.dueDate)
);
const onTimeRate = cardsWithDeadline.length > 0
  ? (onTimeCards.length / cardsWithDeadline.length) * 100
  : 0;
```

**3. Workload Analysis**:
```typescript
const totalET = cards
  .filter(c => c.status !== 'completed' && c.status !== 'closed')
  .reduce((sum, c) => sum + c.estimatedTime, 0);

const availableHours = sprintDaysRemaining * 6; // 6 productive hours/day
const workload = (totalET / availableHours) * 100;

// Compare with team average
const teamAvgWorkload = calculateTeamAverageWorkload(allAssignees);
const workloadComparison = workload - teamAvgWorkload; // +/- difference
```

**4. Snap History Analysis**:
```typescript
const totalSnaps = snaps.length;
const sprintDays = getSprintDaysSoFar(sprint);
const snapsPerDay = totalSnaps / sprintDays;

// Consistency Score (% of days with at least 1 snap)
const daysWithSnaps = new Set(snaps.map(s => s.snapDate)).size;
const consistencyScore = (daysWithSnaps / sprintDays) * 100;

// Days Without Snaps
const allSprintDays = getAllSprintDays(sprint);
const daysWithSnapsSet = new Set(snaps.map(s => s.snapDate));
const daysWithoutSnaps = allSprintDays.filter(day => !daysWithSnapsSet.has(day));
```

**5. Blocker Frequency**:
```typescript
const snapsWithBlockers = snaps.filter(s => s.blockers && s.blockers.trim() !== '');
const blockerRate = totalSnaps > 0
  ? (snapsWithBlockers.length / totalSnaps) * 100
  : 0;

const totalBlockers = snapsWithBlockers.length;
```

**UI Update**:
1. Display all 6 widgets with calculated metrics
2. Render charts (RAG distribution pie chart)
3. Show active cards table
4. Display snap timeline calendar

**Performance Indicators**:
- **High Performer**: Completion rate > 90%, low blocker rate, consistent snaps
- **At Risk**: High RED card count, high blocker rate, low snap consistency
- **Overloaded**: Workload > 100%, many active cards

---

##### Action 2: View Snap History Timeline

**What happens**: Calendar view showing all days with snaps

**Frontend**:
1. Fetch all snaps for assignee in current sprint
2. Render calendar grid
3. Mark days with snaps vs days without

**UI Components**:
- Monthly calendar grid
- Days with snaps: Green fill with snap count badge
- Days without snaps: Red border (if expected)
- Weekends: Gray background
- Click on day to view snap details

**Visual Representation**:
```
     December 2025
Su Mo Tu We Th Fr Sa
                 1  2
 3  4  5  6  7  8  9
10 11 12 13 14 15 16
17 [2][3][1][2][0]23  ← Sprint week
24 [1][2][3][1][2]30  ← Numbers = snap count
31

[2] = Green (2 snaps)
[0] = Red (no snaps, expected)
Gray = Weekend or outside sprint
```

**Business Value**:
- Identify assignees who consistently update vs those who don't
- Spot patterns (no snaps on Mondays, etc.)
- Coaching opportunity for low-frequency updaters

---

### Screen 8: Team Workload Distribution View
**Route**: `/projects/:projectId/workload`
**Access**: Requires `VIEW_TEAM_MEMBER` permission

#### UI Components
- **Page Header**: "Workload Distribution"
- **Horizontal Bar Chart**: Each bar = assignee, length = workload %
- **Color Coding**:
  - Red: > 100% (overloaded)
  - Amber: 80-100% (at capacity)
  - Green: 50-80% (balanced)
  - Blue: < 50% (underutilized)
- **Assignee Cards**: Grid of cards showing:
  - Name
  - Workload %
  - Active Cards Count
  - Total Hours (ET)
  - Actions: View Details, Reassign Cards
- **Load Balancing Insights**:
  - Average workload
  - Standard deviation
  - Suggestions (e.g., "Consider reassigning 2 cards from John to Sarah")

#### User Actions

##### Action 1: View Workload Distribution

**What happens**: Visual comparison of team workload

**Frontend**:
1. Fetch all assignees and their cards
2. Calculate workload for each
3. Render horizontal bar chart
4. Show statistics

**Calculations** (same as above):
```typescript
const workloadData = assignees.map(assignee => {
  const activeCards = cards.filter(c =>
    c.assignee?.id === assignee.id &&
    c.status !== 'completed' &&
    c.status !== 'closed'
  );

  const totalET = activeCards.reduce((sum, c) => sum + c.estimatedTime, 0);
  const availableHours = sprintDaysRemaining * 6;
  const workload = (totalET / availableHours) * 100;

  return {
    assignee: assignee.fullName,
    workload: Math.round(workload),
    activeCards: activeCards.length,
    totalHours: totalET,
  };
});

// Statistics
const avgWorkload = workloadData.reduce((sum, d) => sum + d.workload, 0) / workloadData.length;
const stdDev = calculateStandardDeviation(workloadData.map(d => d.workload));

// Identify imbalances
const overloaded = workloadData.filter(d => d.workload > 100);
const underutilized = workloadData.filter(d => d.workload < 50);
```

**UI Update**:
1. Render horizontal bar chart sorted by workload (descending)
2. Display avg workload line
3. Show overloaded and underutilized assignees
4. Provide actionable insights

**Load Balancing Insights**:
```
"Team is unbalanced. 2 members are overloaded (>100%)."
"Consider reassigning 1-2 cards from John (120%) to Sarah (40%)."
"Mike is underutilized at 35%. Assign more cards to optimize capacity."
```

**Business Value**:
- Prevent burnout (identify overloaded members)
- Optimize resource utilization
- Proactive load balancing

---

## Complete User Journeys

### Journey 1: Onboard New Team Member and Assign to Project

**Actors**: Scrum Master

**Preconditions**:
- User is logged in with `ADD_TEAM_MEMBER` and `EDIT_PROJECT` permissions
- Project exists

**Steps**:
1. Navigate to Team Members page (`/team-members`)
2. Click "Add Team Member" button
3. Fill in form:
   - Full Name: "Alice Johnson"
   - Display Name: "Alice"
   - Designation: "Frontend Developer"
4. Click "Add Team Member"
5. Success toast: "Team member added successfully"
6. Navigate to Project Details page for "Project Alpha"
7. Go to "Team" tab
8. Click "Add Team Members" button
9. Modal shows available team members
10. Select "Alice Johnson" from list
11. Click "Add to Project"
12. Success toast: "1 team member added"
13. Alice now appears in project team list
14. Navigate to "Create Card" page
15. Assignee dropdown now includes Alice
16. Select Alice as assignee for a new card
17. Card created and assigned to Alice

**Expected Outcome**: New team member added to global pool, assigned to project, and available for card assignment

---

### Journey 2: Monitor Assignee Performance and Intervene

**Actors**: Scrum Master, Product Owner

**Preconditions**:
- Active sprint exists
- Assignees have cards assigned
- Snaps have been created

**Steps**:
1. Navigate to Dashboard
2. Notice "Team Workload" widget shows John at 150% (RED)
3. Click on John's name to view details
4. Assignee Details page loads
5. See metrics:
   - 8 Active Cards
   - 3 RED, 2 AMBER, 3 GREEN
   - Workload: 150%
   - Blocker Rate: 40% (high)
   - Consistency Score: 60% (gaps in snap updates)
6. Identify issues:
   - Overloaded with too many cards
   - High blocker rate indicates impediments
   - Inconsistent snap updates
7. Navigate to "Workload Distribution" page
8. See Sarah at 40% workload (underutilized)
9. Decision: Reassign 2 cards from John to Sarah
10. Go to John's active cards
11. Select 2 cards (lowest priority)
12. Edit card assignee to Sarah
13. Return to Workload Distribution
14. John now at 100%, Sarah at 60% (balanced)
15. Schedule 1-on-1 with John to discuss blockers
16. Check snap timeline to identify days without updates
17. Encourage daily snap submissions

**Expected Outcome**: Workload balanced, assignee performance improved, actionable insights gained

---

## API Endpoints Summary

### Team Member Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/api/team-members` | `VIEW_TEAM_MEMBER` | Get all team members |
| `GET` | `/api/team-members/:id` | `VIEW_TEAM_MEMBER` | Get team member by ID |
| `POST` | `/api/team-members` | `ADD_TEAM_MEMBER` | Create team member |
| `PATCH` | `/api/team-members/:id` | `EDIT_TEAM_MEMBER` | Update team member |
| `DELETE` | `/api/team-members/:id` | `REMOVE_TEAM_MEMBER` | Delete team member |

### Project Team Assignment Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/api/projects/:id/team` | `VIEW_PROJECT` | Get team for project |
| `GET` | `/api/projects/:id/team/available` | `VIEW_PROJECT` | Get unassigned team members |
| `POST` | `/api/projects/:id/team` | `EDIT_PROJECT` | Add team members to project |
| `DELETE` | `/api/projects/:id/team/:memberId` | `EDIT_PROJECT` | Remove member from project |

---

## Permissions & RBAC

| Action | Permission | Scrum Master | Product Owner | PMO |
|--------|------------|--------------|---------------|-----|
| View team members | `VIEW_TEAM_MEMBER` | Yes | Yes | Yes |
| Create team member | `ADD_TEAM_MEMBER` | Yes | Yes | No |
| Edit team member | `EDIT_TEAM_MEMBER` | Yes | Yes | No |
| Delete team member | `REMOVE_TEAM_MEMBER` | Yes | Yes | No |
| Assign to project | `EDIT_PROJECT` | Yes | Yes | No |
| Remove from project | `EDIT_PROJECT` | Yes | Yes | No |
| View assignee metrics | `VIEW_TEAM_MEMBER` | Yes | Yes | Yes |

---

## Business Rules

### Team Member Pool Rules
1. **Global Pool**: Team members exist in global pool, shared across projects
2. **Multi-Project Assignment**: One team member can be assigned to multiple projects
3. **No Duplicate Names**: Not enforced by DB, but should warn user
4. **Designation Required**: Must select from predefined enum

### Project Assignment Rules
1. **No Duplicates**: Cannot assign same team member to project twice
2. **Archived Projects**: Cannot modify team in archived projects
3. **Card Assignment Check**: Should prevent removal if assigned to active cards
4. **Special Roles**: PO, PMO, SM are NOT in team_members table (they're Users)

### Workload Calculation Rules
1. **Formula**: `(Total ET of Active Cards ÷ Available Hours) × 100`
2. **Available Hours**: `Sprint Days Remaining × 6 hours/day`
3. **Active Cards**: Status = NOT_STARTED or IN_PROGRESS
4. **Thresholds**:
   - Overloaded: > 100%
   - At Capacity: 80-100%
   - Balanced: 50-80%
   - Underutilized: < 50%

### RAG Calculation Rules (Assignee-Level)
1. **Worst-Case Algorithm**:
   - If ANY active card is RED → Assignee is RED
   - Else if ANY active card is AMBER → Assignee is AMBER
   - Else → Assignee is GREEN
2. **Ignores Completed Cards**: Only considers active cards

---

## Common Issues & Solutions

### Issue 1: Cannot Delete Team Member - Assigned to Cards
**Symptoms**: Delete fails with error "Cannot delete team member"
**Root Cause**: Team member assigned to active cards
**Solution**:
- Query cards: `SELECT * FROM cards WHERE assignee_id = ?`
- Reassign cards to another team member
- Then delete team member

**Prevention**: Implement validation to check card assignments before delete

---

### Issue 2: Workload Shows 0% for Assignee with Cards
**Symptoms**: Assignee has active cards but workload shows 0%
**Root Cause**: Cards have `estimatedTime = 0` or null
**Solution**:
- Check cards: `SELECT * FROM cards WHERE assignee_id = ? AND estimated_time IS NULL`
- Update cards with proper ET values
- ET is MANDATORY for RAG calculation

**Prevention**: Enforce ET validation when creating cards

---

### Issue 3: Assignee RAG is GREEN but Has RED Cards
**Symptoms**: Assignee shows GREEN overall RAG but has RED cards
**Root Cause**: Calculation not using worst-case algorithm
**Solution**:
- Review RAG calculation logic
- Ensure checking ALL active cards
- Fix: If ANY card is RED, assignee must be RED

**Prevention**: Test RAG calculation with unit tests

---

**End of Team & Assignees Documentation**
