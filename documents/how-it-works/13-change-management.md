# Change Management - How It Works

## Overview
- **Purpose**: Manage and track project change requests through a formal approval and implementation workflow
- **Key Features**: Change request CRUD, multi-stage approval workflow, impact assessment, priority classification, rollback planning, testing requirements, CSV export
- **Change Types**: MINOR | MAJOR | EMERGENCY | STANDARD
- **Priority Levels**: LOW | MEDIUM | HIGH | CRITICAL
- **Status Workflow**: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → IN_PROGRESS → IMPLEMENTED → CLOSED
- **Approval Process**: Formal approval with comments and rejection reasons

## Database Schema

### Table: `changes`
Stores change requests with full lifecycle tracking.

```sql
CREATE TABLE changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),

  -- Basic Information
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Classification
  change_type VARCHAR(20) DEFAULT 'STANDARD' CHECK (change_type IN (
    'MINOR',      -- Small, low-risk changes
    'MAJOR',      -- Significant changes requiring full approval
    'EMERGENCY',  -- Urgent fixes, expedited process
    'STANDARD'    -- Normal changes through standard process
  )),

  priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN (
    'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  )),

  -- Status Workflow
  status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT',              -- Initial creation, not yet submitted
    'PENDING_APPROVAL',   -- Submitted, awaiting approval
    'APPROVED',           -- Approved for implementation
    'REJECTED',           -- Rejected, will not implement
    'IN_PROGRESS',        -- Approved and implementation started
    'IMPLEMENTED',        -- Implementation complete, testing may be ongoing
    'CLOSED'              -- Fully complete and verified
  )),

  -- Impact Assessment
  impact_assessment TEXT,  -- Assessment of scope, schedule, cost, quality impacts
  rollback_plan TEXT,      -- Plan to revert if implementation fails
  testing_requirements TEXT,  -- Testing needed to verify change
  affected_systems TEXT[],    -- Array of affected systems/modules

  -- Implementation Planning
  implementation_date DATE,  -- Target or actual implementation date
  implementation_window VARCHAR(100),  -- e.g., "Saturday 2-6am maintenance window"

  -- People
  requestor_id UUID REFERENCES team_members(id),  -- Who requested the change
  approver_id UUID REFERENCES team_members(id),   -- Who approved/rejected

  -- Approval/Rejection
  rejection_reason TEXT,      -- Why change was rejected (if applicable)
  approved_date TIMESTAMP,    -- When approved (auto-set)
  implemented_date TIMESTAMP, -- When implementation completed (auto-set)

  -- Archive
  is_archived BOOLEAN DEFAULT FALSE,
  archived_date TIMESTAMP,

  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  created_by_id VARCHAR(255) NOT NULL,  -- Duplicate for query optimization
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_by_id VARCHAR(255) NOT NULL,  -- Duplicate for query optimization
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_changes_project ON changes(project_id);
CREATE INDEX idx_changes_status ON changes(status);
CREATE INDEX idx_changes_type ON changes(change_type);
CREATE INDEX idx_changes_priority ON changes(priority);
CREATE INDEX idx_changes_archived ON changes(is_archived);
CREATE INDEX idx_changes_requestor ON changes(requestor_id);
CREATE INDEX idx_changes_approver ON changes(approver_id);
```

**File**: `F:\StandupSnap\backend\src\entities\change.entity.ts`

## Change Types

### MINOR
- **Definition**: Small, low-risk changes with minimal impact
- **Examples**: UI text changes, documentation updates, minor bug fixes
- **Approval**: May use simplified approval process
- **Testing**: Basic smoke testing sufficient

### MAJOR
- **Definition**: Significant changes affecting core functionality or architecture
- **Examples**: Database schema changes, API modifications, feature additions
- **Approval**: Full formal approval required
- **Testing**: Comprehensive testing including regression

### EMERGENCY
- **Definition**: Urgent fixes required to resolve critical issues
- **Examples**: Security patches, production outages, data corruption fixes
- **Approval**: Expedited approval process (may be post-implementation)
- **Testing**: Minimal testing, focus on fix verification

### STANDARD
- **Definition**: Normal changes following standard change management process
- **Examples**: Regular feature enhancements, scheduled updates
- **Approval**: Standard approval workflow
- **Testing**: Standard testing procedures

## Priority Levels

### LOW
- **Impact**: Minimal business impact
- **Urgency**: Can wait for next scheduled release
- **Examples**: Nice-to-have features, cosmetic improvements

