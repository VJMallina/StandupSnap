# Cards (Work Items) - How It Works

## Overview
- **Purpose**: Core work item management system for tracking tasks within sprints
- **Key Features**: CRUD operations, status workflow, priority levels, assignee management, RAG (Red-Amber-Green) status tracking, estimated time tracking, external ID integration (Jira)
- **Integration**: Links to Sprints, Team Members, Projects, and Snaps (Daily Updates)

## Database Schema

### Card Entity
**Table**: `cards`
**File**: `F:\StandupSnap\backend\src\entities\card.entity.ts`

#### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto-generated |
| `project` | Relation | Parent project | ManyToOne, CASCADE delete |
| `sprint` | Relation | Sprint assignment | ManyToOne, CASCADE delete |
| `assignee` | Relation | Assigned team member | ManyToOne, CASCADE delete |
| `title` | String | Card title | Required |
| `description` | Text | Detailed description | Optional |
| `externalId` | String | External reference (e.g., Jira ID) | Optional |
| `priority` | Enum | Priority level | Default: MEDIUM |
| `estimatedTime` | Integer | Estimated hours (ET) | Required, >= 1 |
| `status` | Enum | Current status | Default: NOT_STARTED |
| `ragStatus` | Enum | RAG status indicator | Optional, calculated |
| `completedAt` | Timestamp | Completion date | Nullable |
| `snaps` | Relation | Daily updates | OneToMany |
| `createdAt` | Timestamp | Creation timestamp | Auto-generated |
| `updatedAt` | Timestamp | Last update timestamp | Auto-updated |

#### Enums

```typescript
export enum CardStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

export enum CardPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum CardRAG {
  RED = 'red',
  AMBER = 'amber',
  GREEN = 'green',
}
```

### CardRAGHistory Entity
**Table**: `card_rag_history`
**File**: `F:\StandupSnap\backend\src\entities\card-rag-history.entity.ts`

Tracks daily RAG status changes for audit and trend analysis.

#### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `card` | Relation | Parent card |
| `cardId` | String | Card reference |
| `date` | Date | History date |
| `ragStatus` | Enum | RAG status for that day |
| `isOverridden` | Boolean | Manual override flag |
| `overriddenBy` | Relation | User who overrode (nullable) |
| `notes` | Text | Override notes (optional) |
| `createdAt` | Timestamp | Record creation time |

**Unique Constraint**: One entry per card per day (`cardId`, `date`)

---

## Screens & Pages

### Screen 1: Cards List Page
**Route**: `/cards`
**Access**: Requires `VIEW_CARD` permission
**Component**: `F:\StandupSnap\frontend\src\pages\cards\CardsListPage.tsx`

#### UI Components
- **Header Banner**: Gradient header with "Cards" title
- **Create Card Button**: Top-right, disabled if no project selected or project is archived
- **Filter Section**:
  - Project dropdown (required first)
  - Sprint dropdown (filtered by selected project)
  - Assignee dropdown (filtered by project team)
  - RAG status dropdown
  - Status dropdown
  - Priority dropdown
  - Search input (title or external ID)
- **Clear Filters Button**: Appears when filters are active
- **Cards Grid**: 3-column responsive grid (1 column on mobile, 2 on tablet, 3 on desktop)
- **Empty State**: Helpful message when no cards found

#### Card Display (Grid Item)
Each card shows:
- **RAG Status Bar**: Color-coded top border (red/amber/green)
- **Lock Icon**: If sprint is closed or card is closed
- **Title**: Card title (truncated)
- **External ID**: Below title (if present)
- **Priority Badge**: Top-right corner
- **Sprint Name**: With lightning icon
- **Assignee Name**: With user icon
- **Estimated Time**: With clock icon (hours)
- **Snaps Count**: Large number with document icon background
- **Status Badge**: Bottom-left
- **RAG Badge**: Bottom-left, next to status
- **Delete Button**: Appears on hover (if not locked)
- **Hover Effects**: Elevation, border color change, glow effect

#### User Actions

##### Action 1: View Cards List with Filters (M7-UC05)

**What happens**: Load and filter cards

**Frontend**:
1. Page loads, automatically calls `loadProjects()`
2. User sees project dropdown populated
3. User selects project → triggers `loadSprints()` and `loadTeamMembers()`
4. User can now apply filters
5. Each filter change triggers `loadCards()` with query parameters

**API Call**:
```http
GET /api/cards?projectId={uuid}&sprintId={uuid}&assigneeId={uuid}&ragStatus={rag}&status={status}&priority={priority}&search={query}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\card\card.controller.ts` - `@Get()`
- **Service**: `F:\StandupSnap\backend\src\card\card.service.ts` - `findAll()`

**Backend Flow**:
1. Build QueryBuilder for `cards` table
2. Join with `project`, `sprint`, `assignee` relations
3. Count snaps with `loadRelationCountAndMap`
4. Apply filters sequentially:
   - **Project Filter**: `card.project.id = :projectId`
   - **Sprint Filter**: `card.sprint.id = :sprintId`
   - **Assignee Filter**: `card.assignee.id = :assigneeId`
   - **RAG Filter**: `card.ragStatus = :ragStatus`
   - **Status Filter**: `card.status = :status`
   - **Priority Filter**: `card.priority = :priority`
   - **Search Filter**: `LOWER(card.title) LIKE LOWER(:search) OR LOWER(card.externalId) LIKE LOWER(:search)`
5. Order by: `sprint.startDate ASC`, then `card.title ASC`
6. Execute query and return cards array

