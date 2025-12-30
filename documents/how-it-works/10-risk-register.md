# Risk Register - How It Works

## Overview
- **Purpose**: Identify, assess, track, and manage project risks and opportunities throughout the project lifecycle
- **Key Features**: Risk CRUD operations, assessment scoring, status workflow, mitigation planning, risk matrix visualization, history tracking, filtering, CSV export
- **Risk Types**: THREAT (negative impact) | OPPORTUNITY (positive impact)
- **Status Workflow**: OPEN → IN_PROGRESS → MITIGATED → CLOSED
- **Severity Calculation**: Risk Score = Probability Score × Impact Score (1-16 scale)

## Database Schema

### Table: `risks`
Stores project risks with identification, assessment, response, and tracking information.

```sql
CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- A. Identification Section
  title VARCHAR(255) NOT NULL,
  risk_type VARCHAR(20) NOT NULL CHECK (risk_type IN ('THREAT', 'OPPORTUNITY')),
  category VARCHAR(100) NOT NULL,  -- e.g., Technical, Resource, Schedule, Budget
  date_identified DATE NOT NULL,
  risk_statement TEXT NOT NULL,  -- Clear description: "If X happens, then Y impact"
  current_status_assumptions TEXT,  -- Context and assumptions

  -- B. Assessment Section
  probability VARCHAR(20) NOT NULL CHECK (probability IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  cost_impact VARCHAR(20) CHECK (cost_impact IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  time_impact VARCHAR(20) CHECK (time_impact IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  schedule_impact VARCHAR(20) CHECK (schedule_impact IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),

  -- Auto-calculated assessment fields
  probability_score INTEGER NOT NULL,  -- 1-4 (LOW=1, MEDIUM=2, HIGH=3, VERY_HIGH=4)
  impact_score INTEGER NOT NULL,  -- 1-4 (max of cost/time/schedule impacts)
  risk_score INTEGER NOT NULL,  -- probability_score × impact_score (1-16)
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  -- Severity mapping: 1-3=LOW, 4-6=MEDIUM, 7-9=HIGH, 10-16=VERY_HIGH

  rationale TEXT,  -- Justification for probability and impact ratings

  -- C. Response & Ownership Section
  strategy VARCHAR(20) NOT NULL CHECK (strategy IN ('AVOID', 'MITIGATE', 'ACCEPT', 'TRANSFER', 'EXPLOIT')),
  mitigation_plan TEXT,  -- Actions to reduce probability or impact
  contingency_plan TEXT,  -- Fallback plan if risk occurs
  owner_id UUID NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  target_closure_date DATE,

  -- D. Status Tracking Section
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'MITIGATED', 'CLOSED')),
  progress_notes TEXT,  -- Ongoing updates and actions taken

  -- Archive flag
  is_archived BOOLEAN DEFAULT FALSE,

  -- Audit fields
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_risks_project ON risks(project_id);
CREATE INDEX idx_risks_severity ON risks(severity);
CREATE INDEX idx_risks_status ON risks(status);
CREATE INDEX idx_risks_owner ON risks(owner_id);
CREATE INDEX idx_risks_archived ON risks(is_archived);
```

**File**: `F:\StandupSnap\backend\src\entities\risk.entity.ts`

### Table: `risk_history`
Tracks changes to risks over time for audit and compliance.

```sql
CREATE TABLE risk_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
    'CREATED', 'UPDATED', 'ARCHIVED', 'STATUS_CHANGED',
    'OWNER_CHANGED', 'SEVERITY_CHANGED'
  )),
  description TEXT,
  changed_fields JSONB,  -- { "fieldName": { "old": value, "new": value } }
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_risk_history_risk ON risk_history(risk_id);
CREATE INDEX idx_risk_history_created ON risk_history(created_at DESC);
```

**File**: `F:\StandupSnap\backend\src\entities\risk-history.entity.ts`

## Screens & Pages