### MEDIUM
- **Impact**: Moderate business value
- **Urgency**: Should be included in upcoming release
- **Examples**: Feature enhancements, performance improvements

### HIGH
- **Impact**: Significant business value or risk mitigation
- **Urgency**: Should be prioritized in current sprint
- **Examples**: Important features, security improvements

### CRITICAL
- **Impact**: Business-critical, immediate action required
- **Urgency**: Must be addressed ASAP
- **Examples**: Production defects, security vulnerabilities, compliance issues

## Status Workflow

### DRAFT
- **State**: Initial creation, work in progress
- **Actions**: Can be edited, deleted
- **Next Steps**: Submit for approval → PENDING_APPROVAL

### PENDING_APPROVAL
- **State**: Submitted to approver, awaiting decision
- **Actions**: Can be approved or rejected
- **Next Steps**:
  - Approve → APPROVED
  - Reject → REJECTED

### APPROVED
- **State**: Approved for implementation, not yet started
- **Actions**: Auto-sets `approved_date`, can start implementation
- **Next Steps**: Begin work → IN_PROGRESS

### REJECTED
- **State**: Not approved, will not be implemented
- **Actions**: Requires `rejection_reason`, can be archived
- **Next Steps**: Close → CLOSED or Archive

### IN_PROGRESS
- **State**: Implementation work underway
- **Actions**: Can update progress
- **Next Steps**: Complete implementation → IMPLEMENTED

### IMPLEMENTED
- **State**: Implementation complete, may be in testing/verification
- **Actions**: Auto-sets `implemented_date`
- **Next Steps**: Verify and close → CLOSED

### CLOSED
- **State**: Fully complete and verified
- **Actions**: Can be archived
- **Next Steps**: Archive for historical record

---

## Screens & Pages

### Screen 1: Changes List
**Route**: `/projects/:projectId/artifacts/changes`
**Access**: Authenticated users with project access
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\ChangesPage.tsx`

#### UI Components
- **Header Section**:
  - Project breadcrumb navigation
  - "+ New Change Request" button (top-right)
  - "Export to CSV" button
  - Filter bar

- **Filter Bar**:
  - Status dropdown (All | DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | IN_PROGRESS | IMPLEMENTED | CLOSED)
  - Change Type dropdown (All | MINOR | MAJOR | EMERGENCY | STANDARD)
  - Priority dropdown (All | LOW | MEDIUM | HIGH | CRITICAL)
  - "Include Archived" checkbox
  - Date range filter (implementation date)
  - Search bar (searches title, description)
  - "Clear Filters" button

- **Change Request Cards**:
  - ID badge
  - Title
  - Change type badge
  - Priority badge (color-coded: LOW=green, MEDIUM=yellow, HIGH=orange, CRITICAL=red)
  - Status badge with color coding:
    - DRAFT: gray
    - PENDING_APPROVAL: blue
    - APPROVED: green
    - REJECTED: red
    - IN_PROGRESS: yellow
    - IMPLEMENTED: light green
    - CLOSED: dark gray
  - Requestor name & avatar
  - Approver name (if set)
  - Implementation date
  - Created date
  - "View Details" button
  - "Archive" icon (if CLOSED or IMPLEMENTED)

- **Empty State**: "No change requests found. Create your first change request to get started."

#### User Actions

##### Action 1: User Loads Changes for Project

**API Call**:
```http
GET /api/artifacts/changes/project/:projectId?includeArchived=false
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\change.controller.ts` (inferred, based on pattern)
- **Service**: `F:\StandupSnap\backend\src\artifacts\change.service.ts` - `findByProject()`

**Backend Flow**:
1. **Build Query**:
   ```typescript
   const query = this.changeRepo
     .createQueryBuilder('change')
     .leftJoinAndSelect('change.project', 'project')
     .leftJoinAndSelect('change.requestor', 'requestor')
     .leftJoinAndSelect('change.approver', 'approver')
     .leftJoinAndSelect('change.createdBy', 'createdBy')
     .leftJoinAndSelect('change.updatedBy', 'updatedBy')
     .where('change.projectId = :projectId', { projectId });
   ```

2. **Apply Filters**:
   ```typescript
   if (!includeArchived) {
     query.andWhere('change.isArchived = :isArchived', { isArchived: false });
   }
   ```

3. **Order Results**:
   ```typescript
   query.orderBy('change.createdAt', 'DESC');
   ```

**SQL Query**:
```sql
SELECT c.*,
       r.id as requestor_id, r.full_name as requestor_name,
       a.id as approver_id, a.full_name as approver_name,
       cb.name as created_by_name,
       ub.name as updated_by_name