**Database**:
```sql
SELECT
  card.*,
  project.*,
  sprint.*,
  assignee.*,
  COUNT(snaps.id) as snapsCount
FROM cards card
LEFT JOIN projects project ON card.project_id = project.id
LEFT JOIN sprints sprint ON card.sprint_id = sprint.id
LEFT JOIN team_members assignee ON card.assignee_id = assignee.id
LEFT JOIN snaps ON snaps.card_id = card.id
WHERE
  card.project_id = ?
  AND card.sprint_id = ?
  [... additional filters ...]
GROUP BY card.id
ORDER BY sprint.startDate ASC, card.title ASC
```

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "Implement user authentication",
    "description": "Add JWT-based auth",
    "externalId": "JIRA-1234",
    "priority": "high",
    "estimatedTime": 16,
    "status": "in_progress",
    "ragStatus": "green",
    "completedAt": null,
    "snapsCount": 5,
    "project": { ... },
    "sprint": { ... },
    "assignee": { ... },
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-20T14:30:00Z"
  }
]
```

**UI Update**:
- Cards render in grid layout
- Filter counts update
- Loading spinner disappears
- Empty state shows if no results

---

##### Action 2: Click on Card → Navigate to Details

**What happens**: Navigate to card details page

**Frontend**:
```typescript
onClick={() => navigate(`/cards/${card.id}`)}
```

**Navigation**: Redirects to `/cards/{id}`

---

##### Action 3: Click "Create Card" Button

**What happens**: Open Create Card Modal

**Requirements**:
- Project must be selected
- Project must not be archived
- Button disabled otherwise

**Frontend**:
```typescript
setShowCreateModal(true)
```

**Component**: `CreateCardModal` renders

---

### Screen 2: Create Card Modal
**Component**: `F:\StandupSnap\frontend\src\components\cards\CreateCardModal.tsx`
**Trigger**: Click "Create Card" button on Cards List Page

#### UI Components
- **Modal Header**: Gradient banner with "Create Card" title
- **Form Fields**:
  1. **Card Title** (required): Text input
  2. **Sprint** (required): Dropdown (only open sprints shown)
  3. **Assignee** (required): Dropdown (project team members only)
  4. **Estimated Time** (required): Number input, min=1, step=0.5
  5. **External ID** (optional): Text input (e.g., JIRA-1234)
  6. **Priority** (optional): Dropdown, default=MEDIUM
  7. **Description** (optional): Textarea (4 rows)
- **Action Buttons**: "Create Card" (primary), "Cancel" (secondary)
- **Validation Messages**: Error alerts at top

#### User Actions

##### Action 1: User Fills Form and Clicks "Create Card" (M7-UC01)

**What happens**: Create new card in system

**Frontend Flow**:
1. User fills required fields: title, sprint, assignee, estimatedTime
2. Optional fields: description, externalId, priority
3. On submit, form validates all required fields present
4. Sets `loading` state to true
5. Calls `cardsApi.create()`

**API Call**:
```http
POST /api/cards
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "projectId": "uuid",
  "sprintId": "uuid",
  "assigneeId": "uuid",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication with refresh tokens",
  "externalId": "JIRA-1234",
  "priority": "high",
  "estimatedTime": 16
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\card\card.controller.ts` - `@Post()`
- **Guard**: `JwtAuthGuard`, `PermissionsGuard`
- **Permission**: `CREATE_CARD`
- **Service**: `F:\StandupSnap\backend\src\card\card.service.ts` - `create()`

**Backend Flow** (Lines 37-107):
1. **Extract DTO fields**: `projectId`, `sprintId`, `assigneeId`, `title`, `description`, `externalId`, `priority`, `estimatedTime`

2. **Validate Project** (Lines 40-51):
   ```typescript
   const project = await this.projectRepository.findOne({
     where: { id: projectId },
   });

   if (!project) {
     throw new NotFoundException(`Project with ID ${projectId} not found`);
   }

   if (project.isArchived) {
     throw new BadRequestException('Cannot create cards in archived project');
   }
   ```

3. **Validate Sprint** (Lines 53-69):
   ```typescript
   const sprint = await this.sprintRepository.findOne({
     where: { id: sprintId },
     relations: ['project'],
   });

   if (!sprint) {
     throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
   }

   if (sprint.project.id !== projectId) {
     throw new BadRequestException('Sprint does not belong to the specified project');
   }

   if (sprint.isClosed) {
     throw new BadRequestException('Cannot create cards in a closed sprint');
   }
   ```

4. **Validate Estimated Time (ET)** (Lines 71-74):
   ```typescript
   if (!estimatedTime || estimatedTime < 1) {
     throw new BadRequestException('Estimated Time is required and must be at least 1 hour');
   }
   ```

   **Business Rule BR-CARD-001**: Estimated Time (ET) is MANDATORY and must be >= 1 hour

5. **Validate Assignee** (Lines 76-90):
   ```typescript
   const assignee = await this.teamMemberRepository.findOne({
     where: { id: assigneeId },
     relations: ['projects'],
   });

   if (!assignee) {
     throw new NotFoundException(`Team member with ID ${assigneeId} not found`);
   }

   // Verify assignee is part of the project team
   const isInProject = assignee.projects.some(p => p.id === projectId);
   if (!isInProject) {
     throw new BadRequestException('Assignee must be a member of the project team');
   }
   ```

   **Business Rule BR-CARD-002**: Assignee must be a member of the project team

6. **Create Card Entity** (Lines 92-104):
   ```typescript
   const card = this.cardRepository.create({
     title,
     description,
     externalId,
     priority: priority || CardPriority.MEDIUM,
     estimatedTime,
     status: CardStatus.NOT_STARTED,
     ragStatus: null, // Will be calculated when snaps are added
     project,
     sprint,
     assignee,
   });
   ```

7. **Save to Database**:
   ```typescript
   return this.cardRepository.save(card);
   ```

**Database**:
```sql
INSERT INTO cards (
  id, project_id, sprint_id, assignee_id,
  title, description, externalId, priority,
  estimatedTime, status, ragStatus, completedAt,
  createdAt, updatedAt
) VALUES (
  gen_random_uuid(), ?, ?, ?,
  ?, ?, ?, ?,
  ?, 'not_started', NULL, NULL,
  NOW(), NOW()
) RETURNING *
```

**Response**:
```json
{
  "id": "uuid",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication with refresh tokens",
  "externalId": "JIRA-1234",
  "priority": "high",
  "estimatedTime": 16,
  "status": "not_started",
  "ragStatus": null,
  "completedAt": null,
  "project": { ... },
  "sprint": { ... },
  "assignee": { ... },
  "createdAt": "2025-01-20T15:30:00Z",
  "updatedAt": "2025-01-20T15:30:00Z"
}
```

**UI Update**:
- Modal closes
- Success callback triggers `loadCards()` on parent page
- New card appears in grid
- Success message (implicit from modal close)

**Error Handling**:
- If project not found: "Project with ID {id} not found"
- If project archived: "Cannot create cards in archived project"
- If sprint not found: "Sprint with ID {id} not found"
- If sprint doesn't belong to project: "Sprint does not belong to the specified project"
- If sprint is closed: "Cannot create cards in a closed sprint"
- If ET missing/invalid: "Estimated Time is required and must be at least 1 hour"
- If assignee not found: "Team member with ID {id} not found"
- If assignee not in project: "Assignee must be a member of the project team"

---

### Screen 3: Card Details Page
**Route**: `/cards/:id`
**Access**: Requires `VIEW_CARD` permission
**Component**: `F:\StandupSnap\frontend\src\pages\cards\CardDetailsPage.tsx`

#### UI Components
- **Back Button**: Navigate to cards list (preserves project filter)
- **Header Section**:
  - Card title (large, bold)
  - Lock icon (if sprint closed or card closed)
  - External ID (below title)
  - Status badge
  - Priority badge with icon
  - Action buttons: Edit, Mark Completed, Delete
- **Lock Warning**: Yellow alert if sprint closed
- **Main Content Grid** (2 columns on desktop):
  - **Left Column (2/3 width)**:
    - Card Information panel
    - Description (if present)
    - Project info with link
    - Sprint info with link
    - Assignee info
    - Estimated time
    - Completed date (if completed)
  - **Right Column (1/3 width)**:
    - RAG Status card (large badge)
    - Sprint Details card (period, status)
- **Snaps Section**: Full-width below grid
  - Shows all snaps for this card
  - Uses `SnapsList` component
- **Metadata Section**: Card ID, created date, updated date

#### User Actions

##### Action 1: View Card Details (M7-UC04)

**What happens**: Load complete card information

**Frontend**:
1. Extract `id` from URL params
2. On mount, call `loadCard()`

**API Call**:
```http
GET /api/cards/:id
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\card\card.controller.ts` - `@Get(':id')`
- **Permission**: `VIEW_CARD`
- **Service**: `F:\StandupSnap\backend\src\card\card.service.ts` - `findOne()`

**Backend Flow** (Lines 174-185):
```typescript
async findOne(id: string): Promise<Card> {
  const card = await this.cardRepository.findOne({
    where: { id },
    relations: ['project', 'sprint', 'assignee'],
  });

  if (!card) {
    throw new NotFoundException(`Card with ID ${id} not found`);
  }

  return card;
}
```

**Database**:
```sql
SELECT
  card.*,
  project.*,
  sprint.*,
  assignee.*
