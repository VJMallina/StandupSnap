# Assumptions, Issues, Decisions (AID) Log - How It Works

## Overview
- **Purpose**: Track and manage project Assumptions, Issues, and Decisions in dedicated logs for transparency and accountability
- **Key Features**: Three separate but related modules (A-I-D), status workflows, owner assignment, filtering, search, CSV export
- **Three Modules**:
  1. **Assumptions**: Things believed to be true but not yet validated
  2. **Issues**: Problems requiring resolution
  3. **Decisions**: Choices made that impact the project
- **Common Patterns**: All three share similar CRUD operations, filtering, archiving, and audit trails

## Database Schema

### Table: `assumptions`
Stores project assumptions requiring validation.

```sql
CREATE TABLE assumptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'VALIDATED', 'INVALIDATED')),
  notes TEXT,  -- Append-only field for updates
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assumptions_project ON assumptions(project_id);
CREATE INDEX idx_assumptions_status ON assumptions(status);
CREATE INDEX idx_assumptions_archived ON assumptions(is_archived);
```

**File**: `F:\StandupSnap\backend\src\entities\assumption.entity.ts`

**Status Workflow**:
- **OPEN**: New assumption, not yet validated
- **VALIDATED**: Confirmed to be true
- **INVALIDATED**: Proven false or no longer applicable

### Table: `issues`
Stores project issues requiring resolution.

```sql
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'MITIGATED', 'CLOSED')),
  owner_id UUID NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  impact_summary TEXT,  -- Description of impact on project
  resolution_plan TEXT,  -- Plan to resolve the issue
  target_resolution_date DATE,
  closure_date TIMESTAMP,  -- Auto-set when status becomes CLOSED
  is_archived BOOLEAN DEFAULT FALSE,
  archived_date TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_issues_project ON issues(project_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_severity ON issues(severity);
CREATE INDEX idx_issues_owner ON issues(owner_id);
CREATE INDEX idx_issues_archived ON issues(is_archived);
```

**File**: `F:\StandupSnap\backend\src\entities\issue.entity.ts`

**Status Workflow**:
- **OPEN**: New issue, not yet addressed
- **MITIGATED**: Temporary solution in place
- **CLOSED**: Permanently resolved

**Severity Levels**:
- **LOW**: Minor inconvenience, low impact
- **MEDIUM**: Moderate impact, workaround available
- **HIGH**: Significant impact, urgent attention needed
- **CRITICAL**: Blocker, immediate resolution required

### Table: `decisions`
Stores project decisions with context and outcomes.

```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,  -- Context and background
  owner_id UUID NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FINALIZED')),
  decision_taken TEXT,  -- The actual decision made
  due_date DATE,  -- Deadline for making decision
  impacted_areas TEXT[],  -- Array: SCHEDULE, SCOPE, COST, RESOURCES
  supporting_notes TEXT,  -- Additional context and rationale
  finalized_date TIMESTAMP,  -- Auto-set when status becomes FINALIZED
  is_archived BOOLEAN DEFAULT FALSE,
  archived_date TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_owner ON decisions(owner_id);
CREATE INDEX idx_decisions_archived ON decisions(is_archived);
```

**File**: `F:\StandupSnap\backend\src\entities\decision.entity.ts`

**Status Workflow**:
- **PENDING**: Decision needed, not yet made
- **FINALIZED**: Decision has been made and documented

**Impacted Areas**:
- **SCHEDULE**: Affects project timeline
- **SCOPE**: Changes what's being delivered
- **COST**: Impacts budget
- **RESOURCES**: Affects team allocation

---

## Common Patterns Across All Three Modules

### Shared Features
1. **CRUD Operations**: Create, Read, Update, Delete
2. **Owner Assignment**: Team member responsible
3. **Status Workflow**: Different states per module
4. **Filtering**: By status, owner, date range, search text
5. **Archiving**: Hide from active list while preserving data
6. **CSV Export**: Download filtered data
7. **Audit Trail**: createdBy, updatedBy, timestamps