FROM changes c
LEFT JOIN team_members r ON c.requestor_id = r.id
LEFT JOIN team_members a ON c.approver_id = a.id
LEFT JOIN users cb ON c.created_by = cb.id
LEFT JOIN users ub ON c.updated_by = ub.id
WHERE c.project_id = ?
  AND c.is_archived = FALSE
ORDER BY c.created_at DESC;
```

**Response**:
```json
[
  {
    "id": "uuid",
    "project": { "id": "uuid" },
    "title": "Add OAuth 2.0 authentication",
    "description": "Replace basic auth with OAuth 2.0 to improve security and enable SSO",
    "changeType": "MAJOR",
    "priority": "HIGH",
    "status": "PENDING_APPROVAL",
    "impactAssessment": "Scope: New auth module + frontend changes. Schedule: +2 weeks for implementation and testing. Cost: $15k (contractor for SSO integration). Quality: Improved security, better UX.",
    "rollbackPlan": "1. Revert to previous auth endpoints. 2. Restore database state from pre-deployment backup. 3. Clear OAuth tokens from cache. 4. Notify users of rollback via email.",
    "testingRequirements": "1. Unit tests for OAuth flow. 2. Integration tests with SSO providers. 3. Security audit. 4. Load testing with 10k concurrent users. 5. User acceptance testing.",
    "affectedSystems": ["Authentication Service", "Frontend App", "User Database"],
    "implementationDate": "2025-02-15",
    "implementationWindow": "Saturday 2am-6am maintenance window",
    "requestor": { "id": "uuid", "fullName": "Security Lead" },
    "approver": null,
    "rejectionReason": null,
    "approvedDate": null,
    "implementedDate": null,
    "isArchived": false,
    "archivedDate": null,
    "createdBy": { "id": "uuid", "name": "Security Lead" },
    "updatedBy": { "id": "uuid", "name": "Security Lead" },
    "createdAt": "2025-01-10T09:00:00Z",
    "updatedAt": "2025-01-10T09:00:00Z"
  }
]
```

**UI Update**: Render change request cards

##### Action 2: User Creates a New Change Request

**Frontend**:
1. User clicks "+ New Change Request" button
2. Multi-step form modal opens:

   **Step 1: Basic Information**
   - Title (required, max 255 chars)
   - Description (required, textarea)
   - Change Type: MINOR | MAJOR | EMERGENCY | STANDARD (radio buttons)
   - Priority: LOW | MEDIUM | HIGH | CRITICAL (dropdown)

   **Step 2: Impact Assessment**
   - Impact Assessment (textarea) - Describe scope, schedule, cost, quality impacts
   - Affected Systems (multi-select chips) - Add affected modules/services
   - Rollback Plan (textarea) - Steps to revert if needed
   - Testing Requirements (textarea) - Testing needed to verify

   **Step 3: Implementation Planning**
   - Implementation Date (date picker)
   - Implementation Window (text input) - e.g., "Saturday 2-6am"
   - Requestor (team member dropdown, defaults to current user)
   - Approver (team member dropdown, optional)

   **Step 4: Review & Submit**
   - Summary of all entered data
   - "Save as Draft" button (status: DRAFT)
   - "Submit for Approval" button (status: PENDING_APPROVAL)

3. User clicks "Submit for Approval"

**API Call**:
```http
POST /api/artifacts/changes
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "projectId": "uuid",
  "title": "Add OAuth 2.0 authentication",
  "description": "Replace basic auth with OAuth 2.0...",
  "changeType": "MAJOR",
  "priority": "HIGH",
  "status": "PENDING_APPROVAL",
  "impactAssessment": "Scope: New auth module...",
  "rollbackPlan": "1. Revert to previous auth endpoints...",
  "testingRequirements": "1. Unit tests for OAuth flow...",
  "affectedSystems": ["Authentication Service", "Frontend App", "User Database"],
  "implementationDate": "2025-02-15",
  "implementationWindow": "Saturday 2am-6am maintenance window",
  "requestorId": "tm-uuid",
  "approverId": "tm-uuid"
}
```

**Backend**:
- **Service**: `F:\StandupSnap\backend\src\artifacts\change.service.ts` - `create()`

**Backend Flow**:
1. **Validate Project**:
   ```sql
   SELECT * FROM projects WHERE id = ?;
   ```
   - If not found: throw `NotFoundException('Project not found')`

2. **Validate Requestor** (if provided):
   ```sql
   SELECT * FROM team_members WHERE id = ?;
   ```
   - If not found: throw `NotFoundException('Requestor not found')`
   - If `requestorId.startsWith('user-')`: throw `BadRequestException('Requestor must be a team member, not a user role')`

3. **Validate Approver** (if provided):
   - Same validation as requestor

4. **Create Change**:
   ```sql
   INSERT INTO changes (
     project_id, title, description, change_type, priority, status,
     impact_assessment, rollback_plan, testing_requirements, affected_systems,
     implementation_date, implementation_window,
     requestor_id, approver_id,
     created_by, created_by_id, updated_by, updated_by_id
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   RETURNING *;
   ```

**Response**: Created change object (see Action 1 response)

**UI Update**:
1. Close modal
2. Add change to list (top of list)
3. Show success toast: "Change request submitted for approval"
4. If status is PENDING_APPROVAL, notify approver (if set)

##### Action 3: User Exports Changes to CSV

**API Call**:
```http
GET /api/artifacts/changes/project/:projectId/export
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `F:\StandupSnap\backend\src\artifacts\change.service.ts` - `exportCsv()`

**Backend Flow**:
1. **Get Changes**: Call `findByProject()` with filters

2. **Build CSV**:
   ```typescript
   const headers = [
     'ID', 'Title', 'Type', 'Priority', 'Status',
     'Requestor', 'Approver', 'Implementation Date',
     'Created At', 'Updated At'
   ];

   const rows = changes.map((change) => [
     change.id,
     `"${change.title.replace(/"/g, '""')}"`,  // Escape quotes
     change.changeType,
     change.priority,
     change.status,
     change.requestor ? change.requestor.fullName || change.requestor.displayName : 'N/A',
     change.approver ? change.approver.fullName || change.approver.displayName : 'N/A',
     change.implementationDate ? new Date(change.implementationDate).toISOString().split('T')[0] : 'N/A',
     new Date(change.createdAt).toISOString(),
     new Date(change.updatedAt).toISOString(),
   ]);

   return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
   ```

**Response**: CSV file download

**UI Update**: Browser downloads `changes-{date}.csv`

---

### Screen 2: Change Request Details & Approval
**Route**: `/projects/:projectId/artifacts/changes/:changeId`
**Access**: Authenticated users with project access
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\ChangeDetailsPage.tsx`