### Screen 1: Risk Register List
**Route**: `/projects/:projectId/artifacts/risks`
**Access**: Authenticated users with project access
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\RisksPage.tsx`

#### UI Components
- **Header Section**:
  - Project breadcrumb navigation
  - "+ New Risk" button (top-right)
  - "Export to CSV" button
  - Filter bar

- **Filter Bar**:
  - Status dropdown (All | OPEN | IN_PROGRESS | MITIGATED | CLOSED)
  - Severity dropdown (All | LOW | MEDIUM | HIGH | VERY_HIGH)
  - Category input (free text search)
  - Owner dropdown (All team members)
  - Strategy dropdown (All | AVOID | MITIGATE | ACCEPT | TRANSFER | EXPLOIT)
  - Risk Type dropdown (All | THREAT | OPPORTUNITY)
  - "Include Archived" checkbox
  - Search bar (searches title, risk statement, category)
  - "Clear Filters" button

- **Risk Cards Grid**:
  - Card displays:
    - Risk ID badge
    - Title
    - Risk type badge (THREAT=red, OPPORTUNITY=green)
    - Severity badge (color-coded)
    - Status badge
    - Category
    - Owner avatar & name
    - Risk score (e.g., "12/16")
    - Date identified
    - "View Details" button
    - "Archive" icon (if MITIGATED or CLOSED)

- **Risk Matrix Visualization** (optional view toggle):
  - 4x4 grid: Probability (Y-axis) vs Impact (X-axis)
  - Each cell shows risk count
  - Click cell to filter risks
  - Color gradient (green → yellow → orange → red)

- **Empty State**: "No risks found. Create your first risk assessment."

#### User Actions

##### Action 1: User Loads Risks for Project

**API Call**:
```http
GET /api/artifacts/risks/project/:projectId?status=OPEN&severity=HIGH&category=Technical&ownerId=uuid&strategy=MITIGATE&riskType=THREAT&includeArchived=false&search=API
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\risk.controller.ts` - `@Get('project/:projectId')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\risk.service.ts` - `findByProject()`

**Backend Flow**:
1. **Build Query**: Create QueryBuilder with filters
   ```typescript
   const qb = this.riskRepository
     .createQueryBuilder('risk')
     .leftJoinAndSelect('risk.owner', 'owner')
     .leftJoinAndSelect('risk.createdBy', 'createdBy')
     .leftJoinAndSelect('risk.updatedBy', 'updatedBy')
     .where('risk.project_id = :projectId', { projectId });
   ```

2. **Apply Filters**:
   ```typescript
   // Exclude archived by default
   if (!filters?.includeArchived) {
     qb.andWhere('risk.isArchived = :isArchived', { isArchived: false });
   }

   if (filters?.status) {
     qb.andWhere('risk.status = :status', { status: filters.status });
   }

   if (filters?.severity) {
     qb.andWhere('risk.severity = :severity', { severity: filters.severity });
   }

   if (filters?.category) {
     qb.andWhere('risk.category = :category', { category: filters.category });
   }

   if (filters?.ownerId) {
     qb.andWhere('risk.owner_id = :ownerId', { ownerId: filters.ownerId });
   }

   if (filters?.strategy) {
     qb.andWhere('risk.strategy = :strategy', { strategy: filters.strategy });
   }

   if (filters?.riskType) {
     qb.andWhere('risk.riskType = :riskType', { riskType: filters.riskType });
   }

   if (filters?.search) {
     qb.andWhere(
       '(risk.title ILIKE :q OR risk.riskStatement ILIKE :q OR risk.category ILIKE :q)',
       { q: `%${filters.search}%` }
     );
   }
   ```

3. **Order Results**:
   ```typescript
   qb.orderBy('risk.riskScore', 'DESC')
     .addOrderBy('risk.dateIdentified', 'DESC');
   ```

**SQL Query**:
```sql
SELECT r.*,
       o.id as owner_id, o.full_name as owner_name,
       cb.id as created_by_id, cb.name as created_by_name,
       ub.id as updated_by_id, ub.name as updated_by_name
FROM risks r
LEFT JOIN team_members o ON r.owner_id = o.id
LEFT JOIN users cb ON r.created_by = cb.id
LEFT JOIN users ub ON r.updated_by = ub.id
WHERE r.project_id = ?
  AND r.is_archived = FALSE
  AND r.status = ?
  AND r.severity = ?