### Shared Business Rules
- **Owner Validation**: Must be regular team member (not user-{id})
- **Owner Must Be In Project**: Backend validates team_member_projects
- **Archive Default**: Archived items hidden unless explicitly requested
- **Search**: Case-insensitive search on title and description
- **Date Filtering**: Filter by creation date range
- **Read-Only When Archived**: Cannot modify archived items

---

## Module 1: Assumptions

### Screen: Assumptions List
**Route**: `/projects/:projectId/artifacts/assumptions`
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\AssumptionsPage.tsx`

#### UI Components
- "+ New Assumption" button
- "Export to CSV" button
- **Filters**:
  - Status: All | OPEN | VALIDATED | INVALIDATED
  - Owner dropdown
  - Date range (created)
  - "Include Archived" checkbox
  - Search bar
- **Assumption Cards**:
  - Title
  - Description (truncated)
  - Status badge
  - Owner
  - Created date
  - Notes preview
  - "View/Edit" button
  - "Archive" icon

### API Endpoints: Assumptions

#### GET /api/artifacts/assumptions/project/:projectId
**Purpose**: Get filtered assumptions
**Query Params**:
- `status`: AssumptionStatus (optional)
- `ownerId`: UUID (optional)
- `includeArchived`: boolean (default false)
- `search`: string (optional)
- `startDate`: ISO date (optional)
- `endDate`: ISO date (optional)

**Backend**: `F:\StandupSnap\backend\src\artifacts\assumption.service.ts` - `findByProject()`

**Query**:
```sql
SELECT a.*,
       o.id as owner_id, o.full_name as owner_name,
       cb.name as created_by_name,
       ub.name as updated_by_name
FROM assumptions a
LEFT JOIN team_members o ON a.owner_id = o.id
LEFT JOIN users cb ON a.created_by = cb.id
LEFT JOIN users ub ON a.updated_by = ub.id
WHERE a.project_id = ?
  AND a.is_archived = FALSE
  AND (? IS NULL OR a.status = ?)
  AND (? IS NULL OR a.owner_id = ?)
  AND (? IS NULL OR a.title ILIKE ? OR a.description ILIKE ?)
  AND (? IS NULL OR a.created_at >= ?)
  AND (? IS NULL OR a.created_at <= ?)
ORDER BY a.created_at DESC;
```

**Response**:
```json
[
  {
    "id": "uuid",
    "project": { "id": "uuid" },
    "title": "API supports batch operations",
    "description": "We assume the third-party API supports batch processing for bulk updates",
    "owner": { "id": "uuid", "fullName": "Tech Lead" },
    "status": "OPEN",
    "notes": "Need to verify with vendor documentation",
    "isArchived": false,
    "createdBy": { "id": "uuid", "name": "PM" },
    "updatedBy": { "id": "uuid", "name": "Tech Lead" },
    "createdAt": "2025-01-10T09:00:00Z",
    "updatedAt": "2025-01-12T14:30:00Z"
  }
]
```

#### POST /api/artifacts/assumptions
**Purpose**: Create new assumption
**Request Body**:
```json
{
  "projectId": "uuid",
  "title": "API supports batch operations",
  "description": "We assume the third-party API supports batch processing...",
  "ownerId": "tm-uuid",
  "status": "OPEN",
  "notes": "Need to verify with vendor documentation"
}
```

**Backend**: `assumption.service.ts` - `create()`

**Validation**:
- Project must exist
- Owner must be regular team member (not user-{id})
- Owner must be in project

**Creates**:
```sql
INSERT INTO assumptions (
  project_id, title, description, owner_id, status, notes,
  is_archived, created_by, updated_by
) VALUES (?, ?, ?, ?, ?, ?, FALSE, ?, ?);
```

#### PUT /api/artifacts/assumptions/:id
**Purpose**: Update assumption
**Request Body**: Partial fields (title, description, status, ownerId, notes)

**Backend**: `assumption.service.ts` - `update()`

**Business Rule - Edit Restriction**:
```typescript
if (assumption.status !== AssumptionStatus.OPEN && !assumption.isArchived) {
  throw new BadRequestException('Only assumptions with status "Open" can be edited');
}