#### UI Components
- **Header Section**:
  - Change ID badge
  - Title (editable if DRAFT)
  - Change type badge
  - Priority badge
  - Status badge
  - "Back to List" button
  - **Action Buttons** (context-sensitive):
    - If DRAFT: "Submit for Approval", "Delete"
    - If PENDING_APPROVAL: "Approve", "Reject" (approver only)
    - If APPROVED: "Start Implementation"
    - If IN_PROGRESS: "Mark as Implemented"
    - If IMPLEMENTED: "Close"
    - If CLOSED/IMPLEMENTED: "Archive"

- **Tabs**:
  - **Details** (default)
  - **Approval Workflow**

- **Details Tab - Sections**:

  1. **Basic Information** (editable if DRAFT):
     - Title
     - Description
     - Change Type
     - Priority

  2. **Impact Assessment** (editable if DRAFT):
     - Impact Assessment (textarea)
     - Affected Systems (tags)
     - Rollback Plan (textarea)
     - Testing Requirements (textarea)

  3. **Implementation Planning** (editable if DRAFT or APPROVED):
     - Implementation Date
     - Implementation Window
     - Requestor
     - Approver

  4. **Approval Information** (read-only):
     - Approved By (if approved)
     - Approved Date (if approved)
     - Rejection Reason (if rejected)

  5. **Implementation Tracking** (read-only):
     - Implemented Date (auto-set)
     - Status History

  6. **Audit Information** (read-only):
     - Created by & date
     - Last updated by & date

- **Approval Workflow Tab**:
  - Visual workflow diagram showing status progression
  - Timeline of status changes
  - Comments/notes at each stage

#### User Actions

##### Action 1: User Loads Change Details

**API Call**:
```http
GET /api/artifacts/changes/:id
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `F:\StandupSnap\backend\src\artifacts\change.service.ts` - `findOne()`

**Query**:
```sql
SELECT c.*,
       r.id as requestor_id, r.full_name as requestor_name,
       a.id as approver_id, a.full_name as approver_name,
       cb.name as created_by_name,
       ub.name as updated_by_name