FROM cards card
LEFT JOIN projects project ON card.project_id = project.id
LEFT JOIN sprints sprint ON card.sprint_id = sprint.id
LEFT JOIN team_members assignee ON card.assignee_id = assignee.id
WHERE card.id = ?
```

**Response**: Same as create response, with full relations

**UI Update**:
- All card details populate
- RAG badge displays with appropriate color
- Action buttons enable/disable based on permissions and lock status
- Snaps section loads separately

---

##### Action 2: Click "Edit Card" Button

**What happens**: Open Edit Card Modal

**Conditions**:
- Card not locked (sprint not closed, card not closed)
- Project not archived
- User has `EDIT_CARD` permission

**Frontend**:
```typescript
setShowEditModal(true)
```

**Component**: `EditCardModal` renders with current card data pre-filled

---

### Screen 4: Edit Card Modal
**Component**: `F:\StandupSnap\frontend\src\components\cards\EditCardModal.tsx`
**Trigger**: Click "Edit Card" button on Card Details Page

#### UI Components
- **Modal Header**: Gradient banner with "Edit Card" title
- **Sprint Change Warning**: Yellow alert if sprint is being changed
- **Form Fields** (pre-filled with current values):
  1. **Card Title** (required)
  2. **Sprint** (required): Shows current sprint, allows change with restrictions
  3. **Assignee** (required): Project team members
  4. **Estimated Time** (required): Number input
  5. **External ID** (optional)
  6. **Priority** (optional)
  7. **Description** (optional)
- **Helper Text**: Warnings about sprint changes, ET recalculation
- **Action Buttons**: "Save Changes" (disabled if no changes), "Cancel"

#### User Actions

##### Action 1: User Edits Card and Clicks "Save Changes" (M7-UC02)

**What happens**: Update card with new values

**Frontend Flow**:
1. Form pre-populated with current card data
2. User modifies fields
3. `hasChanges` computed property tracks if any field changed
4. On submit, only send changed fields
5. Special handling:
   - If `assigneeId` unchanged, don't send it
   - If `sprintId` unchanged, don't send it

**API Call**:
```http
PATCH /api/cards/:id
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "title": "Updated title",
  "description": "Updated description",
  "externalId": "JIRA-1234-UPDATED",
  "priority": "critical",
  "estimatedTime": 20,
  "assigneeId": "uuid",  // Only if changed
  "sprintId": "uuid"     // Only if changed
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\card\card.controller.ts` - `@Patch(':id')`
- **Permission**: `EDIT_CARD`
- **Service**: `F:\StandupSnap\backend\src\card\card.service.ts` - `update()`

**Backend Flow** (Lines 195-278):

1. **Load Existing Card** (Line 196):
   ```typescript
   const card = await this.findOne(id);
   ```

2. **Validate Project Status** (Lines 198-201):
   ```typescript
   if (card.project.isArchived) {
     throw new BadRequestException('Cannot update cards in archived project');
   }
   ```

3. **Validate Sprint Status** (Lines 203-206):
   ```typescript
   if (card.sprint.isClosed) {
     throw new BadRequestException('Cannot edit card in a closed sprint');
   }
   ```

4. **Update Basic Fields** (Lines 210-214):
   ```typescript
   if (title !== undefined) card.title = title;
   if (description !== undefined) card.description = description;
   if (externalId !== undefined) card.externalId = externalId;
   if (priority !== undefined) card.priority = priority;
   ```

5. **Validate and Update Estimated Time** (Lines 216-222):
   ```typescript
   if (estimatedTime !== undefined) {
     if (estimatedTime < 1) {
       throw new BadRequestException('Estimated Time must be at least 1 hour');
     }
     card.estimatedTime = estimatedTime;
   }
   ```

6. **Update Assignee (if changed)** (Lines 224-242):
   ```typescript
   if (assigneeId) {
     const newAssignee = await this.teamMemberRepository.findOne({
       where: { id: assigneeId },
       relations: ['projects'],
     });

     if (!newAssignee) {
       throw new NotFoundException(`Team member with ID ${assigneeId} not found`);
     }

     // Verify assignee is part of the project team
     const isInProject = newAssignee.projects.some(p => p.id === card.project.id);
     if (!isInProject) {
       throw new BadRequestException('Assignee must be a member of the project team');
     }

     card.assignee = newAssignee;
   }
   ```

7. **Handle Sprint Change (with restrictions)** (Lines 244-269):
   ```typescript
   if (sprintId && sprintId !== card.sprint.id) {
     const newSprint = await this.sprintRepository.findOne({
       where: { id: sprintId },
       relations: ['project'],
     });

     if (!newSprint) {
       throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
     }

     if (newSprint.project.id !== card.project.id) {
       throw new BadRequestException('Cannot move card to a sprint in a different project');
     }

     // Cannot move to a closed sprint
     if (newSprint.isClosed) {
       throw new BadRequestException('Cannot move card to a closed sprint');
     }

     // TODO: Add validation when Snap module is implemented
     // - Cannot move card if it has snaps
     // - Cannot move card to a completed sprint if it has snaps

     card.sprint = newSprint;
   }
   ```

   **Business Rule BR-CARD-003**: Cannot move card to a different project
   **Business Rule BR-CARD-004**: Cannot move card to a closed sprint
   **Future Business Rule**: Cannot move card if it has snaps

8. **Save Updated Card** (Line 272):
   ```typescript
   const updatedCard = await this.cardRepository.save(card);
   ```

9. **TODO: Recalculate RAG** (Lines 274-275):
   ```typescript
   // TODO: Recalculate RAG when Snap module is implemented
   // this.recalculateRAG(updatedCard.id);
   ```

10. **Return Updated Card with Relations** (Line 277):
    ```typescript
    return this.findOne(updatedCard.id);
    ```

**Database**:
```sql
UPDATE cards
SET
  title = ?,
  description = ?,
  externalId = ?,
  priority = ?,
  estimatedTime = ?,
  assignee_id = ?,  -- If changed
  sprint_id = ?,    -- If changed
  updatedAt = NOW()