if (assumption.isArchived) {
  throw new BadRequestException('Archived assumptions cannot be modified');
}
```

**Notes Append Logic**:
```typescript
if (dto.notes !== undefined && dto.notes) {
  if (assumption.notes) {
    assumption.notes = `${assumption.notes}\n\n${dto.notes}`;
  } else {
    assumption.notes = dto.notes;
  }
}
```

#### PATCH /api/artifacts/assumptions/:id/archive
**Purpose**: Archive assumption

**Backend**: `assumption.service.ts` - `archive()`

```sql
UPDATE assumptions
SET is_archived = TRUE, updated_by = ?, updated_at = NOW()
WHERE id = ?;
```

#### DELETE /api/artifacts/assumptions/:id
**Purpose**: Permanently delete assumption

```sql
DELETE FROM assumptions WHERE id = ?;
```

#### GET /api/artifacts/assumptions/project/:projectId/export
**Purpose**: Export assumptions to CSV

**CSV Headers**:
```
ID, Title, Description, Status, Owner, Notes, Created By, Created At, Updated By, Updated At, Is Archived
```

---

## Module 2: Issues

### Screen: Issues List
**Route**: `/projects/:projectId/artifacts/issues`
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\IssuesPage.tsx`

#### UI Components
- "+ New Issue" button
- "Export to CSV" button
- **Filters**:
  - Status: All | OPEN | MITIGATED | CLOSED
  - Severity: All | LOW | MEDIUM | HIGH | CRITICAL
  - Owner dropdown
  - "Include Archived" checkbox
  - Search bar
- **Issue Cards**:
  - Title
  - Severity badge (color-coded: LOW=green, MEDIUM=yellow, HIGH=orange, CRITICAL=red)
  - Status badge
  - Owner
  - Target resolution date
  - Impact summary (truncated)
  - "View/Edit" button
  - "Archive" icon (if CLOSED)

### API Endpoints: Issues

#### GET /api/artifacts/issues/project/:projectId
**Purpose**: Get filtered issues
**Query Params**:
- `status`: IssueStatus (optional)
- `severity`: IssueSeverity (optional)
- `ownerId`: UUID (optional)
- `includeArchived`: boolean (default false)
- `search`: string (optional)

**Backend**: `F:\StandupSnap\backend\src\artifacts\issue.service.ts` - `findByProject()`

**Ordering**:
```sql
ORDER BY issue.severity DESC, issue.created_at DESC
```
(Most severe first, then newest)

**Response**:
```json
[
  {
    "id": "uuid",
    "project": { "id": "uuid" },
    "title": "Database connection pool exhaustion",
    "description": "Under high load, the application runs out of database connections",
    "status": "OPEN",
    "owner": { "id": "uuid", "fullName": "Backend Lead" },
    "severity": "CRITICAL",
    "impactSummary": "Users cannot access the application during peak hours. Estimated 500 affected users per incident.",
    "resolutionPlan": "1. Increase connection pool size. 2. Implement connection pooling monitoring. 3. Add query optimization.",
    "targetResolutionDate": "2025-01-20",
    "closureDate": null,
    "isArchived": false,
    "archivedDate": null,
    "createdBy": { "id": "uuid", "name": "DevOps" },
    "updatedBy": { "id": "uuid", "name": "Backend Lead" },
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T15:30:00Z"
  }
]
```

#### POST /api/artifacts/issues
**Purpose**: Create new issue
**Request Body**:
```json
{
  "projectId": "uuid",
  "title": "Database connection pool exhaustion",
  "description": "Under high load, the application runs out of database connections",
  "ownerId": "tm-uuid",
  "severity": "CRITICAL",
  "impactSummary": "Users cannot access the application...",
  "resolutionPlan": "1. Increase connection pool size...",
  "targetResolutionDate": "2025-01-20",
  "status": "OPEN"
}
```