FROM changes c
LEFT JOIN team_members r ON c.requestor_id = r.id
LEFT JOIN team_members a ON c.approver_id = a.id
LEFT JOIN users cb ON c.created_by = cb.id
LEFT JOIN users ub ON c.updated_by = ub.id
WHERE c.id = ?
  AND c.is_archived = FALSE;
```

**Response**: Change object (see Screen 1, Action 1)

**UI Update**: Render change details form

##### Action 2: Approver Approves Change

**Frontend**:
1. User (approver) reviews change details
2. User clicks "Approve" button
3. Confirmation modal: "Approve this change request?"
4. User confirms

**API Call**:
```http
PUT /api/artifacts/changes/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "APPROVED",
  "approverId": "current-user-id"
}
```

**Backend**:
- **Service**: `F:\StandupSnap\backend\src\artifacts\change.service.ts` - `update()`

**Backend Flow**:
1. **Load Change**:
   ```sql
   SELECT * FROM changes WHERE id = ? AND is_archived = FALSE;
   ```
   - If not found: throw `NotFoundException('Change not found')`

2. **Check Current Status**: Must be PENDING_APPROVAL

3. **Validate Approver**:
   - Same validation as requestor

4. **Update Change**:
   ```typescript
   const oldStatus = change.status;
   if (dto.status !== undefined && dto.status !== oldStatus) {
     change.status = dto.status;

     // Auto-set approved date when status becomes APPROVED
     if (dto.status === ChangeStatus.APPROVED && oldStatus !== ChangeStatus.APPROVED) {
       change.approvedDate = new Date();
     }
   }

   if (dto.approverId !== undefined) {
     const approver = await this.teamMemberRepo.findOne({ where: { id: dto.approverId } });
     if (!approver) {
       throw new NotFoundException('Approver not found');
     }
     if (approver.id.startsWith('user-')) {
       throw new BadRequestException('Approver must be a team member');
     }
     change.approver = approver;
   }

   change.updatedBy = { id: userId } as User;
   ```

   ```sql
   UPDATE changes
   SET status = 'APPROVED',
       approver_id = ?,
       approved_date = NOW(),
       updated_by = ?,
       updated_at = NOW()
   WHERE id = ?;
   ```

**Response**: Updated change object

**UI Update**:
1. Status badge changes to APPROVED (green)
2. Show success toast: "Change request approved"
3. "Approve" button replaced with "Start Implementation" button
4. Approval information section populated

##### Action 3: Approver Rejects Change

**Frontend**:
1. User (approver) clicks "Reject" button
2. Modal opens with rejection reason textarea (required)
3. User enters reason: "Security concerns not adequately addressed. Please provide detailed security audit."
4. User clicks "Reject"

**API Call**:
```http
PUT /api/artifacts/changes/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "REJECTED",
  "approverId": "current-user-id",
  "rejectionReason": "Security concerns not adequately addressed. Please provide detailed security audit."
}
```

**Backend Flow**:
1. **Validate Rejection Reason**: Required when status is REJECTED

2. **Update Change**:
   ```sql
   UPDATE changes
   SET status = 'REJECTED',
       approver_id = ?,
       rejection_reason = ?,
       updated_by = ?,
       updated_at = NOW()
   WHERE id = ?;
   ```

**Response**: Updated change object

**UI Update**:
1. Status badge changes to REJECTED (red)
2. Show error toast: "Change request rejected"
3. Rejection reason displayed prominently
4. Action buttons change to "Close" or "Archive"

##### Action 4: User Starts Implementation

**Frontend**:
1. User (with APPROVED change) clicks "Start Implementation" button
2. Confirmation modal: "Begin implementation? This will change status to In Progress."
3. User confirms

**API Call**:
```http
PUT /api/artifacts/changes/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "IN_PROGRESS"
}
```

**Backend Flow**:
1. **Check Current Status**: Must be APPROVED

2. **Update Status**:
   ```sql
   UPDATE changes
   SET status = 'IN_PROGRESS',
       updated_by = ?,
       updated_at = NOW()
   WHERE id = ?;
   ```

**Response**: Updated change object

**UI Update**:
1. Status badge changes to IN_PROGRESS (yellow)
2. Show success toast: "Implementation started"
3. Action button changes to "Mark as Implemented"

##### Action 5: User Marks Change as Implemented

**Frontend**:
1. User (with IN_PROGRESS change) clicks "Mark as Implemented" button
2. Confirmation modal: "Mark this change as implemented? Ensure all testing is complete."
3. User confirms

**API Call**:
```http
PUT /api/artifacts/changes/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "IMPLEMENTED"
}
```

**Backend Flow**:
1. **Check Current Status**: Must be IN_PROGRESS

2. **Update Status with Auto-Date**:
   ```typescript
   const oldStatus = change.status;
   if (dto.status === ChangeStatus.IMPLEMENTED && oldStatus !== ChangeStatus.IMPLEMENTED) {
     change.implementedDate = new Date();
   }
   ```

   ```sql
   UPDATE changes
   SET status = 'IMPLEMENTED',
       implemented_date = NOW(),
       updated_by = ?,
       updated_at = NOW()
   WHERE id = ?;
   ```

**Response**: Updated change object

**UI Update**:
1. Status badge changes to IMPLEMENTED (light green)
2. Show success toast: "Change marked as implemented"
3. Implemented date populated
4. Action button changes to "Close"

##### Action 6: User Closes Change

**Frontend**:
1. User (with IMPLEMENTED change) clicks "Close" button
2. Confirmation modal: "Close this change request? This marks it as fully complete."
3. User confirms

**API Call**:
```http
PUT /api/artifacts/changes/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "CLOSED"
}
```

**Backend Flow**:
```sql
UPDATE changes
SET status = 'CLOSED',
    updated_by = ?,
    updated_at = NOW()