ORDER BY r.risk_score DESC, r.date_identified DESC;
```

**Response**:
```json
[
  {
    "id": "uuid",
    "project": { "id": "uuid", "name": "..." },
    "title": "Third-party API Rate Limiting",
    "riskType": "THREAT",
    "category": "Technical",
    "dateIdentified": "2025-01-10",
    "riskStatement": "If the payment gateway API rate limits our requests, then payment processing will fail for customers",
    "currentStatusAssumptions": "Assuming current traffic of 100 req/min",
    "probability": "HIGH",
    "costImpact": "MEDIUM",
    "timeImpact": "HIGH",
    "scheduleImpact": "LOW",
    "probabilityScore": 3,
    "impactScore": 3,
    "riskScore": 9,
    "severity": "HIGH",
    "rationale": "Payment gateway docs show 500 req/min limit. Current peak is 100 req/min, expected 10x growth in 3 months.",
    "strategy": "MITIGATE",
    "mitigationPlan": "Implement request queuing and caching layer. Monitor API usage daily.",
    "contingencyPlan": "Fallback to secondary payment provider within 5 minutes.",
    "owner": { "id": "uuid", "fullName": "Tech Lead", "displayName": "..." },
    "targetClosureDate": "2025-02-15",
    "status": "IN_PROGRESS",
    "progressNotes": "Implemented caching layer. Testing queue system this week.",
    "isArchived": false,
    "createdBy": { "id": "uuid", "name": "Project Manager" },
    "updatedBy": { "id": "uuid", "name": "Tech Lead" },
    "createdAt": "2025-01-10T09:00:00Z",
    "updatedAt": "2025-01-15T14:30:00Z"
  }
]
```

**UI Update**: Render risk cards

##### Action 2: User Creates a New Risk

**Frontend**:
1. User clicks "+ New Risk" button
2. Multi-step form modal opens:
   - **Step 1: Identification**
     - Title (required, max 255 chars)
     - Risk Type: THREAT | OPPORTUNITY
     - Category (required, dropdown or free text)
     - Date Identified (defaults to today)
     - Risk Statement (required, textarea)
     - Current Status/Assumptions (optional, textarea)
   - **Step 2: Assessment**
     - Probability: LOW | MEDIUM | HIGH | VERY_HIGH
     - Cost Impact: LOW | MEDIUM | HIGH | VERY_HIGH (optional)
     - Time Impact: LOW | MEDIUM | HIGH | VERY_HIGH (optional)
     - Schedule Impact: LOW | MEDIUM | HIGH | VERY_HIGH (optional)
     - Rationale (optional, textarea)
     - **Risk Score Preview**: Auto-calculated (e.g., "9/16 - HIGH")
   - **Step 3: Response**
     - Strategy: AVOID | MITIGATE | ACCEPT | TRANSFER | EXPLOIT
     - Mitigation Plan (optional, textarea)
     - Contingency Plan (optional, textarea)
     - Owner (required, team member dropdown)
     - Target Closure Date (optional)
     - Status: OPEN | IN_PROGRESS (defaults to OPEN)
     - Progress Notes (optional, textarea)
3. User clicks "Create Risk"

**API Call**:
```http
POST /api/artifacts/risks
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "projectId": "uuid",
  "title": "Third-party API Rate Limiting",
  "riskType": "THREAT",
  "category": "Technical",
  "dateIdentified": "2025-01-10",
  "riskStatement": "If the payment gateway API rate limits our requests, then payment processing will fail for customers",
  "currentStatusAssumptions": "Assuming current traffic of 100 req/min",
  "probability": "HIGH",
  "costImpact": "MEDIUM",
  "timeImpact": "HIGH",
  "scheduleImpact": "LOW",
  "rationale": "Payment gateway docs show 500 req/min limit...",
  "strategy": "MITIGATE",
  "mitigationPlan": "Implement request queuing and caching layer...",
  "contingencyPlan": "Fallback to secondary payment provider...",
  "ownerId": "tm-uuid",
  "targetClosureDate": "2025-02-15",
  "status": "OPEN",
  "progressNotes": ""
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\risk.controller.ts` - `@Post()`
- **Service**: `F:\StandupSnap\backend\src\artifacts\risk.service.ts` - `create()`

**Backend Flow**:
1. **Validate Project**:
   ```sql
   SELECT * FROM projects WHERE id = ?;
   ```
   - If not found: throw `NotFoundException('Project not found')`

2. **Validate Owner**:
   - If `ownerId` starts with `user-`: throw `BadRequestException('Risk owner must be a regular team member')`
   ```sql
   SELECT tm.*, tmp.project_id
   FROM team_members tm
   LEFT JOIN team_member_projects tmp ON tmp.team_member_id = tm.id
   WHERE tm.id = ?;
   ```
   - If not found: throw `NotFoundException('Owner not found')`
   - If not in project: throw `BadRequestException('Owner not part of this project')`

3. **Validate Date Range**:
   ```typescript
   if (dto.targetClosureDate && dto.dateIdentified) {
     const identifiedDate = new Date(dto.dateIdentified);
     const closureDate = new Date(dto.targetClosureDate);
     if (closureDate < identifiedDate) {
       throw new BadRequestException('Target closure date must be after date identified');
     }
   }
   ```

4. **Calculate Risk Metrics**:
   ```typescript
   // Probability Score: LOW=1, MEDIUM=2, HIGH=3, VERY_HIGH=4
   const probabilityScore = calculateProbabilityScore(dto.probability);

   // Impact Score: MAX(costImpact, timeImpact, scheduleImpact)
   const impactScore = calculateImpactScore(
     dto.costImpact,
     dto.timeImpact,
     dto.scheduleImpact
   );  // 1-4

   // Risk Score: probability × impact
   const riskScore = probabilityScore * impactScore;  // 1-16

   // Severity: 1-3=LOW, 4-6=MEDIUM, 7-9=HIGH, 10-16=VERY_HIGH
   const severity = determineSeverity(riskScore);
   ```

5. **Create Risk**:
   ```sql
   INSERT INTO risks (
     project_id, title, risk_type, category, date_identified,
     risk_statement, current_status_assumptions,
     probability, cost_impact, time_impact, schedule_impact,
     probability_score, impact_score, risk_score, severity,
     rationale, strategy, mitigation_plan, contingency_plan,
     owner_id, target_closure_date, status, progress_notes,
     is_archived, created_by, updated_by
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)
   RETURNING *;
   ```

6. **Log History**:
   ```sql
   INSERT INTO risk_history (
     risk_id, change_type, description, changed_by
   ) VALUES (?, 'CREATED', 'Risk created: {title}', ?);
   ```

**Response**: Created risk object (see Action 1 response)

**UI Update**:
1. Close modal
2. Add risk to list (top of list)
3. Show success toast: "Risk created successfully"

##### Action 3: User Exports Risks to CSV

**API Call**:
```http
GET /api/artifacts/risks/project/:projectId/export?format=csv&status=OPEN
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\risk.controller.ts` - `@Get('project/:projectId/export')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\risk.service.ts` - `exportToCSV()`

**Backend Flow**:
1. **Get Filtered Risks**: Call `findByProject()` with same filters

2. **Build CSV**:
   ```typescript
   const headers = [
     'ID', 'Title', 'Type', 'Category', 'Status', 'Severity',
     'Risk Score', 'Probability', 'Probability Score', 'Impact Score',
     'Cost Impact', 'Time Impact', 'Schedule Impact', 'Strategy',
     'Owner', 'Date Identified', 'Target Closure Date',
     'Risk Statement', 'Mitigation Plan', 'Contingency Plan',
     'Current Status/Assumptions', 'Rationale', 'Progress Notes',
     'Created At', 'Updated At', 'Is Archived'
   ];

   const escapeCSV = (value: any): string => {
     if (value === null || value === undefined) return '';
     const str = String(value);
     if (str.includes(',') || str.includes('"') || str.includes('\n')) {
       return `"${str.replace(/"/g, '""')}"`;
     }
     return str;
   };

   const rows = risks.map(risk => [
     risk.id,
     risk.title,
     risk.riskType,
     risk.category,
     risk.status,
     risk.severity,
     risk.riskScore,
     risk.probability,
     risk.probabilityScore,
     risk.impactScore,
     risk.costImpact || '',
     risk.timeImpact || '',
     risk.scheduleImpact || '',
     risk.strategy,
     risk.owner?.fullName || risk.owner?.displayName || '',
     formatDate(risk.dateIdentified),
     formatDate(risk.targetClosureDate),
     risk.riskStatement,
     risk.mitigationPlan || '',
     risk.contingencyPlan || '',
     risk.currentStatusAssumptions || '',
     risk.rationale || '',
     risk.progressNotes || '',
     formatDate(risk.createdAt),
     formatDate(risk.updatedAt),
     risk.isArchived ? 'Yes' : 'No'
   ].map(escapeCSV));

   const csv = [
     headers.join(','),
     ...rows.map(row => row.join(','))
   ].join('\n');
   ```

3. **Set Response Headers**:
   ```typescript
   res.setHeader('Content-Type', 'text/csv');
   res.setHeader(
     'Content-Disposition',
     `attachment; filename="risks-${new Date().toISOString().split('T')[0]}.csv"`
   );
   ```

**Response**: CSV file download

**UI Update**: Browser downloads `risks-2025-01-15.csv`

---

### Screen 2: Risk Details & Edit
**Route**: `/projects/:projectId/artifacts/risks/:riskId`
**Access**: Authenticated users with project access
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\RiskDetailsPage.tsx`