**Backend**: `issue.service.ts` - `create()`

**Validation**:
- Owner must be regular team member (not user-{id})
- Owner must be in project

#### PUT /api/artifacts/issues/:id
**Purpose**: Update issue

**Backend**: `issue.service.ts` - `update()`

**Auto-Set Closure Date**:
```typescript
if (dto.status !== undefined) {
  const oldStatus = issue.status;
  issue.status = dto.status;

  // Set closure date when status becomes CLOSED
  if (dto.status === IssueStatus.CLOSED && oldStatus !== IssueStatus.CLOSED) {
    issue.closureDate = new Date();
  }
}
```

**Archive Restriction**:
```typescript
if (issue.isArchived) {
  throw new BadRequestException('Archived issues cannot be modified');
}
```

#### PATCH /api/artifacts/issues/:id/archive
**Purpose**: Archive issue

**Backend**: `issue.service.ts` - `archive()`

```sql
UPDATE issues
SET is_archived = TRUE, archived_date = NOW(), updated_by = ?
WHERE id = ?;
```

#### GET /api/artifacts/issues/project/:projectId/export
**Purpose**: Export issues to CSV

**CSV Headers**:
```
ID, Title, Description, Status, Severity, Owner, Impact Summary, Resolution Plan,
Target Resolution Date, Closure Date, Created By, Created At, Updated By, Updated At,
Is Archived, Archived Date
```

---

## Module 3: Decisions