WHERE id = ?;
```

**Response**: Updated change object

**UI Update**:
1. Status badge changes to CLOSED (dark gray)
2. Show success toast: "Change request closed"
3. Action button changes to "Archive"

##### Action 7: User Archives Change

**Frontend**:
1. User (with CLOSED or IMPLEMENTED change) clicks "Archive" button
2. Confirmation modal: "Archive this change? It will be hidden from the active list."
3. User confirms

**API Call**:
```http
PATCH /api/artifacts/changes/:id/archive
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `F:\StandupSnap\backend\src\artifacts\change.service.ts` - `archive()`

**Backend Flow**:
1. **Validate Status**:
   ```typescript
   if (change.status !== ChangeStatus.CLOSED && change.status !== ChangeStatus.IMPLEMENTED) {
     throw new BadRequestException('Only CLOSED or IMPLEMENTED changes can be archived');
   }
   ```

2. **Archive Change**:
   ```sql
   UPDATE changes
   SET is_archived = TRUE,
       archived_date = NOW(),
       updated_by = ?
   WHERE id = ?;
   ```

**Response**: Updated change object

**UI Update**:
1. Show success toast: "Change archived"
2. Navigate back to changes list
3. Change no longer appears unless "Include Archived" is checked

---

## Business Rules

### BR-01: Project Association
**Rule**: Every change must belong to an existing project
**Enforcement**: Foreign key constraint + backend validation
**Error**: "Project with ID {id} not found"

### BR-02: Requestor/Approver Must Be Team Members
**Rule**: Requestor and approver must be regular team members (not user-{id})
**Enforcement**: Backend validation in create() and update()
**Error**: "Requestor must be a team member, not a user role" / "Approver must be a team member, not a user role"

### BR-03: Auto-Set Approved Date
**Rule**: When status changes to APPROVED, auto-set `approved_date` to current timestamp
**Enforcement**: Automatic in update()
**Field**: `approved_date`

### BR-04: Auto-Set Implemented Date
**Rule**: When status changes to IMPLEMENTED, auto-set `implemented_date` to current timestamp
**Enforcement**: Automatic in update()
**Field**: `implemented_date`

### BR-05: Archive Status Restriction
**Rule**: Only CLOSED or IMPLEMENTED changes can be archived
**Enforcement**: Backend validation in archive()
**Error**: "Only CLOSED or IMPLEMENTED changes can be archived"

### BR-06: Status Workflow Enforcement
**Rule**: Status changes should follow logical workflow (not enforced at DB level, but recommended)
**Suggested Flow**: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → IN_PROGRESS → IMPLEMENTED → CLOSED
**Enforcement**: Frontend UI guidance (backend allows any transition)

### BR-07: Rejection Reason Required
**Rule**: When rejecting change, rejection reason should be provided
**Enforcement**: Frontend validation (backend allows empty)
**Field**: `rejection_reason`

### BR-08: Filter Default - Exclude Archived
**Rule**: By default, archived changes are hidden
**Enforcement**: Backend query in findByProject()
**Override**: Set `includeArchived=true` param

---

## Complete User Journeys

### Journey 1: Standard Change Request Lifecycle

**Scenario**: Security team requests OAuth 2.0 implementation