#### UI Components
- **Header Section**:
  - Risk title (editable inline)
  - Risk type badge (THREAT/OPPORTUNITY)
  - Severity badge with score (e.g., "HIGH 9/16")
  - Status badge
  - "Back to List" button
  - "Archive Risk" button (enabled if MITIGATED or CLOSED)
  - "Delete Risk" button (with confirmation)

- **Tabs**:
  - **Details** (default)
  - **History**

- **Details Tab - Sections**:

  1. **Identification Section** (editable):
     - Title
     - Risk Type
     - Category
     - Date Identified
     - Risk Statement
     - Current Status/Assumptions

  2. **Assessment Section** (editable):
     - Probability (dropdown + score display)
     - Impact Levels:
       - Cost Impact (dropdown + score)
       - Time Impact (dropdown + score)
       - Schedule Impact (dropdown + score)
     - **Calculated Fields** (read-only, highlighted):
       - Impact Score (max of above)
       - Risk Score (probability × impact)
       - Severity (color-coded)
     - Rationale (textarea)

  3. **Response & Ownership Section** (editable):
     - Strategy (dropdown)
     - Mitigation Plan (textarea)
     - Contingency Plan (textarea)
     - Owner (dropdown)
     - Target Closure Date (date picker)

  4. **Status Tracking Section** (editable):
     - Status (dropdown)
     - Progress Notes (textarea)

  5. **Audit Information** (read-only):
     - Created by & date
     - Last updated by & date

- **History Tab**:
  - Timeline of changes
  - Each entry shows:
    - Change type badge
    - Description
    - Changed fields (old → new)
    - Changed by user
    - Timestamp

#### User Actions

##### Action 1: User Loads Risk Details

**API Call**:
```http
GET /api/artifacts/risks/:id
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\risk.controller.ts` - `@Get(':id')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\risk.service.ts` - `findById()`

**Query**:
```sql
SELECT r.*,
       o.id as owner_id, o.full_name as owner_name,
       cb.id as created_by_id, cb.name as created_by_name,
       ub.id as updated_by_id, ub.name as updated_by_name
FROM risks r
LEFT JOIN team_members o ON r.owner_id = o.id
LEFT JOIN users cb ON r.created_by = cb.id
LEFT JOIN users ub ON r.updated_by = ub.id
WHERE r.id = ?;
```

**Response**: Risk object (see Screen 1, Action 1)

**UI Update**: Render risk details form

##### Action 2: User Updates Risk

**Frontend**:
1. User edits any field
2. Auto-save on blur OR explicit "Save" button
3. If probability or impact changes, risk score updates in real-time

**API Call**:
```http
PUT /api/artifacts/risks/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Updated Title",
  "probability": "VERY_HIGH",
  "strategy": "AVOID",
  "status": "IN_PROGRESS",
  "progressNotes": "New progress update..."
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\risk.controller.ts` - `@Put(':id')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\risk.service.ts` - `update()`

**Backend Flow**:
1. **Load Risk**:
   ```sql
   SELECT * FROM risks WHERE id = ?;
   ```
   - If not found: throw `NotFoundException('Risk not found')`

2. **Track Changes**:
   ```typescript
   const changedFields: Record<string, { old: any; new: any }> = {};
   let description = 'Risk updated';
   ```

3. **Validate Owner** (if changed):
   - Same validation as create