### Screen: Decisions List
**Route**: `/projects/:projectId/artifacts/decisions`
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\DecisionsPage.tsx`

#### UI Components
- "+ New Decision" button
- "Export to CSV" button
- **Filters**:
  - Status: All | PENDING | FINALIZED
  - Owner dropdown
  - "Include Archived" checkbox
  - Search bar
- **Decision Cards**:
  - Title
  - Status badge (PENDING=yellow, FINALIZED=green)
  - Owner
  - Due date (if set)
  - Impacted areas badges (SCHEDULE, SCOPE, COST, RESOURCES)
  - Decision taken (truncated, if FINALIZED)
  - "View/Edit" button
  - "Archive" icon

### API Endpoints: Decisions

#### GET /api/artifacts/decisions/project/:projectId
**Purpose**: Get filtered decisions
**Query Params**:
- `status`: DecisionStatus (optional)
- `ownerId`: UUID (optional)
- `includeArchived`: boolean (default false)
- `search`: string (optional)

**Backend**: `F:\StandupSnap\backend\src\artifacts\decision.service.ts` - `findByProject()`

**Ordering**:
```sql
ORDER BY decision.status ASC, decision.created_at DESC
```
(PENDING first, then newest)

**Response**:
```json
[
  {
    "id": "uuid",
    "project": { "id": "uuid" },
    "title": "Choice of database for analytics module",
    "description": "Need to decide between PostgreSQL (relational) and MongoDB (NoSQL) for the new analytics feature",
    "owner": { "id": "uuid", "fullName": "Architect" },
    "status": "PENDING",
    "decisionTaken": null,
    "dueDate": "2025-01-25",
    "impactedAreas": ["SCHEDULE", "COST"],
    "supportingNotes": "Evaluated both options. MongoDB offers better scalability but PostgreSQL has better team expertise.",
    "finalizedDate": null,
    "isArchived": false,
    "archivedDate": null,
    "createdBy": { "id": "uuid", "name": "CTO" },
    "updatedBy": { "id": "uuid", "name": "Architect" },
    "createdAt": "2025-01-10T09:00:00Z",
    "updatedAt": "2025-01-12T14:00:00Z"
  }
]
```

#### POST /api/artifacts/decisions
**Purpose**: Create new decision
**Request Body**:
```json
{
  "projectId": "uuid",
  "title": "Choice of database for analytics module",
  "description": "Need to decide between PostgreSQL and MongoDB...",
  "ownerId": "tm-uuid",
  "status": "PENDING",
  "dueDate": "2025-01-25",
  "impactedAreas": ["SCHEDULE", "COST"],
  "supportingNotes": "Evaluated both options..."
}
```

**Backend**: `decision.service.ts` - `create()`

#### PUT /api/artifacts/decisions/:id
**Purpose**: Update decision

**Backend**: `decision.service.ts` - `update()`

**Finalized Decision Read-Only Rule**:
```typescript
if (decision.status === DecisionStatus.FINALIZED) {
  // Only allow updating supportingNotes for finalized decisions
  if (Object.keys(dto).length > 1 || (Object.keys(dto).length === 1 && !dto.supportingNotes)) {
    throw new BadRequestException('Finalized decisions can only have supporting notes updated');
  }
}
```

**Auto-Set Finalized Date**:
```typescript
if (dto.status !== undefined) {
  decision.status = dto.status;

  // Set finalized date when status becomes FINALIZED
  if (dto.status === DecisionStatus.FINALIZED) {
    decision.finalizedDate = new Date();
  }
}
```

**Archive Restriction**:
```typescript
if (decision.isArchived) {
  throw new BadRequestException('Archived decisions cannot be modified');
}
```

#### PATCH /api/artifacts/decisions/:id/archive
**Purpose**: Archive decision

```sql
UPDATE decisions
SET is_archived = TRUE, archived_date = NOW(), updated_by = ?
WHERE id = ?;
```

#### GET /api/artifacts/decisions/project/:projectId/export
**Purpose**: Export decisions to CSV

**CSV Headers**:
```
ID, Title, Description, Owner, Status, Decision Taken, Due Date, Impacted Areas,
Supporting Notes, Finalized Date, Created By, Created At, Updated By, Updated At,
Is Archived, Archived Date
```

---

## Complete User Journeys

### Journey 1: Assumption Lifecycle

**Scenario**: Team assumes third-party API supports batch operations

**Week 1** - Create Assumption:
1. Navigate to `/projects/{id}/artifacts/assumptions`
2. Click "+ New Assumption"
3. Fill form:
   - Title: "API supports batch operations"
   - Description: "We assume the payment gateway API supports batch processing for bulk customer updates"
   - Owner: "Tech Lead"
   - Status: OPEN
   - Notes: "Need to verify with vendor documentation before finalizing integration design"
4. **API**: `POST /api/artifacts/assumptions`
5. Assumption created with status OPEN

**Week 2** - Add Research Notes:
1. Tech Lead reviews vendor docs
2. Edit assumption
3. Append notes: "Reviewed API documentation v2.3. Found batch endpoint: POST /api/batch. Max 1000 items per request. Requires special auth header."
4. **API**: `PUT /api/artifacts/assumptions/:id`
5. Notes appended with newline separator

**Week 3** - Validate Assumption:
1. Tech Lead confirms API works as expected in testing
2. Update status: OPEN → VALIDATED
3. Append notes: "Successfully tested batch processing in staging environment. Confirmed 1000 item limit. Auth header requirement documented."
4. **API**: `PUT /api/artifacts/assumptions/:id`
5. Status changed to VALIDATED

**Result**: Documented assumption with full validation trail

### Journey 2: Critical Issue Resolution

**Scenario**: Production database connection pool exhaustion

**Day 1** - Report Issue:
1. Navigate to `/projects/{id}/artifacts/issues`
2. Click "+ New Issue"
3. Fill form:
   - Title: "Database connection pool exhaustion"
   - Description: "Under high load (>1000 concurrent users), application runs out of database connections, causing 503 errors"
   - Severity: CRITICAL
   - Owner: "Backend Lead"
   - Impact Summary: "Users cannot access application during peak hours. Estimated 500 affected users per incident. Lost revenue: ~$5000/hour."
   - Resolution Plan: "1. Increase connection pool from 20 to 100. 2. Implement connection monitoring with alerts at 80%. 3. Optimize long-running queries. 4. Add connection timeout (30s)."
   - Target Resolution Date: 2025-01-20 (5 days)
   - Status: OPEN
4. **API**: `POST /api/artifacts/issues`
5. Issue created with CRITICAL severity

**Day 2** - Start Mitigation:
1. Backend Lead increases connection pool to 50 (temporary)
2. Update issue:
   - Status: OPEN → MITIGATED
   - Resolution Plan (update): "**Temporary fix deployed**: Increased pool to 50. Monitoring for 24h. **Next steps**: Full resolution with monitoring and query optimization."
3. **API**: `PUT /api/artifacts/issues/:id`

**Day 5** - Full Resolution:
1. All resolution steps completed
2. Update issue:
   - Status: MITIGATED → CLOSED
   - Resolution Plan (update): "**Completed**: 1. ✓ Pool increased to 100. 2. ✓ Monitoring dashboard live. 3. ✓ Optimized 12 slow queries. 4. ✓ Connection timeout implemented. No incidents in past 72h under peak load."
3. **API**: `PUT /api/artifacts/issues/:id`
4. Auto-sets `closureDate`

**Week Later** - Archive:
1. Issue stable, no recurrence
2. Click "Archive"
3. **API**: `PATCH /api/artifacts/issues/:id/archive`
4. Issue hidden from active list

**Result**: CRITICAL issue resolved in 5 days with full audit trail

### Journey 3: Architecture Decision

**Scenario**: Choose database for analytics feature

**Week 1** - Identify Decision Needed:
1. Navigate to `/projects/{id}/artifacts/decisions`
2. Click "+ New Decision"
3. Fill form:
   - Title: "Choice of database for analytics module"
   - Description: "Need to decide between PostgreSQL (relational) and MongoDB (NoSQL) for the new analytics feature. Key factors: query complexity, data volume (10M+ records), team expertise, cost."
   - Owner: "System Architect"
   - Status: PENDING
   - Due Date: 2025-01-25 (2 weeks)
   - Impacted Areas: [SCHEDULE, COST]
   - Supporting Notes: "Initial research: MongoDB offers better horizontal scalability. PostgreSQL has stronger ACID guarantees and team has 5 years experience. Cost comparison: MongoDB Atlas ~$500/mo, PostgreSQL RDS ~$300/mo."
4. **API**: `POST /api/artifacts/decisions`

**Week 2** - Gather Input:
1. Architect conducts team review
2. Update decision:
   - Supporting Notes (append): "**Team feedback**: 3/5 engineers prefer PostgreSQL due to expertise. DevOps prefers PostgreSQL for simpler operations. QA concerned about MongoDB testing complexity. **Prototype results**: PostgreSQL query performance acceptable for current requirements (avg 200ms)."
3. **API**: `PUT /api/artifacts/decisions/:id`

**Week 3** - Make Decision:
1. Decision made after stakeholder review
2. Update decision:
   - Status: PENDING → FINALIZED
   - Decision Taken: "**Decision**: Use PostgreSQL for analytics module. **Rationale**: Team expertise reduces implementation risk. Performance meets requirements for Phase 1 (tested up to 15M records). Lower operational cost. Can migrate to specialized analytics DB in Phase 2 if needed."
3. **API**: `PUT /api/artifacts/decisions/:id`
4. Auto-sets `finalizedDate`

**Result**: Documented decision with rationale for future reference

---

## Business Rules

### Assumptions Business Rules

#### ABR-01: Edit Restriction - Open Only
**Rule**: Only assumptions with status "OPEN" can be edited (except notes)
**Enforcement**: Backend validation in `update()`
**Error**: "Only assumptions with status 'Open' can be edited"

#### ABR-02: Notes Append-Only
**Rule**: Notes field is append-only, new notes concatenated with newlines
**Enforcement**: Backend logic in `update()`
**Behavior**: `notes = existingNotes + "\n\n" + newNotes`

#### ABR-03: No Edit When Archived
**Rule**: Archived assumptions are read-only
**Enforcement**: Backend validation in `update()`
**Error**: "Archived assumptions cannot be modified"

### Issues Business Rules

#### IBR-01: Auto-Set Closure Date
**Rule**: When status changes to CLOSED, set `closureDate` to current timestamp
**Enforcement**: Automatic in `update()`
**Field**: `closureDate` (timestamp)

#### IBR-02: No Edit When Archived
**Rule**: Archived issues are read-only
**Enforcement**: Backend validation in `update()`
**Error**: "Archived issues cannot be modified"

#### IBR-03: Severity-Based Sorting
**Rule**: Issues sorted by severity (CRITICAL > HIGH > MEDIUM > LOW), then by creation date
**Enforcement**: Backend query ordering
**SQL**: `ORDER BY severity DESC, created_at DESC`

### Decisions Business Rules

#### DBR-01: Finalized Decisions Locked
**Rule**: Finalized decisions can only have supporting notes updated
**Enforcement**: Backend validation in `update()`
**Error**: "Finalized decisions can only have supporting notes updated"
**Exception**: supportingNotes field can still be edited (for adding context)

#### DBR-02: Auto-Set Finalized Date
**Rule**: When status changes to FINALIZED, set `finalizedDate` to current timestamp
**Enforcement**: Automatic in `update()`
**Field**: `finalizedDate` (timestamp)

#### DBR-03: Pending-First Sorting
**Rule**: Decisions sorted by status (PENDING before FINALIZED), then by creation date
**Enforcement**: Backend query ordering
**SQL**: `ORDER BY status ASC, created_at DESC`

### Common Business Rules (All Modules)

#### CBR-01: Owner Validation
**Rule**: Owner must be regular team member (not user-{id} special roles)
**Enforcement**: Backend validation in `create()` and `update()`
**Error**: "{Module} owner must be a regular team member. Please add team members to the project and select one as the owner."

#### CBR-02: Owner Project Association
**Rule**: Owner must be assigned to the project
**Enforcement**: Backend validation via team_member_projects join
**Error**: "Owner not part of this project"

#### CBR-03: Archive Default Exclusion
**Rule**: By default, archived items are hidden from list queries
**Enforcement**: Backend query builder
**Override**: Set `includeArchived=true` query param

#### CBR-04: Search Case-Insensitive
**Rule**: Search queries are case-insensitive
**Enforcement**: SQL `ILIKE` operator
**Fields**: title, description

---

## Error Handling

### Common Errors (All Modules)

**Error 1**: Item Not Found
- **Response**: 404 `NotFoundException('{Module} not found')`
- **UI**: Error toast, redirect to list

**Error 2**: Project Not Found
- **Response**: 404 `NotFoundException('Project not found')`
- **UI**: Error toast

**Error 3**: Owner Not Found
- **Response**: 404 `NotFoundException('Owner not found')`
- **UI**: Error toast

**Error 4**: Owner Not in Project
- **Response**: 400 `BadRequestException('Owner not part of this project')`
- **UI**: Error toast with message

**Error 5**: Invalid Owner Type
- **Response**: 400 `BadRequestException('{Module} owner must be a regular team member')`
- **UI**: Error toast

**Error 6**: Archived Item Modification
- **Response**: 400 `BadRequestException('Archived {module}s cannot be modified')`
- **UI**: Error toast, disable edit controls

**Error 7**: Unauthorized Access
- **Response**: 401 `UnauthorizedException('Unauthorized')`
- **UI**: Redirect to login

### Module-Specific Errors

**Assumptions Error**: Edit When Not Open
- **Response**: 400 `BadRequestException('Only assumptions with status "Open" can be edited')`
- **UI**: Error toast, disable edit fields

**Decisions Error**: Edit Finalized Decision
- **Response**: 400 `BadRequestException('Finalized decisions can only have supporting notes updated')`
- **UI**: Error toast, show only notes field editable

---

## Integration Points

### Integration 1: Project Module
- **Dependency**: All items belong to projects
- **Relationship**: Many-to-one
- **Constraint**: Deleting project cascades to assumptions/issues/decisions
- **Foreign Key**: `project_id` → `projects(id)` ON DELETE CASCADE

### Integration 2: Team Members Module
- **Dependency**: Owners are team members
- **Relationship**: Many-to-one (optional for assumptions, required for issues/decisions)
- **Constraint**: Issues/Decisions owners ON DELETE RESTRICT, Assumptions owners ON DELETE SET NULL
- **Validation**: Owner must be in project's team

### Integration 3: User Module
- **Dependency**: Audit fields (createdBy, updatedBy)
- **Relationship**: Many-to-one
- **Constraint**: Soft delete (ON DELETE SET NULL)

### Integration 4: Authentication
- **Requirement**: JWT authentication for all endpoints
- **Authorization**: Project access required

---

## File References

### Backend Files - Assumptions
- **Controller**: `F:\StandupSnap\backend\src\artifacts\assumption.controller.ts`
- **Service**: `F:\StandupSnap\backend\src\artifacts\assumption.service.ts`
- **Entity**: `F:\StandupSnap\backend\src\entities\assumption.entity.ts`
- **DTOs**:
  - `F:\StandupSnap\backend\src\artifacts\dto\create-assumption.dto.ts`
  - `F:\StandupSnap\backend\src\artifacts\dto\update-assumption.dto.ts`

### Backend Files - Issues
- **Controller**: `F:\StandupSnap\backend\src\artifacts\issue.controller.ts`
- **Service**: `F:\StandupSnap\backend\src\artifacts\issue.service.ts`
- **Entity**: `F:\StandupSnap\backend\src\entities\issue.entity.ts`
- **DTOs**:
  - `F:\StandupSnap\backend\src\artifacts\dto\create-issue.dto.ts`
  - `F:\StandupSnap\backend\src\artifacts\dto\update-issue.dto.ts`

### Backend Files - Decisions
- **Controller**: `F:\StandupSnap\backend\src\artifacts\decision.controller.ts`
- **Service**: `F:\StandupSnap\backend\src\artifacts\decision.service.ts`
- **Entity**: `F:\StandupSnap\backend\src\entities\decision.entity.ts`
- **DTOs**:
  - `F:\StandupSnap\backend\src\artifacts\dto\create-decision.dto.ts`
  - `F:\StandupSnap\backend\src\artifacts\dto\update-decision.dto.ts`

### Frontend Files
- **Pages**:
  - `F:\StandupSnap\frontend\src\pages\artifacts\AssumptionsPage.tsx`
  - `F:\StandupSnap\frontend\src\pages\artifacts\IssuesPage.tsx`
  - `F:\StandupSnap\frontend\src\pages\artifacts\DecisionsPage.tsx`

---

## Summary

The AID (Assumptions, Issues, Decisions) module provides three related but distinct tracking systems:

**Assumptions**:
- Track things believed true but not yet verified
- Status workflow: OPEN → VALIDATED/INVALIDATED
- Append-only notes for validation trail
- Edit restriction: Only OPEN assumptions editable

**Issues**:
- Track problems requiring resolution
- Status workflow: OPEN → MITIGATED → CLOSED
- Severity levels: LOW, MEDIUM, HIGH, CRITICAL
- Auto-closure date when marked CLOSED

**Decisions**:
- Track choices impacting project direction
- Status workflow: PENDING → FINALIZED
- Impacted areas tracking (SCHEDULE, SCOPE, COST, RESOURCES)
- Read-only when finalized (except supporting notes)
- Auto-finalized date when marked FINALIZED

All three modules share common patterns: owner assignment, filtering, searching, archiving, CSV export, and audit trails. They enforce business rules around owner validation, archive restrictions, and status-based editing permissions.