**Week 1** - Create & Submit Change:
1. Security Lead creates change request
2. Fills in details (see Screen 1, Action 2)
3. Submits for approval → Status: PENDING_APPROVAL
4. **API**: `POST /api/artifacts/changes`

**Week 1 (2 days later)** - Approval:
1. Tech Lead (approver) reviews change
2. Assesses impact: 2-week implementation, $15k cost
3. Approves change
4. **API**: `PUT /api/artifacts/changes/:id` (status: APPROVED)
5. Auto-sets `approved_date`

**Week 2** - Start Implementation:
1. Security Lead clicks "Start Implementation"
2. **API**: `PUT /api/artifacts/changes/:id` (status: IN_PROGRESS)
3. Team begins development work

**Week 4** - Complete Implementation:
1. OAuth 2.0 fully implemented and tested
2. Security Lead clicks "Mark as Implemented"
3. **API**: `PUT /api/artifacts/changes/:id` (status: IMPLEMENTED)
4. Auto-sets `implemented_date`

**Week 5** - Verification & Close:
1. QA verifies all testing requirements met
2. Production deployment successful
3. Security Lead clicks "Close"
4. **API**: `PUT /api/artifacts/changes/:id` (status: CLOSED)

**Week 6** - Archive:
1. Security Lead archives change for records
2. **API**: `PATCH /api/artifacts/changes/:id/archive`
3. Change hidden from active list but preserved in database

**Result**: Complete audit trail from request to closure (6 weeks, 7 status transitions)

---

### Journey 2: Emergency Change Request

**Scenario**: Critical security vulnerability discovered in production

**Day 1, 9:00 AM** - Discover Issue:
1. Security monitoring detects SQL injection vulnerability
2. Critical priority, requires immediate fix

**Day 1, 9:30 AM** - Create Emergency Change:
1. Security Lead creates change request:
   - Title: "EMERGENCY: Fix SQL injection in user search"
   - Type: EMERGENCY
   - Priority: CRITICAL
   - Status: PENDING_APPROVAL (expedited)
   - Impact: "High security risk. User data exposure possible."
   - Rollback: "Revert to previous version via blue-green deployment."
   - Testing: "Security scan + smoke testing only. Full testing post-deployment."
2. **API**: `POST /api/artifacts/changes`

**Day 1, 10:00 AM** - Expedited Approval:
1. CTO (approver) reviews urgency
2. Approves immediately (30-minute turnaround)
3. **API**: `PUT /api/artifacts/changes/:id` (status: APPROVED)

**Day 1, 10:15 AM** - Implement Fix:
1. Security Lead starts implementation
2. **API**: `PUT /api/artifacts/changes/:id` (status: IN_PROGRESS)
3. Team applies prepared security patch

**Day 1, 12:00 PM** - Deploy & Verify:
1. Security patch deployed to production
2. Security scan confirms vulnerability fixed
3. Smoke testing passes
4. **API**: `PUT /api/artifacts/changes/:id` (status: IMPLEMENTED)

**Day 2** - Comprehensive Testing:
1. Full regression testing conducted
2. No issues found
3. **API**: `PUT /api/artifacts/changes/:id` (status: CLOSED)

**Result**: Emergency change complete in 3 hours from approval to production, full closure in 1 day

---

### Journey 3: Rejected Change Request

**Scenario**: Feature request rejected due to insufficient justification

**Week 1** - Submit Change:
1. Developer requests new dashboard feature
2. Title: "Add real-time analytics dashboard"
3. Type: MAJOR
4. Priority: MEDIUM
5. Impact: "New module. 3-week implementation. Cost: $20k."
6. **API**: `POST /api/artifacts/changes` (status: PENDING_APPROVAL)

**Week 2** - Review & Reject:
1. Product Manager reviews change
2. Concerns: Cost too high, unclear business value, low user demand
3. Clicks "Reject"
4. Rejection Reason: "Business case not strong enough. User research shows only 5% of users would use this feature. Cost-benefit ratio unfavorable. Please provide: 1) User demand data. 2) Revenue impact analysis. 3) Cost reduction plan. 4) Minimum viable product scope."
5. **API**: `PUT /api/artifacts/changes/:id` (status: REJECTED)

**Result**: Change rejected with clear feedback for resubmission

---

## Integration Points

### Integration 1: Project Module
- **Dependency**: Changes belong to projects
- **Relationship**: Many-to-one
- **Constraint**: Deleting project deletes changes (depends on FK configuration)

### Integration 2: Team Members Module
- **Dependency**: Requestor and approver are team members
- **Relationship**: Many-to-one
- **Validation**: Must be regular team members (not user-{id})