4. **Update Fields**:
   ```typescript
   if (dto.title !== undefined) risk.title = dto.title;
   if (dto.riskType !== undefined) risk.riskType = dto.riskType;
   // ... all fields ...
   ```

5. **Recalculate Metrics** (if assessment changed):
   ```typescript
   if (
     dto.probability !== undefined ||
     dto.costImpact !== undefined ||
     dto.timeImpact !== undefined ||
     dto.scheduleImpact !== undefined
   ) {
     const metrics = this.calculateRiskMetrics(
       risk.probability,
       risk.costImpact,
       risk.timeImpact,
       risk.scheduleImpact
     );
     risk.probabilityScore = metrics.probabilityScore;
     risk.impactScore = metrics.impactScore;
     risk.riskScore = metrics.riskScore;
     risk.severity = metrics.severity;
   }
   ```

6. **Track Specific Changes**:
   ```typescript
   if (dto.status !== undefined && risk.status !== dto.status) {
     changedFields.status = { old: risk.status, new: dto.status };
     description = `Status changed from ${risk.status} to ${dto.status}`;
   }

   if (dto.ownerId && risk.owner?.id !== dto.ownerId) {
     changedFields.owner = {
       old: risk.owner?.fullName,
       new: newOwner.fullName
     };
     description = `Owner changed to ${newOwner.fullName}`;
   }
   ```

7. **Update Risk**:
   ```sql
   UPDATE risks
   SET title = ?, risk_type = ?, ..., updated_by = ?, updated_at = NOW()
   WHERE id = ?;
   ```

8. **Log History**:
   ```typescript
   const changeType = changedFields.status
     ? RiskChangeType.STATUS_CHANGED
     : changedFields.owner
       ? RiskChangeType.OWNER_CHANGED
       : RiskChangeType.UPDATED;
   ```
   ```sql
   INSERT INTO risk_history (
     risk_id, change_type, description, changed_fields, changed_by
   ) VALUES (?, ?, ?, ?, ?);
   ```

**Response**: Updated risk object

**UI Update**: Update displayed fields

##### Action 3: User Archives Risk

**Frontend**:
1. User clicks "Archive Risk" button
2. Validation: Status must be MITIGATED or CLOSED
3. Confirmation modal: "Archive this risk? It will be hidden from the active list."
4. User confirms

**API Call**:
```http
PATCH /api/artifacts/risks/:id/archive
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\risk.controller.ts` - `@Patch(':id/archive')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\risk.service.ts` - `archive()`

**Backend Flow**:
1. **Load Risk**

2. **Validate Status**:
   ```typescript
   if (risk.status !== RiskStatus.MITIGATED && risk.status !== RiskStatus.CLOSED) {
     throw new BadRequestException('Only Mitigated or Closed risks can be archived');
   }
   ```

3. **Check Not Already Archived**:
   ```typescript
   if (risk.isArchived) {
     throw new BadRequestException('This risk is already archived');
   }
   ```

4. **Archive Risk**:
   ```sql
   UPDATE risks
   SET is_archived = TRUE, updated_by = ?, updated_at = NOW()
   WHERE id = ?;
   ```

5. **Log History**:
   ```sql
   INSERT INTO risk_history (
     risk_id, change_type, description, changed_by
   ) VALUES (?, 'ARCHIVED', 'Risk archived', ?);
   ```

**Response**: Updated risk object

**UI Update**:
1. Show success toast: "Risk archived successfully"
2. Navigate back to risk list
3. Risk no longer appears in list (unless "Include Archived" is checked)

##### Action 4: User Views Risk History

**API Call**:
```http
GET /api/artifacts/risks/:id/history
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\risk.controller.ts` - `@Get(':id/history')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\risk.service.ts` - `getHistory()`

**Query**:
```sql
SELECT rh.*,
       u.id as changed_by_id, u.name as changed_by_name
FROM risk_history rh
LEFT JOIN users u ON rh.changed_by = u.id
WHERE rh.risk_id = ?
ORDER BY rh.created_at DESC;
```

**Response**:
```json
[
  {
    "id": "uuid",
    "risk": { "id": "uuid" },
    "changeType": "STATUS_CHANGED",
    "description": "Status changed from OPEN to IN_PROGRESS",
    "changedFields": {
      "status": { "old": "OPEN", "new": "IN_PROGRESS" }
    },
    "changedBy": { "id": "uuid", "name": "Tech Lead" },
    "createdAt": "2025-01-15T10:30:00Z"
  },
  {
    "id": "uuid",
    "changeType": "CREATED",
    "description": "Risk created: Third-party API Rate Limiting",
    "changedFields": null,
    "changedBy": { "id": "uuid", "name": "Project Manager" },
    "createdAt": "2025-01-10T09:00:00Z"
  }
]
```

**UI Update**: Render history timeline

##### Action 5: User Deletes Risk

**Frontend**:
1. User clicks "Delete Risk" button
2. Confirmation modal: "Permanently delete this risk? This cannot be undone."
3. User types risk title to confirm
4. User clicks "Delete"

**API Call**:
```http
DELETE /api/artifacts/risks/:id
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\risk.controller.ts` - `@Delete(':id')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\risk.service.ts` - `delete()`

**Query**:
```sql
-- Cascade delete handles risk_history automatically
DELETE FROM risks WHERE id = ?;
```