WHERE id = ?
RETURNING *
```

**Response**: Updated card object with all relations

**UI Update**:
- Modal closes
- Card details page refreshes via `loadCard()`
- Updated fields reflect immediately
- RAG recalculation happens in background (when snap module active)

**Error Handling**:
- If project archived: "Cannot update cards in archived project"
- If sprint closed: "Cannot edit card in a closed sprint"
- If ET < 1: "Estimated Time must be at least 1 hour"
- If new assignee not found: "Team member with ID {id} not found"
- If new assignee not in project: "Assignee must be a member of the project team"
- If new sprint not found: "Sprint with ID {id} not found"
- If new sprint in different project: "Cannot move card to a sprint in a different project"
- If new sprint is closed: "Cannot move card to a closed sprint"

---

##### Action 3: Click "Mark Completed" Button (M7-UC06)

**What happens**: Manually mark card as completed

**Conditions**:
- Card not locked
- Card status not already COMPLETED or CLOSED
- User has `EDIT_CARD` permission
- Only SM (Scrum Master) can manually mark complete

**Frontend**:
1. Click button opens confirmation modal
2. User confirms action
3. Calls `cardsApi.markAsCompleted()`

**API Call**:
```http
POST /api/cards/:id/complete
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\card\card.controller.ts` - `@Post(':id/complete')`
- **Permission**: `EDIT_CARD`
- **Service**: `F:\StandupSnap\backend\src\card\card.service.ts` - `markAsCompleted()`

**Backend Flow** (Lines 316-338):

1. **Load Card**:
   ```typescript
   const card = await this.findOne(id);
   ```

2. **Validate Project** (Lines 319-322):
   ```typescript
   if (card.project.isArchived) {
     throw new BadRequestException('Cannot update cards in archived project');
   }
   ```

3. **Validate Sprint** (Lines 324-327):
   ```typescript
   if (card.sprint.isClosed) {
     throw new BadRequestException('Cannot update card in a closed sprint');
   }
   ```

4. **Validate Current Status** (Lines 329-332):
   ```typescript
   if (card.status === CardStatus.COMPLETED || card.status === CardStatus.CLOSED) {
     throw new BadRequestException('Card is already completed or closed');
   }
   ```

5. **Update Status and Timestamp** (Lines 334-335):
   ```typescript
   card.status = CardStatus.COMPLETED;
   card.completedAt = new Date();
   ```

6. **Save**:
   ```typescript
   return this.cardRepository.save(card);
   ```

**Database**:
```sql
UPDATE cards
SET
  status = 'completed',
  completedAt = NOW(),
  updatedAt = NOW()
WHERE id = ?
```

**Response**: Updated card with status COMPLETED

**UI Update**:
- Modal closes
- Card details page refreshes
- Status badge updates to "Completed"
- Completed date appears
- "Mark Completed" button disappears
- RAG status preserved (not reset)

**Error Handling**:
- If project archived: "Cannot update cards in archived project"
- If sprint closed: "Cannot update card in a closed sprint"
- If already completed/closed: "Card is already completed or closed"

---

##### Action 4: Click "Delete" Button (M7-UC03)

**What happens**: Permanently delete card and all associated snaps

**Conditions**:
- Card not locked
- User has `DELETE_CARD` permission

**Frontend**:
1. Click button shows confirmation dialog with warning
2. Dialog explicitly states: "Deleting this card will permanently remove all associated snaps"
3. User confirms
4. Calls `cardsApi.delete()`

**API Call**:
```http
DELETE /api/cards/:id
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\card\card.controller.ts` - `@Delete(':id')`
- **Permission**: `DELETE_CARD`
- **Service**: `F:\StandupSnap\backend\src\card\card.service.ts` - `remove()`

**Backend Flow** (Lines 287-310):

1. **Load Card with Relations** (Lines 288-291):
   ```typescript
   const card = await this.cardRepository.findOne({
     where: { id },
     relations: ['project', 'sprint'],
   });
   ```

2. **Validate Exists** (Lines 293-295):
   ```typescript
   if (!card) {
     throw new NotFoundException(`Card with ID ${id} not found`);
   }
   ```

3. **Validate Project** (Lines 297-300):
   ```typescript
   if (card.project.isArchived) {
     throw new BadRequestException('Cannot delete cards in archived project');
   }
   ```

4. **Validate Sprint** (Lines 302-305):
   ```typescript
   if (card.sprint.isClosed) {
     throw new BadRequestException('Cards in a closed sprint cannot be deleted');
   }
   ```

5. **Delete Card** (Line 309):
   ```typescript
   await this.cardRepository.remove(card);
   ```

   **Note**: Snaps are CASCADE deleted via entity relation (Lines 307-308 comment)

**Database**:
```sql
-- First: CASCADE delete all snaps
DELETE FROM snaps WHERE card_id = ?;

-- Then: Delete card
DELETE FROM cards WHERE id = ?;
```

**Response**: 204 No Content (void return)

**UI Update**:
- Navigates back to cards list page (preserves project filter)
- Card no longer appears in list
- Success implied by navigation

**Error Handling**:
- If card not found: "Card with ID {id} not found"
- If project archived: "Cannot delete cards in archived project"
- If sprint closed: "Cards in a closed sprint cannot be deleted"

---

## Status Workflow

### State Diagram

```
┌─────────────────┐
│   NOT_STARTED   │ (Initial state on creation)
└────────┬────────┘
         │
         │ Auto-transition when first snap created
         │ (See Snap module M8-UC01)
         ▼
┌─────────────────┐
│  IN_PROGRESS    │
└────────┬────────┘
         │
         │ Manual: SM marks as completed (M7-UC06)
         │
         ▼
┌─────────────────┐
│   COMPLETED     │
└────────┬────────┘
         │
         │ Auto-transition when sprint closes
         │ (See Sprint closure M6-UC05)
         │
         ▼