### Integration 3: User Module
- **Dependency**: Audit fields (createdBy, updatedBy)
- **Relationship**: Many-to-one

### Integration 4: Authentication
- **Requirement**: JWT authentication for all endpoints
- **Authorization**: Project access required

---

## Error Handling

### Error 1: Change Not Found
**Trigger**: Invalid change ID
**Response**: 404 `NotFoundException('Change with ID {id} not found')`
**UI**: Error toast, redirect to list

### Error 2: Project Not Found
**Trigger**: Creating change with invalid project ID
**Response**: 404 `NotFoundException('Project with ID {id} not found')`
**UI**: Error toast

### Error 3: Requestor/Approver Not Found
**Trigger**: Setting non-existent requestor/approver
**Response**: 404 `NotFoundException('Requestor/Approver with ID {id} not found')`
**UI**: Error toast

### Error 4: Invalid Requestor/Approver Type
**Trigger**: Using user-{id} for requestor/approver
**Response**: 400 `BadRequestException('Requestor/Approver must be a team member, not a user role')`
**UI**: Error toast

### Error 5: Archive Status Violation
**Trigger**: Archiving change not CLOSED or IMPLEMENTED
**Response**: 400 `BadRequestException('Only CLOSED or IMPLEMENTED changes can be archived')`
**UI**: Error toast, disable archive button

### Error 6: Unauthorized Access
**Trigger**: User not authenticated or no project access
**Response**: 401 `UnauthorizedException('Unauthorized')`
**UI**: Redirect to login

---

## API Endpoint Reference

### POST /api/artifacts/changes (inferred)
**Purpose**: Create new change request
**Auth**: Required (JWT)
**Request Body**: CreateChangeDto
**Response**: Change object

### GET /api/artifacts/changes/project/:projectId (inferred, from service code)
**Purpose**: Get changes for project
**Auth**: Required (JWT)
**Query Params**: `includeArchived` (boolean)
**Response**: Change[]

### GET /api/artifacts/changes/:id (inferred, from service code)
**Purpose**: Get single change details
**Auth**: Required (JWT)
**Response**: Change object

### PUT /api/artifacts/changes/:id (inferred)
**Purpose**: Update change (including status transitions)
**Auth**: Required (JWT)
**Request Body**: UpdateChangeDto (partial fields)
**Response**: Updated Change object

### PATCH /api/artifacts/changes/:id/archive (inferred, from service code)
**Purpose**: Archive change (must be CLOSED or IMPLEMENTED)
**Auth**: Required (JWT)
**Response**: Updated Change object

### GET /api/artifacts/changes/project/:projectId/export (inferred, from service code)
**Purpose**: Export changes to CSV
**Auth**: Required (JWT)
**Response**: CSV file download

---

## File References

### Backend Files
- **Service**: `F:\StandupSnap\backend\src\artifacts\change.service.ts`
- **Entity**: `F:\StandupSnap\backend\src\entities\change.entity.ts`
- **DTOs**:
  - `F:\StandupSnap\backend\src\artifacts\dto\create-change.dto.ts`
  - `F:\StandupSnap\backend\src\artifacts\dto\update-change.dto.ts`

### Frontend Files
- **Pages**: (inferred)
  - `F:\StandupSnap\frontend\src\pages\artifacts\ChangesPage.tsx`
  - `F:\StandupSnap\frontend\src\pages\artifacts\ChangeDetailsPage.tsx`

---

## Summary

The Change Management module provides formal change control capabilities:

1. **Change Request Creation**: Capture change details with impact assessment and planning
2. **Classification**: Type (MINOR/MAJOR/EMERGENCY/STANDARD) and Priority (LOW/MEDIUM/HIGH/CRITICAL)
3. **Status Workflow**: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → IN_PROGRESS → IMPLEMENTED → CLOSED
4. **Approval Process**: Formal approval with approver assignment and rejection reasons
5. **Auto-Dating**: System auto-sets approved_date and implemented_date
6. **Impact Assessment**: Structured evaluation of scope, schedule, cost, quality impacts
7. **Rollback Planning**: Document steps to revert if implementation fails
8. **Testing Requirements**: Define testing needed to verify change
9. **Affected Systems Tracking**: Tag impacted modules/services
10. **CSV Export**: Download change history for reporting
11. **Archive**: Hide closed changes while preserving audit trail

The module enforces business rules around team member validation, status-based archiving, and automatic date stamping while providing a complete audit trail of all change-related activities from request through implementation and closure.