**Response**:
```json
{
  "message": "Risk deleted successfully"
}
```

**UI Update**:
1. Show success toast
2. Navigate back to risk list

---

## Business Rules

### BR-01: Project Association
**Rule**: Every risk must belong to an existing project
**Enforcement**: Foreign key constraint + backend validation
**Error**: "Project not found"

### BR-02: Owner Must Be Team Member
**Rule**: Risk owner must be a regular team member (not special roles like user-{id})
**Enforcement**: Backend validation in create() and update()
**Error**: "Risk owner must be a regular team member. Please add team members to the project and select one as the risk owner."

### BR-03: Owner Must Be In Project
**Rule**: Risk owner must be assigned to the project
**Enforcement**: Backend validation via team_member_projects join
**Error**: "Owner not part of this project"

### BR-04: Target Closure Date Validation
**Rule**: Target closure date must be after date identified
**Enforcement**: Backend validation in create() and update()
**Error**: "Target closure date must be after date identified"

### BR-05: Risk Score Calculation
**Rule**: Risk Score = Probability Score (1-4) × Impact Score (1-4) = 1-16
**Enforcement**: Automatic backend calculation
**Formula**:
```typescript
probabilityScore = { LOW: 1, MEDIUM: 2, HIGH: 3, VERY_HIGH: 4 }[probability];
impactScore = MAX(costImpactScore, timeImpactScore, scheduleImpactScore);
riskScore = probabilityScore * impactScore;
```

### BR-06: Impact Score Calculation
**Rule**: Impact Score = MAX(cost impact, time impact, schedule impact)
**Enforcement**: Automatic backend calculation
**Note**: If no impacts provided, defaults to 1 (LOW)

### BR-07: Severity Mapping
**Rule**: Severity determined by risk score:
- 1-3: LOW
- 4-6: MEDIUM
- 7-9: HIGH
- 10-16: VERY_HIGH
**Enforcement**: Automatic backend calculation

### BR-08: Archive Status Restriction
**Rule**: Only MITIGATED or CLOSED risks can be archived
**Enforcement**: Backend validation in archive()
**Error**: "Only Mitigated or Closed risks can be archived"

### BR-09: Archive Duplicate Check
**Rule**: Cannot archive already-archived risk
**Enforcement**: Backend validation in archive()
**Error**: "This risk is already archived"

### BR-10: History Tracking
**Rule**: All risk changes must be logged to risk_history
**Enforcement**: Automatic backend logging in create(), update(), archive()
**Types**: CREATED, UPDATED, ARCHIVED, STATUS_CHANGED, OWNER_CHANGED, SEVERITY_CHANGED

### BR-11: Filter Default - Exclude Archived
**Rule**: By default, archived risks are hidden unless explicitly requested
**Enforcement**: Backend query builder in findByProject()
**Override**: Set `includeArchived=true` query param

### BR-12: Risk Owner Restriction
**Rule**: Risk owner cannot be deleted while assigned to active risks
**Enforcement**: Database foreign key `ON DELETE RESTRICT`
**Impact**: Must reassign risks before deleting owner

### BR-13: Automatic Metric Recalculation
**Rule**: When probability or impact changes, scores and severity auto-recalculate
**Enforcement**: Backend logic in update()
**Fields Updated**: probabilityScore, impactScore, riskScore, severity

---

## Complete User Journeys

### Journey 1: Identifying and Assessing a New Risk

**Scenario**: Tech Lead identifies API rate limiting risk during architecture review