┌─────────────────┐
│     CLOSED      │ (Terminal state)
└─────────────────┘
```

### Transition Rules

**Business Rule BR-CARD-005: NOT_STARTED → IN_PROGRESS (Automatic)**
- **Trigger**: First snap created for this card
- **Location**: `F:\StandupSnap\backend\src\card\card.service.ts` Lines 344-353
- **Called By**: `SnapService.create()` after successful snap creation
- **Logic**:
  ```typescript
  async markAsInProgress(id: string): Promise<Card> {
    const card = await this.findOne(id);

    if (card.status === CardStatus.NOT_STARTED) {
      card.status = CardStatus.IN_PROGRESS;
      return this.cardRepository.save(card);
    }

    return card; // No change if already in progress or beyond
  }
  ```
- **No manual override**: Users cannot manually set to IN_PROGRESS

**Business Rule BR-CARD-006: IN_PROGRESS → COMPLETED (Manual)**
- **Trigger**: SM clicks "Mark Completed" button
- **Location**: `F:\StandupSnap\backend\src\card\card.service.ts` Lines 316-338
- **Validation**: Card must not already be COMPLETED or CLOSED
- **Side Effect**: Sets `completedAt` timestamp

**Business Rule BR-CARD-007: COMPLETED → CLOSED (Automatic)**
- **Trigger**: Sprint closure
- **Location**: `F:\StandupSnap\backend\src\card\card.service.ts` Lines 381-390
- **Called By**: `SprintService.closeSprint()`
- **Logic**:
  ```typescript
  async closeAllCardsInSprint(sprintId: string): Promise<void> {
    const cards = await this.getCardsBySprintId(sprintId);

    for (const card of cards) {
      if (card.status === CardStatus.COMPLETED) {
        card.status = CardStatus.CLOSED;
        await this.cardRepository.save(card);
      }
    }
  }
  ```
- **Only COMPLETED cards transition**: NOT_STARTED and IN_PROGRESS cards remain as-is (though sprint is closed)

**Business Rule BR-CARD-008: Status Immutability in Closed Sprints**
- Once sprint is closed, card status cannot be changed
- Lock validation prevents edits and status changes
- Cards in closed sprints display lock icon

---

## Priority System

### Priority Levels

| Priority | Value | Color | Use Case |
|----------|-------|-------|----------|
| **LOW** | `low` | Gray | Nice-to-have, backlog items |
| **MEDIUM** | `medium` | Blue | Standard priority (default) |
| **HIGH** | `high` | Orange | Important, time-sensitive |
| **CRITICAL** | `critical` | Red | Blockers, production issues |

### Priority Display

**In Cards List Grid**:
- Top-right corner badge
- Color-coded background
- Icon prefix:
  - LOW: ↓
  - MEDIUM: −
  - HIGH: ↑
  - CRITICAL: ⚠

**In Card Details**:
- Badge next to status badge
- Larger, more prominent

### Priority Filtering

**Location**: Cards List Page filter bar

**Implementation**:
```typescript
// Frontend
const [selectedPriority, setSelectedPriority] = useState<CardPriority | ''>('');

// API call includes priority filter
await cardsApi.getAll({ priority: selectedPriority || undefined });

// Backend query
if (priority) {
  queryBuilder.andWhere('card.priority = :priority', { priority });
}
```

### Priority in Sorting

**Business Rule BR-CARD-009: Priority Does NOT Affect Sort Order**
- Cards sorted by: Sprint start date ASC, then Title ASC
- Priority is visual indicator only, not for sorting
- Teams can filter by priority if needed

---

## RAG (Red-Amber-Green) Status System

### Overview

RAG status provides at-a-glance health indicator for cards based on:
- Latest snap RAG status
- Snap frequency
- Timeline adherence
- Blockers presence

### RAG Values

| RAG | Color | Meaning |
|-----|-------|---------|
| **GREEN** | Green (emerald) | On track, no issues |
| **AMBER** | Yellow/Amber | At risk, minor issues |
| **RED** | Red | Off track, major blockers |

### RAG Calculation Logic

**Location**: `F:\StandupSnap\backend\src\snap\snap.service.ts` Lines 915-956

**Trigger**: After snap creation or update

**Algorithm** (Lines 915-956):
1. Get all snaps for the card
2. Filter to recent snaps (last 7 days)
3. If no recent snaps → RAG = RED (no updates)
4. If recent snaps exist:
   - Take latest snap's `finalRAG`
   - Map SnapRAG to CardRAG:
     - SnapRAG.GREEN → CardRAG.GREEN
     - SnapRAG.AMBER → CardRAG.AMBER
     - SnapRAG.RED → CardRAG.RED
5. Update card's `ragStatus` field

**Code**:
```typescript
private async updateCardRAG(cardId: string): Promise<void> {
  const snaps = await this.snapRepository.find({
    where: { cardId },
    order: { snapDate: 'DESC', createdAt: 'DESC' },
  });

  if (snaps.length === 0) {
    return; // No snaps yet
  }

  // Get recent snaps (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentSnaps = snaps.filter(
    (s) => new Date(s.snapDate) >= sevenDaysAgo,
  );

  let newRAG: CardRAG;

  if (recentSnaps.length === 0) {
    newRAG = CardRAG.RED; // No recent updates
  } else {
    // Calculate RAG based on latest snap's finalRAG
    const latestSnap = recentSnaps[0];

    if (latestSnap.finalRAG === SnapRAG.GREEN) {
      newRAG = CardRAG.GREEN;
    } else if (latestSnap.finalRAG === SnapRAG.AMBER) {
      newRAG = CardRAG.AMBER;
    } else if (latestSnap.finalRAG === SnapRAG.RED) {
      newRAG = CardRAG.RED;
    } else {
      newRAG = CardRAG.AMBER; // Default
    }
  }

  // Update only the RAG status field
  await this.cardRepository.update(cardId, { ragStatus: newRAG });
}
```

**Business Rule BR-CARD-010: RAG Reflects Latest Snap Status**
- Card RAG mirrors latest snap's final RAG
- No complex aggregation across multiple snaps
- Simple, transparent logic

**Business Rule BR-CARD-011: No Recent Updates = RED Status**
- If no snaps in last 7 days, card automatically becomes RED
- Encourages regular updates
- Highlights stale cards

### RAG Display in UI

**Cards List Grid**:
- Color bar at top of card (thick 1.5px border)
- RAG badge at bottom-left (next to status badge)

**Card Details Page**:
- Large RAG badge in right sidebar
- Prominent, centered display
- Helper text explaining calculation

**RAG Filtering**:
- Filter dropdown on Cards List Page
- Options: All RAG, Green, Amber, Red
- Useful for focusing on at-risk cards

### RAG History Tracking

**Purpose**: Audit trail and trend analysis

**Entity**: `CardRAGHistory`
**Table**: `card_rag_history`

**Tracking Logic** (Lines 1124-1172 in `snap.service.ts`):
- When daily snaps are locked, RAG history is saved
- One entry per card per day
- Tracks if RAG was overridden manually
- Stores override notes

**Database Entry**:
```typescript
async saveRAGHistory(cardId: string, date: string, overriddenById?: string): Promise<void> {
  const card = await this.cardRepository.findOne({
    where: { id: cardId },
    relations: ['snaps'],
  });

  if (!card || !card.ragStatus) {
    return; // No RAG to save
  }

  const snap = await this.snapRepository.findOne({
    where: {
      cardId,
      snapDate: new Date(date),
    },
  });

  const isOverridden = snap?.suggestedRAG !== snap?.finalRAG;

  // Check if history already exists
  const existing = await this.ragHistoryRepository.findOne({
    where: {
      cardId,
      date: new Date(date),
    },
  });

  if (existing) {
    // Update existing
    existing.ragStatus = card.ragStatus;
    existing.isOverridden = isOverridden;
    if (overriddenById) {
      existing.overriddenById = overriddenById;
    }
    await this.ragHistoryRepository.save(existing);
  } else {
    // Create new
    const history = this.ragHistoryRepository.create({
      cardId,
      date: new Date(date),
      ragStatus: card.ragStatus,
      isOverridden,
      overriddenById,
    });
    await this.ragHistoryRepository.save(history);
  }
}
```

**Retrieval**:
```typescript
async getRAGHistory(cardId: string): Promise<CardRAGHistory[]> {
  return this.ragHistoryRepository.find({
    where: { cardId },
    order: { date: 'DESC' },
    relations: ['overriddenBy'],
  });
}
```

### Sprint-Level and Project-Level RAG

**Sprint RAG Aggregation** (Lines 1189-1217):
- Worst-case logic: If ANY card is RED, sprint is RED
- If no RED but any AMBER, sprint is AMBER
- If all GREEN, sprint is GREEN
- Returns breakdown: `{ green: N, amber: N, red: N }`

**Project RAG Aggregation** (Lines 1223-1266):
- Aggregates across all sprints in project
- Same worst-case logic
- Returns per-sprint breakdown for drill-down

**Code**:
```typescript
async getSprintRAG(sprintId: string): Promise<{
  ragStatus: CardRAG;
  breakdown: { green: number; amber: number; red: number };
}> {
  const cards = await this.cardRepository.find({
    where: { sprint: { id: sprintId } },
  });

  const breakdown = { green: 0, amber: 0, red: 0 };

  for (const card of cards) {
    if (card.ragStatus === CardRAG.GREEN) breakdown.green++;
    else if (card.ragStatus === CardRAG.AMBER) breakdown.amber++;
    else if (card.ragStatus === CardRAG.RED) breakdown.red++;
  }

  // Worst-case logic
  let ragStatus: CardRAG;
  if (breakdown.red > 0) {
    ragStatus = CardRAG.RED;
  } else if (breakdown.amber > 0) {
    ragStatus = CardRAG.AMBER;
  } else {
    ragStatus = CardRAG.GREEN;
  }

  return { ragStatus, breakdown };
}
```

---

## Estimated Time (ET) System

### Purpose

Estimated Time drives:
- Resource planning
- Sprint capacity planning
- Timeline deviation detection (for RAG calculation)
- Workload balancing

### Mandatory Field

**Business Rule BR-CARD-001**: ET is MANDATORY
- Must be provided during card creation
- Must be >= 1 hour
- Can be decimal (e.g., 0.5 hours = 30 minutes)
- Enforced at:
  - Frontend validation (min=1, step=0.5)
  - DTO validation (`@IsInt()`, `@Min(1)`)
  - Service validation (Lines 72-74)

**Validation Code**:
```typescript
// DTO (create-card.dto.ts)
@IsInt()
@Min(1)
@IsNotEmpty()
estimatedTime: number; // MANDATORY - ET in hours

