# Stakeholders & Power-Interest Grid - How It Works

## Overview
- **Purpose**: Identify, categorize, and manage project stakeholders using the Power-Interest Grid framework for effective engagement
- **Key Features**: Stakeholder register, power-interest classification, automatic quadrant assignment, engagement strategy planning, CSV export
- **Power-Interest Grid**: 2x2 matrix classifying stakeholders by their power (influence) and interest (involvement) levels
- **Four Quadrants**:
  1. **Manage Closely** (High Power + High Interest) - Key Players
  2. **Keep Satisfied** (High Power + Low Interest) - Decision Makers
  3. **Keep Informed** (Low Power + High Interest) - Supporters
  4. **Monitor** (Low Power + Low Interest) - Minimal Effort
- **Auto-Quadrant Calculation**: System automatically assigns quadrant based on power and interest levels

## Database Schema

### Table: `stakeholders`
Stores project stakeholders with power-interest classification and engagement details.

```sql
CREATE TABLE stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Mandatory Identification Fields
  stakeholder_name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,  -- e.g., "CEO", "End User", "Regulatory Body"

  -- Power-Interest Classification
  power_level VARCHAR(20) NOT NULL CHECK (power_level IN ('LOW', 'MEDIUM', 'HIGH')),
  interest_level VARCHAR(20) NOT NULL CHECK (interest_level IN ('LOW', 'MEDIUM', 'HIGH')),

  -- Auto-calculated Quadrant
  quadrant VARCHAR(50) NOT NULL CHECK (quadrant IN (
    'MANAGE_CLOSELY',    -- High Power + High Interest
    'KEEP_SATISFIED',    -- High Power + Low Interest
    'KEEP_INFORMED',     -- Low Power + High Interest
    'MONITOR'            -- Low Power + Low Interest
  )),

  -- Engagement & Communication
  engagement_strategy TEXT,  -- How to engage this stakeholder
  communication_frequency VARCHAR(20) CHECK (communication_frequency IN (
    'DAILY', 'WEEKLY', 'MONTHLY', 'AD_HOC'
  )),

  -- Contact Information
  email VARCHAR(255),
  phone VARCHAR(50),

  -- Additional Context
  notes TEXT,

  -- Owner (optional - team member managing this stakeholder)
  owner_id UUID REFERENCES team_members(id) ON DELETE SET NULL,

  -- Archive flag
  is_archived BOOLEAN DEFAULT FALSE,
  archived_date TIMESTAMP,

  -- Audit fields
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint: One stakeholder per name+role combination per project
  CONSTRAINT unique_stakeholder_per_project UNIQUE (project_id, stakeholder_name, role)
);

CREATE INDEX idx_stakeholders_project ON stakeholders(project_id);
CREATE INDEX idx_stakeholders_quadrant ON stakeholders(quadrant);
CREATE INDEX idx_stakeholders_power ON stakeholders(power_level);
CREATE INDEX idx_stakeholders_interest ON stakeholders(interest_level);
CREATE INDEX idx_stakeholders_archived ON stakeholders(is_archived);
```

**File**: `F:\StandupSnap\backend\src\entities\stakeholder.entity.ts`

## Power-Interest Grid Framework

### Power Levels
- **LOW**: Little to no decision-making authority, minimal influence on project outcomes
- **MEDIUM**: Some influence on project decisions, can escalate issues
- **HIGH**: Significant decision-making authority, can approve/reject project deliverables

### Interest Levels
- **LOW**: Minimal involvement, occasional updates sufficient
- **MEDIUM**: Moderate involvement, regular updates needed
- **HIGH**: Active involvement, frequent communication required

### Quadrant Assignment Logic

**Backend Calculation** (`F:\StandupSnap\backend\src\artifacts\stakeholder.service.ts`):
```typescript
calculateQuadrant(powerLevel: PowerLevel, interestLevel: InterestLevel): StakeholderQuadrant {
  const isHighPower = powerLevel === PowerLevel.HIGH;
  const isHighInterest = interestLevel === InterestLevel.HIGH;

  if (isHighPower && isHighInterest) {
    return StakeholderQuadrant.MANAGE_CLOSELY;      // High Power + High Interest
  } else if (isHighPower && !isHighInterest) {
    return StakeholderQuadrant.KEEP_SATISFIED;      // High Power + Low/Medium Interest
  } else if (!isHighPower && isHighInterest) {
    return StakeholderQuadrant.KEEP_INFORMED;       // Low/Medium Power + High Interest
  } else {
    return StakeholderQuadrant.MONITOR;             // Low/Medium Power + Low/Medium Interest
  }
}
```

**Quadrant Characteristics**:

| Quadrant | Power | Interest | Strategy | Engagement |
|----------|-------|----------|----------|------------|
| **Manage Closely** | High | High | Close partnership | Frequent, detailed |
| **Keep Satisfied** | High | Low/Med | Keep happy | Regular, high-level |
| **Keep Informed** | Low/Med | High | Involve & inform | Frequent, inclusive |
| **Monitor** | Low/Med | Low/Med | Minimal effort | Occasional, brief |

---

## Screens & Pages

### Screen 1: Stakeholders List
**Route**: `/projects/:projectId/artifacts/stakeholders`
**Access**: Authenticated users with project access
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\StakeholdersPage.tsx`

#### UI Components
- **Header Section**:
  - Project breadcrumb navigation
  - "+ Add Stakeholder" button (top-right)
  - "Export to CSV" button
  - "View Grid" / "View List" toggle

- **Filter Bar**:
  - Power Level dropdown (All | LOW | MEDIUM | HIGH)
  - Interest Level dropdown (All | LOW | MEDIUM | HIGH)
  - "Include Archived" checkbox
  - Search bar (searches name, role, email)
  - "Clear Filters" button

- **List View - Stakeholder Cards**:
  - Stakeholder name
  - Role badge
  - Quadrant badge (color-coded):
    - MANAGE_CLOSELY: Red
    - KEEP_SATISFIED: Orange
    - KEEP_INFORMED: Yellow
    - MONITOR: Green
  - Power & Interest levels
  - Owner (if assigned)
  - Communication frequency
  - Contact info (email/phone icons)
  - "View/Edit" button
  - "Archive" icon

- **Grid View - Power-Interest Matrix**:
  - 2x2 grid with quadrants
  - X-axis: Interest (LOW/MEDIUM → HIGH)
  - Y-axis: Power (LOW/MEDIUM → HIGH)
  - Each quadrant shows:
    - Quadrant name
    - Stakeholder count
    - List of stakeholder names
  - Click stakeholder to view details

- **Empty State**: "No stakeholders found. Add stakeholders to manage engagement."

#### User Actions

##### Action 1: User Loads Stakeholders for Project

**API Call**:
```http
GET /api/artifacts/stakeholders/project/:projectId?powerLevel=HIGH&interestLevel=HIGH&includeArchived=false&search=CEO
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\stakeholder.controller.ts` - `@Get('project/:projectId')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\stakeholder.service.ts` - `findByProject()`

**Backend Flow**:
1. **Build Query**:
   ```typescript
   const qb = this.stakeholderRepository
     .createQueryBuilder('stakeholder')
     .leftJoinAndSelect('stakeholder.owner', 'owner')
     .leftJoinAndSelect('stakeholder.createdBy', 'createdBy')
     .leftJoinAndSelect('stakeholder.updatedBy', 'updatedBy')
     .where('stakeholder.project_id = :projectId', { projectId });
   ```

2. **Apply Filters**:
   ```typescript
   // Exclude archived by default
   if (!filters?.includeArchived) {
     qb.andWhere('stakeholder.isArchived = :isArchived', { isArchived: false });
   }

   if (filters?.powerLevel) {
     qb.andWhere('stakeholder.powerLevel = :powerLevel', { powerLevel: filters.powerLevel });
   }

   if (filters?.interestLevel) {
     qb.andWhere('stakeholder.interestLevel = :interestLevel', { interestLevel: filters.interestLevel });
   }

   if (filters?.search) {
     qb.andWhere(
       '(stakeholder.stakeholderName ILIKE :q OR stakeholder.role ILIKE :q OR stakeholder.email ILIKE :q)',
       { q: `%${filters.search}%` }
     );
   }
   ```

3. **Order Results**:
   ```typescript
   qb.orderBy('stakeholder.updatedAt', 'DESC');
   ```

**SQL Query**:
```sql
SELECT s.*,
       o.id as owner_id, o.full_name as owner_name,
       cb.name as created_by_name,
       ub.name as updated_by_name
FROM stakeholders s
LEFT JOIN team_members o ON s.owner_id = o.id
LEFT JOIN users cb ON s.created_by = cb.id
LEFT JOIN users ub ON s.updated_by = ub.id
WHERE s.project_id = ?
  AND s.is_archived = FALSE
  AND s.power_level = ?
  AND s.interest_level = ?
  AND (s.stakeholder_name ILIKE ? OR s.role ILIKE ? OR s.email ILIKE ?)