**Steps**:
1. **Navigate to Risks**: `/projects/{id}/artifacts/risks`
2. **Create Risk**:
   - Click "+ New Risk"
   - **Step 1 - Identification**:
     - Title: "Third-party API Rate Limiting"
     - Risk Type: THREAT
     - Category: "Technical"
     - Date Identified: 2025-01-10 (today)
     - Risk Statement: "If the payment gateway API rate limits our requests during peak hours, then payment processing will fail for customers, resulting in lost revenue and poor user experience"
     - Current Status/Assumptions: "Assuming current traffic of 100 req/min. Gateway limit is 500 req/min. Expected 10x growth in 3 months."
   - **Step 2 - Assessment**:
     - Probability: HIGH (Gateway limit is known, growth is projected)
     - Cost Impact: MEDIUM (Lost revenue during outages)
     - Time Impact: HIGH (Urgent fix required if occurs)
     - Schedule Impact: LOW (Won't delay project milestones)
     - Rationale: "Payment gateway documentation confirms 500 req/min rate limit. Our current peak traffic is 100 req/min, but marketing projects 10x growth within Q1 2025 due to new campaign. Without mitigation, we'll hit the limit by March."
     - **Risk Score**: 9/16 - HIGH (Probability 3 × Impact 3)
   - **Step 3 - Response**:
     - Strategy: MITIGATE
     - Mitigation Plan: "1. Implement request queuing system with Redis. 2. Add caching layer for redundant requests. 3. Set up daily monitoring dashboard for API usage. 4. Configure alerts at 80% of rate limit."
     - Contingency Plan: "If rate limit is hit: 1. Failover to secondary payment provider (Stripe) within 5 minutes. 2. Display user-friendly message: 'Payment processing temporarily slow'. 3. Queue failed payments for retry."
     - Owner: "Tech Lead" (dropdown)
     - Target Closure Date: 2025-02-15
     - Status: OPEN
   - **API**: `POST /api/artifacts/risks`

3. **Result**:
   - Risk appears in list with HIGH severity badge
   - Risk score shows 9/16
   - History shows "Risk created" entry

**Timeline**: 5 minutes to create comprehensive risk assessment

---

### Journey 2: Tracking Risk Mitigation Progress

**Scenario**: Tech Lead updates risk as mitigation actions are completed

**Week 1** (Jan 15):
1. **Update Status**:
   - Navigate to risk details
   - Change Status: OPEN → IN_PROGRESS
   - Progress Notes: "Implemented Redis queuing system. Testing with simulated traffic."
   - **API**: `PUT /api/artifacts/risks/:id`
   - **History Entry**: "Status changed from OPEN to IN_PROGRESS"

**Week 2** (Jan 22):
2. **Update Progress**:
   - Progress Notes (append): "Caching layer deployed. Reduced redundant requests by 40%. Monitoring dashboard live."
   - **API**: `PUT /api/artifacts/risks/:id`
   - **History Entry**: "Risk updated"

**Week 3** (Jan 29):
3. **Reassess Risk**:
   - Mitigation reducing probability
   - Change Probability: HIGH → MEDIUM
   - Rationale (update): "With caching and queuing, effective request rate reduced to 60 req/min. Can handle 8x growth before hitting limit."
   - **Auto-Recalculation**:
     - Probability Score: 3 → 2
     - Risk Score: 9 → 6
     - Severity: HIGH → MEDIUM
   - **API**: `PUT /api/artifacts/risks/:id`
   - **History Entry**: "Risk updated" (severity auto-changed)

**Week 4** (Feb 5):
4. **Mark Mitigated**:
   - All mitigation actions complete
   - Change Status: IN_PROGRESS → MITIGATED
   - Progress Notes (append): "All mitigation actions completed. Alert system tested. Traffic monitoring shows 50 req/min average. Safe margin for growth."
   - **API**: `PUT /api/artifacts/risks/:id`
   - **History Entry**: "Status changed from IN_PROGRESS to MITIGATED"

**Week 6** (Feb 19):
5. **Close & Archive**:
   - Risk monitoring shows successful mitigation
   - Change Status: MITIGATED → CLOSED
   - **API**: `PUT /api/artifacts/risks/:id`
   - Click "Archive Risk"
   - **API**: `PATCH /api/artifacts/risks/:id/archive`
   - Risk hidden from active list

**Result**: Complete audit trail of 6 history entries tracking risk lifecycle

---

### Journey 3: Filtering and Exporting High-Priority Risks for Executive Report

**Scenario**: Project Manager needs to report on critical risks to stakeholders

**Steps**:
1. **Navigate to Risks**: `/projects/{id}/artifacts/risks`

2. **Apply Filters**:
   - Severity: HIGH, VERY_HIGH (multi-select)
   - Status: OPEN, IN_PROGRESS (multi-select)
   - Include Archived: FALSE
   - **API**: `GET /api/artifacts/risks/project/:projectId?severity=HIGH&severity=VERY_HIGH&status=OPEN&status=IN_PROGRESS&includeArchived=false`

3. **Review Results**:
   - 8 risks displayed
   - Sorted by risk score (highest first)
   - Top risk: "Third-party API Rate Limiting" (9/16)

4. **Export to CSV**:
   - Click "Export to CSV"
   - **API**: `GET /api/artifacts/risks/project/:projectId/export?format=csv&severity=HIGH&severity=VERY_HIGH&status=OPEN&status=IN_PROGRESS`
   - Download: `risks-2025-01-15.csv`

5. **Review CSV**:
   - Headers: ID, Title, Type, Category, Status, Severity, Risk Score, ...
   - 8 rows of data
   - Import into executive report spreadsheet

**Result**: Stakeholder report with current high-priority risks

---

## Integration Points

### Integration 1: Project Module
- **Dependency**: Risks belong to projects
- **Relationship**: Many-to-one (many risks per project)
- **Constraint**: Deleting project cascades to risks
- **Foreign Key**: `project_id` → `projects(id)` ON DELETE CASCADE

### Integration 2: Team Members Module
- **Dependency**: Risk owners are team members
- **Relationship**: Many-to-one (many risks per owner)
- **Constraint**: Owner cannot be deleted while assigned to risks
- **Foreign Key**: `owner_id` → `team_members(id)` ON DELETE RESTRICT
- **Validation**: Owner must be in project's team

### Integration 3: User Module
- **Dependency**: Audit fields (createdBy, updatedBy)
- **Relationship**: Many-to-one (many risks per user)
- **Constraint**: Soft delete (ON DELETE SET NULL)
- **Foreign Keys**: `created_by`, `updated_by` → `users(id)` ON DELETE SET NULL

### Integration 4: Authentication
- **Requirement**: JWT authentication for all endpoints
- **Authorization**: Project access required
- **User Context**: `req.user.id` used for audit fields and history

---

## Error Handling

### Error 1: Risk Not Found
**Trigger**: Invalid risk ID
**Response**: 404 `NotFoundException('Risk not found')`
**UI**: Error toast, redirect to risk list

### Error 2: Project Not Found
**Trigger**: Creating risk with invalid project ID
**Response**: 404 `NotFoundException('Project not found')`
**UI**: Error toast

### Error 3: Owner Not Found
**Trigger**: Setting non-existent owner
**Response**: 404 `NotFoundException('Owner not found')`
**UI**: Error toast

### Error 4: Owner Not in Project
**Trigger**: Owner not assigned to project
**Response**: 400 `BadRequestException('Owner not part of this project')`
**UI**: Error toast with message

### Error 5: Invalid Owner Type
**Trigger**: Trying to set user-{id} as owner
**Response**: 400 `BadRequestException('Risk owner must be a regular team member')`
**UI**: Error toast

### Error 6: Invalid Date Range
**Trigger**: Target closure date before identified date
**Response**: 400 `BadRequestException('Target closure date must be after date identified')`
**UI**: Error toast, highlight date fields

### Error 7: Archive Status Violation
**Trigger**: Archiving risk not MITIGATED or CLOSED
**Response**: 400 `BadRequestException('Only Mitigated or Closed risks can be archived')`
**UI**: Error toast, disable archive button

### Error 8: Already Archived
**Trigger**: Archiving already-archived risk
**Response**: 400 `BadRequestException('This risk is already archived')`
**UI**: Error toast

### Error 9: Unauthorized Access
**Trigger**: User not authenticated or no project access
**Response**: 401 `UnauthorizedException('Unauthorized')`
**UI**: Redirect to login

---

## API Endpoint Reference

### POST /api/artifacts/risks
**Purpose**: Create new risk
**Auth**: Required (JWT)
**Request Body**: CreateRiskDto (see Journey 1)
**Response**: Risk object

### GET /api/artifacts/risks/project/:projectId
**Purpose**: Get filtered risks for project
**Auth**: Required (JWT)
**Query Params**:
- `status`: RiskStatus (optional)
- `category`: string (optional)
- `severity`: RiskSeverity (optional)
- `ownerId`: UUID (optional)
- `strategy`: RiskStrategy (optional)
- `riskType`: RiskType (optional)
- `includeArchived`: boolean (optional, default false)
- `search`: string (optional)
**Response**: Risk[]

### GET /api/artifacts/risks/:id
**Purpose**: Get single risk details
**Auth**: Required (JWT)
**Response**: Risk object

### GET /api/artifacts/risks/:id/history
**Purpose**: Get risk change history
**Auth**: Required (JWT)
**Response**: RiskHistory[]

### PUT /api/artifacts/risks/:id
**Purpose**: Update risk
**Auth**: Required (JWT)
**Request Body**: UpdateRiskDto (partial fields)
**Response**: Updated Risk object

### PATCH /api/artifacts/risks/:id/archive
**Purpose**: Archive risk (must be MITIGATED or CLOSED)
**Auth**: Required (JWT)
**Response**: Updated Risk object with `isArchived: true`

### DELETE /api/artifacts/risks/:id
**Purpose**: Permanently delete risk
**Auth**: Required (JWT)
**Response**: `{ message: "Risk deleted successfully" }`

### GET /api/artifacts/risks/project/:projectId/export
**Purpose**: Export risks to CSV
**Auth**: Required (JWT)
**Query Params**: Same as GET project risks + `format=csv`
**Response**: CSV file download

---

## File References

### Backend Files
- **Controller**: `F:\StandupSnap\backend\src\artifacts\risk.controller.ts`
- **Service**: `F:\StandupSnap\backend\src\artifacts\risk.service.ts`
- **Entities**:
  - `F:\StandupSnap\backend\src\entities\risk.entity.ts`
  - `F:\StandupSnap\backend\src\entities\risk-history.entity.ts`
- **DTOs**:
  - `F:\StandupSnap\backend\src\artifacts\dto\create-risk.dto.ts`
  - `F:\StandupSnap\backend\src\artifacts\dto\update-risk.dto.ts`
- **Module**: `F:\StandupSnap\backend\src\artifacts\artifacts.module.ts`

### Frontend Files
- **Pages**:
  - `F:\StandupSnap\frontend\src\pages\artifacts\RisksPage.tsx`
  - `F:\StandupSnap\frontend\src\pages\artifacts\RiskDetailsPage.tsx`
- **Components**:
  - `F:\StandupSnap\frontend\src\components\artifacts\RiskCard.tsx`
  - `F:\StandupSnap\frontend\src\components\artifacts\RiskForm.tsx`
  - `F:\StandupSnap\frontend\src\components\artifacts\RiskMatrixGrid.tsx`
  - `F:\StandupSnap\frontend\src\components\artifacts\RiskHistoryTimeline.tsx`

---

## Summary

The Risk Register module provides comprehensive risk management capabilities:

1. **Identification**: Capture risks with clear statements, categories, and context
2. **Assessment**: Quantitative scoring (1-16) with automatic severity calculation
3. **Response Planning**: Define strategies, mitigation plans, and contingencies
4. **Ownership**: Assign team members as risk owners with accountability
5. **Status Tracking**: Progress from OPEN → IN_PROGRESS → MITIGATED → CLOSED
6. **History Auditing**: Complete change log for compliance and learning
7. **Filtering & Search**: Find risks by multiple criteria
8. **Export**: CSV export for reporting and analysis
9. **Archive**: Hide closed/mitigated risks while preserving history

The module enforces business rules around scoring calculations, owner validation, and archive restrictions while maintaining a complete audit trail of all risk-related decisions.