// Service (card.service.ts)
if (!estimatedTime || estimatedTime < 1) {
  throw new BadRequestException('Estimated Time is required and must be at least 1 hour');
}
```

### ET in Timeline Deviation

**Used By**: Snap RAG calculation (future enhancement)

**Algorithm** (Lines 1004-1032 in `snap.service.ts`):
1. Get card's first snap date (start date)
2. Calculate days elapsed since start
3. Calculate expected hours: `daysElapsed * 8` (8-hour workday)
4. Compare with ET: `((expectedHours - ET) / ET) * 100`
5. Deviation percentage used in RAG logic:
   - > 30% deviation → RED
   - 1-30% deviation → AMBER
   - On schedule → GREEN

**Code**:
```typescript
private async calculateTimelineDeviation(card: Card): Promise<number> {
  if (!card.estimatedTime || card.estimatedTime <= 0) {
    return 0;
  }

  // Get card start date (first snap date or created date)
  const snaps = await this.snapRepository.find({
    where: { cardId: card.id },
    order: { snapDate: 'ASC' },
  });

  const startDate = snaps.length > 0
    ? new Date(snaps[0].snapDate)
    : new Date(card.createdAt);

  const today = new Date();
  const daysElapsed = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Assume 8-hour work day
  const expectedHours = (daysElapsed + 1) * 8;
  const estimatedHours = card.estimatedTime;

  // Calculate deviation percentage
  const deviation = ((expectedHours - estimatedHours) / estimatedHours) * 100;

  return Math.max(0, deviation);
}
```

### ET Display

**Cards List**: Clock icon with hours (e.g., "16 hrs")
**Card Details**: "Estimated Time: 16 hours" (bold, large text)
**Create/Edit Modals**: Number input with helper text

### ET Updates

**Business Rule BR-CARD-012: ET Changes Trigger RAG Recalculation**
- When ET is updated, RAG should be recalculated
- Currently TODO (Line 274-275 in card.service.ts)
- Future: Will automatically adjust RAG based on new timeline

---

## External ID Integration

### Purpose

External ID field enables integration with external systems:
- **Jira**: JIRA-1234
- **Azure DevOps**: TASK-567
- **GitHub Issues**: #123
- **Any external tracker**: CUSTOM-ID

### Field Characteristics

- **Optional**: Not required
- **Type**: String, no format validation
- **Display**: Below card title (monospace font)
- **Searchable**: Full-text search includes external ID

### Search Integration

**Location**: Cards List Page search input

**Backend Logic** (Lines 161-165 in card.service.ts):
```typescript
if (search) {
  queryBuilder.andWhere(
    '(LOWER(card.title) LIKE LOWER(:search) OR LOWER(card.externalId) LIKE LOWER(:search))',
    { search: `%${search}%` }
  );
}
```

**Use Case**: User can search by Jira ticket number directly

### Future Enhancements

**Potential**:
- Link to external system (clickable)
- Sync status from external system
- Auto-populate from external API
- Validation based on external system format

---

## Assignee Management

### Assignee Selection

**Business Rule BR-CARD-002**: Assignee must be project team member
- Enforced during create (Lines 76-90)
- Enforced during update (Lines 224-242)
- Dropdown only shows team members in project
- Cannot assign to someone outside project

**Validation Code**:
```typescript
const assignee = await this.teamMemberRepository.findOne({
  where: { id: assigneeId },
  relations: ['projects'],
});

if (!assignee) {
  throw new NotFoundException(`Team member with ID ${assigneeId} not found`);
}

// Verify assignee is part of the project team
const isInProject = assignee.projects.some(p => p.id === projectId);
if (!isInProject) {
  throw new BadRequestException('Assignee must be a member of the project team');
}
```

### Reassignment

**Trigger**: Edit card, change assignee dropdown

**Validation**: Same as initial assignment (must be in project)

**Effect**:
- Card ownership transfers
- Existing snaps remain (historical record)
- New snaps must be created by new assignee (or SM)

### Assignee Display

**Cards List**: Name with user icon
**Card Details**: Name and designation/role
**Filtering**: Dropdown filter on Cards List Page

### Workload Tracking (Future)

**Potential Features**:
- Total ET per assignee
- Cards in progress per assignee
- Capacity planning dashboard
- Overallocation warnings

---

## Sprint Association

### Sprint Selection

**Business Rule BR-CARD-013**: Card must belong to a sprint
- Sprint is mandatory during creation
- Sprint must be in same project
- Sprint must not be closed

**Validation** (Lines 53-69):
```typescript
const sprint = await this.sprintRepository.findOne({
  where: { id: sprintId },
  relations: ['project'],
});