ORDER BY s.updated_at DESC;
```

**Response**:
```json
[
  {
    "id": "uuid",
    "project": { "id": "uuid" },
    "stakeholderName": "Sarah Johnson",
    "role": "CEO",
    "powerLevel": "HIGH",
    "interestLevel": "HIGH",
    "quadrant": "MANAGE_CLOSELY",
    "engagementStrategy": "Weekly steering committee meetings. Monthly one-on-ones for strategic decisions. Immediate escalation for budget changes >$50k.",
    "communicationFrequency": "WEEKLY",
    "email": "sarah.johnson@company.com",
    "phone": "+1-555-0100",
    "notes": "Prefers data-driven presentations. Strong focus on ROI. Available Mon-Thu 2-4pm for urgent items.",
    "owner": { "id": "uuid", "fullName": "Project Manager" },
    "isArchived": false,
    "archivedDate": null,
    "createdBy": { "id": "uuid", "name": "PM" },
    "updatedBy": { "id": "uuid", "name": "PM" },
    "createdAt": "2025-01-10T09:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z"
  }
]
```

**UI Update**: Render stakeholder cards or grid

##### Action 2: User Creates a New Stakeholder

**Frontend**:
1. User clicks "+ Add Stakeholder" button
2. Form modal opens with sections:

   **Section 1: Identification** (required)
   - Stakeholder Name (text input)
   - Role (text input)

   **Section 2: Power-Interest Classification** (required)
   - Power Level: LOW | MEDIUM | HIGH (radio buttons or dropdown)
   - Interest Level: LOW | MEDIUM | HIGH (radio buttons or dropdown)
   - **Quadrant Preview**: Auto-displays quadrant as user selects levels

   **Section 3: Engagement** (optional)
   - Engagement Strategy (textarea)
   - Communication Frequency: DAILY | WEEKLY | MONTHLY | AD_HOC (dropdown)

   **Section 4: Contact** (optional)
   - Email (text input with validation)
   - Phone (text input)

   **Section 5: Additional** (optional)
   - Owner (team member dropdown)
   - Notes (textarea)

3. User fills in fields and clicks "Add Stakeholder"

**API Call**:
```http
POST /api/artifacts/stakeholders
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "projectId": "uuid",
  "stakeholderName": "Sarah Johnson",
  "role": "CEO",
  "powerLevel": "HIGH",
  "interestLevel": "HIGH",
  "engagementStrategy": "Weekly steering committee meetings...",
  "communicationFrequency": "WEEKLY",
  "email": "sarah.johnson@company.com",
  "phone": "+1-555-0100",
  "notes": "Prefers data-driven presentations...",
  "ownerId": "tm-uuid"
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\stakeholder.controller.ts` - `@Post()`
- **Service**: `F:\StandupSnap\backend\src\artifacts\stakeholder.service.ts` - `create()`

**Backend Flow**:
1. **Validate Project**:
   ```sql
   SELECT * FROM projects WHERE id = ?;
   ```
   - If not found: throw `NotFoundException('Project not found')`

2. **Validate Owner** (if provided):
   - If `ownerId` starts with `user-`: throw `BadRequestException('Stakeholder owner must be a regular team member')`
   ```sql
   SELECT tm.*, tmp.project_id
   FROM team_members tm
   LEFT JOIN team_member_projects tmp ON tmp.team_member_id = tm.id
   WHERE tm.id = ?;
   ```
   - If not found: throw `NotFoundException('Owner not found')`
   - If not in project: throw `BadRequestException('Owner not part of this project')`

3. **Check Duplicate**:
   ```sql
   SELECT * FROM stakeholders
   WHERE project_id = ?
     AND stakeholder_name = ?
     AND role = ?;
   ```
   - If exists: throw `BadRequestException('A stakeholder with this name and role already exists in this project')`

4. **Calculate Quadrant**:
   ```typescript
   const quadrant = this.calculateQuadrant(dto.powerLevel, dto.interestLevel);
   ```

5. **Create Stakeholder**:
   ```sql
   INSERT INTO stakeholders (
     project_id, stakeholder_name, role, power_level, interest_level,
     engagement_strategy, communication_frequency, email, phone, notes,
     owner_id, quadrant, is_archived, created_by, updated_by
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)
   RETURNING *;
   ```

**Response**: Created stakeholder object (see Action 1 response)

**UI Update**:
1. Close modal
2. Add stakeholder to list
3. Show success toast: "Stakeholder added successfully"
4. If grid view active, stakeholder appears in appropriate quadrant

##### Action 3: User Exports Stakeholders to CSV

**API Call**:
```http
GET /api/artifacts/stakeholders/project/:projectId/export?format=csv&powerLevel=HIGH
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\stakeholder.controller.ts` - `@Get('project/:projectId/export')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\stakeholder.service.ts` - `exportToCSV()`

**Backend Flow**:
1. **Get Filtered Stakeholders**: Call `findByProject()` with same filters

2. **Build CSV**:
   ```typescript
   const headers = [
     'ID', 'Stakeholder Name', 'Role', 'Power Level', 'Interest Level', 'Quadrant',
     'Engagement Strategy', 'Communication Frequency', 'Email', 'Phone', 'Notes',
     'Owner', 'Status', 'Created By', 'Created At', 'Updated By', 'Updated At', 'Archived Date'
   ];

   const formatQuadrant = (quadrant: StakeholderQuadrant): string => {
     const quadrantLabels = {
       [StakeholderQuadrant.MANAGE_CLOSELY]: 'Manage Closely',
       [StakeholderQuadrant.KEEP_SATISFIED]: 'Keep Satisfied',
       [StakeholderQuadrant.KEEP_INFORMED]: 'Keep Informed',
       [StakeholderQuadrant.MONITOR]: 'Monitor',
     };
     return quadrantLabels[quadrant] || quadrant;
   };

   const rows = stakeholders.map(stakeholder => [
     stakeholder.id,
     stakeholder.stakeholderName,
     stakeholder.role,
     stakeholder.powerLevel,
     stakeholder.interestLevel,
     formatQuadrant(stakeholder.quadrant),
     stakeholder.engagementStrategy || '',
     stakeholder.communicationFrequency || '',
     stakeholder.email || '',
     stakeholder.phone || '',
     stakeholder.notes || '',
     stakeholder.owner?.fullName || stakeholder.owner?.displayName || '',
     stakeholder.isArchived ? 'Archived' : 'Active',
     stakeholder.createdBy?.username || '',
     formatDate(stakeholder.createdAt),
     stakeholder.updatedBy?.username || '',
     formatDate(stakeholder.updatedAt),
     formatDate(stakeholder.archivedDate)
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
     `attachment; filename="stakeholders-${new Date().toISOString().split('T')[0]}.csv"`
   );
   ```

**Response**: CSV file download

**UI Update**: Browser downloads `stakeholders-2025-01-15.csv`

---

### Screen 2: Stakeholder Details & Edit
**Route**: `/projects/:projectId/artifacts/stakeholders/:stakeholderId`
**Access**: Authenticated users with project access
**Component**: `F:\StandupSnap\frontend\src\pages\artifacts\StakeholderDetailsPage.tsx`

#### UI Components
- **Header Section**:
  - Stakeholder name (editable inline)
  - Role badge
  - Quadrant badge (auto-updates when power/interest change)
  - "Back to List" button
  - "Archive Stakeholder" button
  - "Delete Stakeholder" button (with confirmation)

- **Details Form - Sections**:

  1. **Identification Section** (editable):
     - Stakeholder Name
     - Role

  2. **Power-Interest Classification** (editable):
     - Power Level (dropdown)
     - Interest Level (dropdown)
     - **Quadrant Display** (read-only, auto-calculated, color-coded)

  3. **Engagement Section** (editable):
     - Engagement Strategy (textarea)
     - Communication Frequency (dropdown)

  4. **Contact Information** (editable):
     - Email
     - Phone

  5. **Management** (editable):
     - Owner (team member dropdown)
     - Notes (textarea)

  6. **Audit Information** (read-only):
     - Created by & date
     - Last updated by & date
     - Archived date (if archived)

#### User Actions

##### Action 1: User Loads Stakeholder Details

**API Call**:
```http
GET /api/artifacts/stakeholders/:id
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\stakeholder.controller.ts` - `@Get(':id')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\stakeholder.service.ts` - `findById()`

**Query**:
```sql
SELECT s.*,
       o.id as owner_id, o.full_name as owner_name,
       cb.id as created_by_id, cb.name as created_by_name,
       ub.id as updated_by_id, ub.name as updated_by_name
FROM stakeholders s
LEFT JOIN team_members o ON s.owner_id = o.id
LEFT JOIN users cb ON s.created_by = cb.id
LEFT JOIN users ub ON s.updated_by = ub.id
WHERE s.id = ?;
```

**Response**: Stakeholder object (see Screen 1, Action 1)

**UI Update**: Render stakeholder details form

##### Action 2: User Updates Stakeholder

**Frontend**:
1. User edits any field
2. If power or interest level changes, quadrant updates in real-time
3. Auto-save on blur OR explicit "Save" button

**API Call**:
```http
PUT /api/artifacts/stakeholders/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "stakeholderName": "Sarah Johnson",
  "powerLevel": "HIGH",
  "interestLevel": "MEDIUM",
  "engagementStrategy": "Updated strategy...",
  "email": "new.email@company.com"
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\stakeholder.controller.ts` - `@Put(':id')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\stakeholder.service.ts` - `update()`

**Backend Flow**:
1. **Load Stakeholder**:
   ```sql
   SELECT * FROM stakeholders WHERE id = ?;
   ```
   - If not found: throw `NotFoundException('Stakeholder not found')`

2. **Check Archived**:
   ```typescript
   if (stakeholder.isArchived) {
     throw new BadRequestException('Archived stakeholders cannot be modified');
   }
   ```

3. **Validate Owner** (if changed):
   - Same validation as create

4. **Check Duplicate Name+Role** (if either changed):
   ```typescript
   if (dto.stakeholderName || dto.role) {
     const newName = dto.stakeholderName || stakeholder.stakeholderName;
     const newRole = dto.role || stakeholder.role;

     if (newName !== stakeholder.stakeholderName || newRole !== stakeholder.role) {
       const existingStakeholder = await this.stakeholderRepository.findOne({
         where: {
           project: { id: stakeholder.project.id },
           stakeholderName: newName,
           role: newRole,
         },
       });
       if (existingStakeholder && existingStakeholder.id !== id) {
         throw new BadRequestException(
           'A stakeholder with this name and role already exists in this project'
         );
       }
     }
   }
   ```

5. **Update Fields**:
   ```typescript
   if (dto.stakeholderName !== undefined) stakeholder.stakeholderName = dto.stakeholderName;
   if (dto.role !== undefined) stakeholder.role = dto.role;
   if (dto.powerLevel !== undefined) stakeholder.powerLevel = dto.powerLevel;
   if (dto.interestLevel !== undefined) stakeholder.interestLevel = dto.interestLevel;
   // ... all fields ...
   ```

6. **Recalculate Quadrant** (if power or interest changed):
   ```typescript
   if (dto.powerLevel !== undefined || dto.interestLevel !== undefined) {
     stakeholder.quadrant = this.calculateQuadrant(
       stakeholder.powerLevel,
       stakeholder.interestLevel
     );
   }
   ```

7. **Update Stakeholder**:
   ```sql
   UPDATE stakeholders
   SET stakeholder_name = ?, role = ?, power_level = ?, interest_level = ?,
       quadrant = ?, engagement_strategy = ?, communication_frequency = ?,
       email = ?, phone = ?, notes = ?, owner_id = ?,
       updated_by = ?, updated_at = NOW()
   WHERE id = ?;
   ```

**Response**: Updated stakeholder object

**UI Update**: Update displayed fields, quadrant badge changes if needed

##### Action 3: User Archives Stakeholder

**Frontend**:
1. User clicks "Archive Stakeholder" button
2. Confirmation modal: "Archive this stakeholder? They will be hidden from the active list."
3. User confirms

**API Call**:
```http
PATCH /api/artifacts/stakeholders/:id/archive
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\stakeholder.controller.ts` - `@Patch(':id/archive')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\stakeholder.service.ts` - `archive()`

**Backend Flow**:
1. **Load Stakeholder**

2. **Check Not Already Archived**:
   ```typescript
   if (stakeholder.isArchived) {
     throw new BadRequestException('This stakeholder is already archived');
   }
   ```

3. **Archive Stakeholder**:
   ```sql
   UPDATE stakeholders
   SET is_archived = TRUE, archived_date = NOW(), updated_by = ?, updated_at = NOW()
   WHERE id = ?;
   ```

**Response**: Updated stakeholder object with `isArchived: true`

**UI Update**:
1. Show success toast: "Stakeholder archived successfully"
2. Navigate back to stakeholder list
3. Stakeholder no longer appears unless "Include Archived" is checked

##### Action 4: User Deletes Stakeholder

**Frontend**:
1. User clicks "Delete Stakeholder" button
2. Confirmation modal: "Permanently delete this stakeholder? This cannot be undone."
3. User types stakeholder name to confirm
4. User clicks "Delete"

**API Call**:
```http
DELETE /api/artifacts/stakeholders/:id
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\stakeholder.controller.ts` - `@Delete(':id')`
- **Service**: `F:\StandupSnap\backend\src\artifacts\stakeholder.service.ts` - `delete()`

**Query**:
```sql
DELETE FROM stakeholders WHERE id = ?;
```

**Response**:
```json
{
  "message": "Stakeholder deleted successfully"
}
```

**UI Update**:
1. Show success toast
2. Navigate back to stakeholder list

---

## Business Rules

### BR-01: Project Association
**Rule**: Every stakeholder must belong to an existing project
**Enforcement**: Foreign key constraint + backend validation
**Error**: "Project not found"

### BR-02: Unique Name+Role Combination
**Rule**: Cannot have duplicate stakeholder with same name AND role in same project
**Enforcement**: Database unique constraint + backend validation
**Error**: "A stakeholder with this name and role already exists in this project"
**Note**: Same person can have multiple roles (e.g., "John Doe - CEO" and "John Doe - Board Member")

### BR-03: Owner Validation
**Rule**: Owner must be regular team member (not special roles like user-{id})
**Enforcement**: Backend validation in create() and update()
**Error**: "Stakeholder owner must be a regular team member. Please add team members to the project and select one as the owner."

### BR-04: Owner Project Association
**Rule**: Owner must be assigned to the project
**Enforcement**: Backend validation via team_member_projects join
**Error**: "Owner not part of this project"

### BR-05: Automatic Quadrant Calculation
**Rule**: Quadrant is automatically calculated based on power and interest levels
**Enforcement**: Backend calculation in create() and update()
**Algorithm**:
- High Power + High Interest → MANAGE_CLOSELY
- High Power + (Low or Medium Interest) → KEEP_SATISFIED
- (Low or Medium Power) + High Interest → KEEP_INFORMED
- (Low or Medium Power) + (Low or Medium Interest) → MONITOR

### BR-06: Quadrant Recalculation on Update
**Rule**: When power or interest level changes, quadrant is recalculated automatically
**Enforcement**: Backend logic in update()
**Trigger**: Any change to `powerLevel` or `interestLevel`

### BR-07: Archive Restriction
**Rule**: Archived stakeholders cannot be modified
**Enforcement**: Backend validation in update()
**Error**: "Archived stakeholders cannot be modified"

### BR-08: Archive Duplicate Check
**Rule**: Cannot archive already-archived stakeholder
**Enforcement**: Backend validation in archive()
**Error**: "This stakeholder is already archived"

### BR-09: Filter Default - Exclude Archived
**Rule**: By default, archived stakeholders are hidden unless explicitly requested
**Enforcement**: Backend query builder in findByProject()
**Override**: Set `includeArchived=true` query param

### BR-10: Search Case-Insensitive
**Rule**: Search queries are case-insensitive
**Enforcement**: SQL `ILIKE` operator
**Fields**: stakeholderName, role, email

---

## Complete User Journeys

### Journey 1: Stakeholder Mapping for New Project

**Scenario**: Project Manager maps stakeholders for new e-commerce platform project

**Week 1** - Identify Key Stakeholders:

1. **Navigate to Stakeholders**: `/projects/{id}/artifacts/stakeholders`

2. **Add CEO** (High Power, High Interest):
   - Click "+ Add Stakeholder"
   - Stakeholder Name: "Sarah Johnson"
   - Role: "CEO"
   - Power Level: HIGH
   - Interest Level: HIGH
   - **Auto-Quadrant**: MANAGE_CLOSELY (red badge)
   - Engagement Strategy: "Weekly steering committee meetings. Monthly one-on-ones for strategic decisions. Immediate escalation for budget changes >$50k."
   - Communication Frequency: WEEKLY
   - Email: sarah.johnson@company.com
   - Owner: "Project Manager"
   - Notes: "Prefers data-driven presentations. Strong focus on ROI. Available Mon-Thu 2-4pm for urgent items."
   - **API**: `POST /api/artifacts/stakeholders`

3. **Add CFO** (High Power, Low Interest):
   - Stakeholder Name: "Michael Chen"
   - Role: "CFO"
   - Power Level: HIGH
   - Interest Level: LOW
   - **Auto-Quadrant**: KEEP_SATISFIED (orange badge)
   - Engagement Strategy: "Monthly budget reviews. Quarterly financial summaries. Approval required for any expense >$25k."
   - Communication Frequency: MONTHLY
   - **API**: `POST /api/artifacts/stakeholders`

4. **Add Development Team Lead** (Medium Power, High Interest):
   - Stakeholder Name: "Alex Rodriguez"
   - Role: "Development Team Lead"
   - Power Level: MEDIUM
   - Interest Level: HIGH
   - **Auto-Quadrant**: KEEP_INFORMED (yellow badge)
   - Engagement Strategy: "Daily standup attendance. Weekly sprint planning and reviews. Direct Slack communication for technical decisions."
   - Communication Frequency: DAILY
   - **API**: `POST /api/artifacts/stakeholders`

5. **Add Regulatory Compliance Officer** (Low Power, Low Interest):
   - Stakeholder Name: "Janet Martinez"
   - Role: "Compliance Officer"
   - Power Level: LOW
   - Interest Level: LOW
   - **Auto-Quadrant**: MONITOR (green badge)
   - Engagement Strategy: "Quarterly compliance updates. Immediate notification of any privacy/security incidents."
   - Communication Frequency: AD_HOC
   - **API**: `POST /api/artifacts/stakeholders`

6. **Add End Users** (Low Power, High Interest):
   - Stakeholder Name: "Customer Segment A"
   - Role: "End Users (Premium Tier)"
   - Power Level: LOW
   - Interest Level: HIGH
   - **Auto-Quadrant**: KEEP_INFORMED (yellow badge)
   - Engagement Strategy: "Monthly beta testing sessions. Feedback surveys after each major release. User forum monitoring."
   - Communication Frequency: MONTHLY
   - **API**: `POST /api/artifacts/stakeholders`

**Result**: 5 stakeholders mapped across all 4 quadrants

**Week 2** - Review Power-Interest Grid:

7. **Switch to Grid View**:
   - Click "View Grid" toggle
   - Grid shows distribution:
     - **MANAGE_CLOSELY** (High/High): CEO (1)
     - **KEEP_SATISFIED** (High/Low): CFO (1)
     - **KEEP_INFORMED** (Low/High): Dev Lead, End Users (2)
     - **MONITOR** (Low/Low): Compliance Officer (1)

8. **Export Stakeholder Matrix**:
   - Click "Export to CSV"
   - **API**: `GET /api/artifacts/stakeholders/project/:projectId/export?format=csv`
   - Share with project sponsor for review

---

### Journey 2: Stakeholder Reclassification

**Scenario**: CFO becomes more interested in project after budget issues

**Initial State**:
- Stakeholder: "Michael Chen - CFO"
- Power: HIGH
- Interest: LOW
- Quadrant: KEEP_SATISFIED (orange)
- Communication: Monthly

**Trigger**: Budget overrun incident requires CFO active involvement

**Update**:
1. Navigate to stakeholder details
2. Edit stakeholder:
   - Interest Level: LOW → HIGH
   - **Auto-Quadrant Recalculation**: KEEP_SATISFIED → MANAGE_CLOSELY (orange → red)
   - Communication Frequency: MONTHLY → WEEKLY
   - Engagement Strategy (update): "**Updated due to budget concerns**: Weekly budget meetings. Real-time expense tracking dashboard access. Approval required for ANY expense changes. Daily summary email of expenditures."
   - Notes (append): "CFO requested active involvement after Q1 budget overrun. Now part of core steering committee."
3. **API**: `PUT /api/artifacts/stakeholders/:id`
4. **Backend**: Quadrant recalculated automatically

**Result**:
- CFO now in MANAGE_CLOSELY quadrant
- Grid view shows 2 stakeholders in High Power + High Interest quadrant
- Engagement strategy reflects increased involvement

---

## Integration Points

### Integration 1: Project Module
- **Dependency**: Stakeholders belong to projects
- **Relationship**: Many-to-one (many stakeholders per project)
- **Constraint**: Deleting project cascades to stakeholders
- **Foreign Key**: `project_id` → `projects(id)` ON DELETE CASCADE

### Integration 2: Team Members Module
- **Dependency**: Owners are team members
- **Relationship**: Many-to-one (many stakeholders per owner)
- **Constraint**: Owner deletion sets owner to NULL
- **Foreign Key**: `owner_id` → `team_members(id)` ON DELETE SET NULL
- **Validation**: Owner must be in project's team

### Integration 3: User Module
- **Dependency**: Audit fields (createdBy, updatedBy)
- **Relationship**: Many-to-one (many stakeholders per user)
- **Constraint**: Soft delete (ON DELETE SET NULL)
- **Foreign Keys**: `created_by`, `updated_by` → `users(id)` ON DELETE SET NULL

### Integration 4: Authentication
- **Requirement**: JWT authentication for all endpoints
- **Authorization**: Project access required
- **User Context**: `req.user.id` used for audit fields

---

## Error Handling

### Error 1: Stakeholder Not Found
**Trigger**: Invalid stakeholder ID
**Response**: 404 `NotFoundException('Stakeholder not found')`
**UI**: Error toast, redirect to list

### Error 2: Project Not Found
**Trigger**: Creating stakeholder with invalid project ID
**Response**: 404 `NotFoundException('Project not found')`
**UI**: Error toast

### Error 3: Duplicate Name+Role
**Trigger**: Creating/updating stakeholder with existing name+role combination
**Response**: 400 `BadRequestException('A stakeholder with this name and role already exists in this project')`
**UI**: Error toast, highlight name and role fields

### Error 4: Owner Not Found
**Trigger**: Setting non-existent owner
**Response**: 404 `NotFoundException('Owner not found')`
**UI**: Error toast

### Error 5: Owner Not in Project
**Trigger**: Owner not assigned to project
**Response**: 400 `BadRequestException('Owner not part of this project')`
**UI**: Error toast with message

### Error 6: Invalid Owner Type
**Trigger**: Trying to set user-{id} as owner
**Response**: 400 `BadRequestException('Stakeholder owner must be a regular team member')`
**UI**: Error toast

### Error 7: Archived Stakeholder Modification
**Trigger**: Updating archived stakeholder
**Response**: 400 `BadRequestException('Archived stakeholders cannot be modified')`
**UI**: Error toast, disable edit controls

### Error 8: Already Archived
**Trigger**: Archiving already-archived stakeholder
**Response**: 400 `BadRequestException('This stakeholder is already archived')`
**UI**: Error toast

### Error 9: Unauthorized Access
**Trigger**: User not authenticated or no project access
**Response**: 401 `UnauthorizedException('Unauthorized')`
**UI**: Redirect to login

---

## API Endpoint Reference

### POST /api/artifacts/stakeholders
**Purpose**: Create new stakeholder
**Auth**: Required (JWT)
**Request Body**: CreateStakeholderDto (see Journey 1)
**Response**: Stakeholder object

### GET /api/artifacts/stakeholders/project/:projectId
**Purpose**: Get filtered stakeholders for project
**Auth**: Required (JWT)
**Query Params**:
- `powerLevel`: PowerLevel (optional)
- `interestLevel`: InterestLevel (optional)
- `includeArchived`: boolean (optional, default false)
- `search`: string (optional)
**Response**: Stakeholder[]

### GET /api/artifacts/stakeholders/:id
**Purpose**: Get single stakeholder details
**Auth**: Required (JWT)
**Response**: Stakeholder object

### PUT /api/artifacts/stakeholders/:id
**Purpose**: Update stakeholder (auto-recalculates quadrant if power/interest changed)
**Auth**: Required (JWT)
**Request Body**: UpdateStakeholderDto (partial fields)
**Response**: Updated Stakeholder object

### PATCH /api/artifacts/stakeholders/:id/archive
**Purpose**: Archive stakeholder
**Auth**: Required (JWT)
**Response**: Updated Stakeholder object with `isArchived: true`

### DELETE /api/artifacts/stakeholders/:id
**Purpose**: Permanently delete stakeholder
**Auth**: Required (JWT)
**Response**: `{ message: "Stakeholder deleted successfully" }`

### GET /api/artifacts/stakeholders/project/:projectId/export
**Purpose**: Export stakeholders to CSV
**Auth**: Required (JWT)
**Query Params**: Same as GET project stakeholders + `format=csv`
**Response**: CSV file download

---

## File References

### Backend Files
- **Controller**: `F:\StandupSnap\backend\src\artifacts\stakeholder.controller.ts`
- **Service**: `F:\StandupSnap\backend\src\artifacts\stakeholder.service.ts`
- **Entity**: `F:\StandupSnap\backend\src\entities\stakeholder.entity.ts`
- **DTOs**:
  - `F:\StandupSnap\backend\src\artifacts\dto\create-stakeholder.dto.ts`
  - `F:\StandupSnap\backend\src\artifacts\dto\update-stakeholder.dto.ts`
- **Module**: `F:\StandupSnap\backend\src\artifacts\artifacts.module.ts`

### Frontend Files
- **Pages**:
  - `F:\StandupSnap\frontend\src\pages\artifacts\StakeholdersPage.tsx`
  - `F:\StandupSnap\frontend\src\pages\artifacts\StakeholderDetailsPage.tsx`
- **Components**:
  - `F:\StandupSnap\frontend\src\components\artifacts\StakeholderCard.tsx`
  - `F:\StandupSnap\frontend\src\components\artifacts\PowerInterestGrid.tsx`
  - `F:\StandupSnap\frontend\src\components\artifacts\StakeholderForm.tsx`

---

## Summary

The Stakeholders & Power-Interest Grid module provides stakeholder analysis and engagement planning capabilities:

1. **Stakeholder Register**: Capture stakeholder details with contact information
2. **Power-Interest Classification**: Categorize by power (influence) and interest (involvement) levels
3. **Automatic Quadrant Assignment**: System calculates quadrant based on power+interest:
   - Manage Closely (High/High): Close partnership
   - Keep Satisfied (High/Low): Keep happy
   - Keep Informed (Low/High): Involve & inform
   - Monitor (Low/Low): Minimal effort
4. **Engagement Planning**: Define strategies and communication frequency per stakeholder
5. **Grid Visualization**: 2x2 matrix view showing stakeholder distribution
6. **Filtering & Search**: Find stakeholders by power, interest, or text search
7. **CSV Export**: Download stakeholder matrix for reporting
8. **Archive**: Hide inactive stakeholders while preserving data
9. **Reclassification**: Automatically updates quadrant when power/interest changes

The module enforces business rules around unique name+role combinations, owner validation, automatic quadrant calculation, and archive restrictions while providing both list and grid visualization options for effective stakeholder management.