if (!sprint) {
  throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
}

if (sprint.project.id !== projectId) {
  throw new BadRequestException('Sprint does not belong to the specified project');
}

if (sprint.isClosed) {
  throw new BadRequestException('Cannot create cards in a closed sprint');
}
```

### Moving Cards Between Sprints

**Current State**: Allowed with restrictions

**Restrictions**:
1. **Cannot move to different project** (BR-CARD-003)
2. **Cannot move to closed sprint** (BR-CARD-004)
3. **Future**: Cannot move if card has snaps (TODO Line 264-266)

**Implementation** (Lines 244-269):
```typescript
if (sprintId && sprintId !== card.sprint.id) {
  const newSprint = await this.sprintRepository.findOne({
    where: { id: sprintId },
    relations: ['project'],
  });

  if (!newSprint) {
    throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
  }

  if (newSprint.project.id !== card.project.id) {
    throw new BadRequestException('Cannot move card to a sprint in a different project');
  }

  // Cannot move to a closed sprint
  if (newSprint.isClosed) {
    throw new BadRequestException('Cannot move card to a closed sprint');
  }

  // TODO: Add validation when Snap module is implemented
  // - Cannot move card if it has snaps
  // - Cannot move card to a completed sprint if it has snaps

  card.sprint = newSprint;
}
```

**Rationale for Snap Restriction**:
- Snaps are tied to specific sprint dates
- Moving cards with snaps creates date range conflicts
- Preserves historical accuracy

### Sprint Closure Effects

**When Sprint Closes**:
1. **All COMPLETED cards** → Transition to CLOSED
2. **IN_PROGRESS and NOT_STARTED cards** → Remain as-is, but locked
3. **No new cards** can be created in closed sprint
4. **No edits** allowed to existing cards
5. **Lock icon** displays on all cards

**Helper Functions** (Lines 358-390):
```typescript
async getCardsBySprintId(sprintId: string): Promise<Card[]> {
  return this.cardRepository.find({
    where: { sprint: { id: sprintId } },
    relations: ['sprint', 'assignee'],
  });
}

async areAllCardsCompleted(sprintId: string): Promise<boolean> {
  const cards = await this.getCardsBySprintId(sprintId);

  if (cards.length === 0) {
    return true; // Empty sprint can be closed
  }

  return cards.every(card => card.status === CardStatus.COMPLETED);
}

async closeAllCardsInSprint(sprintId: string): Promise<void> {
  const cards = await this.getCardsBySprintId(sprintId);

  for (const card of cards) {
    if (card.status === CardStatus.COMPLETED) {
      card.status = CardStatus.CLOSED;
      await this.cardRepository.save(card);
    }
  }
}
```

---

## Integration with Snaps

### Snap Count Display

**Location**: Cards List grid, center-right of card

**Implementation**:
```typescript
// Backend: Load snap count efficiently
.loadRelationCountAndMap('card.snapsCount', 'card.snaps')

// Frontend: Display with document icon
<span className="text-2xl font-bold text-primary-600">
  {card.snapsCount || 0}
</span>
```

**Purpose**:
- Quick visual indicator of update frequency
- Cards with 0 snaps may need attention
- High snap count indicates active work

### Auto-Transition to IN_PROGRESS

**Trigger**: First snap created for card

**Location**: Called by `SnapService.create()` (Line 146-149)

**Logic** (Lines 344-353 in card.service.ts):
```typescript
async markAsInProgress(id: string): Promise<Card> {
  const card = await this.findOne(id);

  if (card.status === CardStatus.NOT_STARTED) {
    card.status = CardStatus.IN_PROGRESS;
    return this.cardRepository.save(card);
  }

  return card;
}
```

**Business Rule BR-CARD-005**: Automatic status progression
- Only affects NOT_STARTED cards
- Idempotent: safe to call multiple times
- No user notification, seamless transition

### Viewing Snaps on Card Details

**Component**: `SnapsList` embedded in Card Details Page (Lines 319-327)

**Props Passed**:
```typescript
<SnapsList
  cardId={card.id}
  cardTitle={card.title}
  sprintId={card.sprint.id}
  dailyStandupCount={card.sprint.dailyStandupCount || 1}
  isLocked={isLocked}
/>
```

**Display**:
- Today's snaps (expanded)
- Yesterday's snaps (expanded)
- Older snaps (collapsed, click to expand)
- "Add Snap" button (if not locked)

---

## Permissions & RBAC

### Card Permissions

| Permission | Action | Roles |
|------------|--------|-------|
| `VIEW_CARD` | View cards list and details | All roles |
| `CREATE_CARD` | Create new cards | SM, PO, PMO |
| `EDIT_CARD` | Edit card details, mark complete | SM, PO |
| `DELETE_CARD` | Delete cards | SM, PO, PMO |

### Permission Enforcement

**Frontend**: Guards on routes and buttons
```typescript
// Button disabled if no permission
<button disabled={!hasPermission('CREATE_CARD')}>
  Create Card
</button>
```

**Backend**: Decorators on controller methods
```typescript
@Post()
@RequirePermissions(Permission.CREATE_CARD)
create(@Body() createCardDto: CreateCardDto) {
  return this.cardService.create(createCardDto);
}
```

### Guards Applied

1. **JwtAuthGuard**: Validates JWT token, extracts user
2. **PermissionsGuard**: Checks user has required permission
3. Both applied to entire controller: `@UseGuards(JwtAuthGuard, PermissionsGuard)`

---

## Business Rules Summary

| Rule ID | Description | Location |
|---------|-------------|----------|
| **BR-CARD-001** | Estimated Time (ET) is MANDATORY and >= 1 hour | Lines 72-74 |
| **BR-CARD-002** | Assignee must be a member of project team | Lines 87-90, 236-239 |
| **BR-CARD-003** | Cannot move card to sprint in different project | Line 256 |
| **BR-CARD-004** | Cannot move card to closed sprint | Lines 260-262 |
| **BR-CARD-005** | Auto-transition NOT_STARTED → IN_PROGRESS on first snap | Lines 344-353 |
| **BR-CARD-006** | Manual transition IN_PROGRESS → COMPLETED by SM | Lines 316-338 |
| **BR-CARD-007** | Auto-transition COMPLETED → CLOSED on sprint closure | Lines 381-390 |
| **BR-CARD-008** | Status immutable in closed sprints | Lines 203-206 |
| **BR-CARD-009** | Priority does NOT affect sort order | Line 127 |
| **BR-CARD-010** | Card RAG reflects latest snap's final RAG | Lines 940-951 |
| **BR-CARD-011** | No snaps in 7 days → Card RAG becomes RED | Lines 936-938 |
| **BR-CARD-012** | ET changes trigger RAG recalculation (TODO) | Lines 274-275 |
| **BR-CARD-013** | Card must belong to a sprint | Lines 53-69 |

---

## API Endpoints Reference

### Card Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| **GET** | `/api/cards` | `VIEW_CARD` | List cards with filters (M7-UC05) |
| **GET** | `/api/cards/:id` | `VIEW_CARD` | Get card details (M7-UC04) |
| **POST** | `/api/cards` | `CREATE_CARD` | Create new card (M7-UC01) |
| **PATCH** | `/api/cards/:id` | `EDIT_CARD` | Update card (M7-UC02) |
| **POST** | `/api/cards/:id/complete` | `EDIT_CARD` | Mark card as completed (M7-UC06) |
| **DELETE** | `/api/cards/:id` | `DELETE_CARD` | Delete card (M7-UC03) |

### Query Parameters (GET /api/cards)

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | UUID | Filter by project |
| `sprintId` | UUID | Filter by sprint |
| `assigneeId` | UUID | Filter by assignee |
| `ragStatus` | Enum | Filter by RAG (red/amber/green) |
| `status` | Enum | Filter by status |
| `priority` | Enum | Filter by priority |
| `search` | String | Search title or external ID |

---

## Error Handling

### Common Errors

| HTTP Status | Error Message | Cause |
|-------------|---------------|-------|
| **404** | Project with ID {id} not found | Invalid project ID |
| **404** | Sprint with ID {id} not found | Invalid sprint ID |
| **404** | Team member with ID {id} not found | Invalid assignee ID |
| **404** | Card with ID {id} not found | Invalid card ID |
| **400** | Cannot create cards in archived project | Project is archived |
| **400** | Cannot create cards in a closed sprint | Sprint is closed |
| **400** | Estimated Time is required and must be at least 1 hour | ET validation failed |
| **400** | Assignee must be a member of the project team | Assignee not in project |
| **400** | Sprint does not belong to the specified project | Sprint/project mismatch |
| **400** | Cannot edit card in a closed sprint | Attempting to edit locked card |
| **400** | Cannot move card to a sprint in a different project | Cross-project sprint move |
| **400** | Cannot move card to a closed sprint | Moving to closed sprint |
| **400** | Card is already completed or closed | Marking completed card as completed |
| **400** | Cards in a closed sprint cannot be deleted | Deleting from closed sprint |

---

## Performance Considerations

### Query Optimization

**Cards List Query**:
- Uses `createQueryBuilder` for complex filtering
- `leftJoinAndSelect` for eager loading relations (avoids N+1)
- `loadRelationCountAndMap` for efficient snap counting
- Indexed fields: `project_id`, `sprint_id`, `assignee_id`, `status`, `ragStatus`

**Example Query Plan**:
```sql
-- Optimized with indexes
EXPLAIN ANALYZE
SELECT ...
FROM cards
WHERE project_id = ? AND sprint_id = ? AND status = ?
-- Index Scan on cards_project_sprint_status_idx
```

### Caching Opportunities

**Potential**:
- Cache project team members list (invalidate on team change)
- Cache sprint list per project (invalidate on sprint change)
- Cache card counts per sprint (invalidate on card create/delete)

### Pagination (Future Enhancement)

**Current**: No pagination, loads all matching cards
**Future**: Add limit/offset or cursor-based pagination for large card sets

---

## Testing Scenarios

### Unit Tests

**Card Service Tests**:
1. ✅ Create card with valid data
2. ✅ Reject card creation with invalid ET
3. ✅ Reject card creation with assignee not in project
4. ✅ Reject card creation in closed sprint
5. ✅ Update card basic fields
6. ✅ Update card with sprint change (valid)
7. ✅ Reject sprint change to different project
8. ✅ Mark card as completed
9. ✅ Reject marking already completed card
10. ✅ Delete card
11. ✅ Reject delete from closed sprint
12. ✅ Auto-transition to IN_PROGRESS
13. ✅ Close all completed cards in sprint

### Integration Tests

**End-to-End Flows**:
1. Create card → Verify in database
2. Create card → Create snap → Verify status = IN_PROGRESS
3. Create card → Mark completed → Verify completedAt set
4. Create card → Close sprint → Verify card locked
5. Filter cards by RAG → Verify correct filtering
6. Search cards by external ID → Verify results
7. Update card ET → Verify RAG recalculation (when implemented)

---

## Future Enhancements

### Planned Features

1. **Move Cards with Snaps**:
   - Allow moving cards between sprints even if snaps exist
   - Migrate snap dates or copy snaps to new sprint

2. **RAG Recalculation on ET Change**:
   - Automatically adjust RAG when ET is updated
   - Timeline deviation recalculates immediately

3. **Pagination**:
   - Support for large card lists (100+)
   - Cursor-based or offset-based pagination

4. **Bulk Operations**:
   - Bulk assign to different sprint
   - Bulk reassign to different team member
   - Bulk priority update

5. **Card Templates**:
   - Predefined card structures for common tasks
   - Auto-populate fields based on template

6. **Subtasks**:
   - Break cards into smaller subtasks
   - Track subtask completion percentage
   - Aggregate subtask RAG to parent card

7. **Time Tracking**:
   - Actual hours logged
   - Compare actual vs estimated
   - Burndown visualization per card

8. **Card Dependencies**:
   - Link cards as blockers/dependencies
   - Dependency graph visualization
   - Automated blocker detection

9. **Custom Fields**:
   - User-defined fields per project
   - Flexible schema for additional metadata

10. **Card Archiving**:
    - Soft delete instead of hard delete
    - Archive old cards for historical reference

---

## Conclusion

The Cards module is the foundational work item management system in StandupSnap. It provides:

- ✅ **Comprehensive CRUD** with validation
- ✅ **Status workflow** with automatic transitions
- ✅ **Priority system** for task importance
- ✅ **RAG status** for at-a-glance health
- ✅ **Estimated time** for resource planning
- ✅ **External ID** for integration
- ✅ **Sprint association** with closure handling
- ✅ **Assignee management** with team validation
- ✅ **Deep integration** with Snaps module

The module enforces business rules consistently, provides robust error handling, and maintains data integrity through validation and database constraints. It serves as the backbone for daily standup tracking and sprint management.

**File References**:
- Entity: `F:\StandupSnap\backend\src\entities\card.entity.ts`
- Service: `F:\StandupSnap\backend\src\card\card.service.ts`
- Controller: `F:\StandupSnap\backend\src\card\card.controller.ts`
- DTOs: `F:\StandupSnap\backend\src\card\dto\create-card.dto.ts`, `update-card.dto.ts`
- Frontend List: `F:\StandupSnap\frontend\src\pages\cards\CardsListPage.tsx`
- Frontend Details: `F:\StandupSnap\frontend\src\pages\cards\CardDetailsPage.tsx`
- Frontend Modals: `F:\StandupSnap\frontend\src\components\cards\CreateCardModal.tsx`, `EditCardModal.tsx`
