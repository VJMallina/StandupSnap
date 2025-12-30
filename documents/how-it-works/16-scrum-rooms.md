# Scrum Rooms - How It Works

## Overview
- **Purpose**: Interactive collaborative boards for Agile ceremonies with real-time collaboration and AI-powered insights
- **Key Features**: 5 room types (Planning Poker, Retrospective, Sprint Planning, Refinement, MOM), drag-and-drop interfaces, voting systems, AI assistance via Groq API
- **Integration**: Independent module with optional project association, AI-powered summaries and suggestions
- **Complexity Level**: VERY HIGH - Multi-room collaborative system with real-time state management

## Table of Contents
1. [Database Schema](#database-schema)
2. [Room Types Overview](#room-types-overview)
3. [Screen 1: Scrum Rooms List](#screen-1-scrum-rooms-list)
4. [Screen 2: Create Room Modal](#screen-2-create-room-modal)
5. [Room Type 1: Planning Poker](#room-type-1-planning-poker)
6. [Room Type 2: Retrospective](#room-type-2-retrospective)
7. [Room Type 3: Sprint Planning](#room-type-3-sprint-planning)
8. [Room Type 4: Refinement](#room-type-4-refinement)
9. [Room Type 5: MOM (Meeting Minutes)](#room-type-5-mom-meeting-minutes)
10. [API Endpoints](#api-endpoints)
11. [AI Integration](#ai-integration)
12. [Complete User Journeys](#complete-user-journeys)
13. [Business Rules](#business-rules)

---

## Database Schema

### Table: `scrum_rooms`
**Purpose**: Store all room types with type-specific data in JSONB column

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique room identifier |
| name | VARCHAR(255) | NOT NULL | Room name |
| type | ENUM | NOT NULL | Room type: planning_poker, retrospective, sprint_planning, refinement, mom |
| description | TEXT | NULLABLE | Room description |
| status | ENUM | DEFAULT ACTIVE | ACTIVE, COMPLETED, ARCHIVED |
| data | JSONB | NULLABLE | Room-specific state (varies by type) |
| project_id | UUID | FK → projects, CASCADE DELETE, NULLABLE | Optional project association |
| is_archived | BOOLEAN | DEFAULT false | Soft delete flag |
| archived_at | TIMESTAMP | NULLABLE | Archive timestamp |
| completed_at | TIMESTAMP | NULLABLE | Completion timestamp |
| created_by | UUID | FK → users, SET NULL | Creator user |
| updated_by | UUID | FK → users, SET NULL | Last updater |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

**Enums**:

```typescript
enum RoomType {
  PLANNING_POKER = 'planning_poker',
  RETROSPECTIVE = 'retrospective',
  SPRINT_PLANNING = 'sprint_planning',
  REFINEMENT = 'refinement',
  MOM = 'mom'
}

enum RoomStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

enum DeckType {
  FIBONACCI = 'fibonacci',              // 1, 2, 3, 5, 8, 13, 21
  MODIFIED_FIBONACCI = 'modified_fibonacci', // 0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100
  T_SHIRT = 't_shirt',                  // XS, S, M, L, XL, XXL
  CUSTOM = 'custom'                     // User-defined deck
}
```

**Relationships**:
- N:1 with `projects` (optional - room can exist without project)
- N:1 with `users` (createdBy, updatedBy)

**Indexes**:
- `project_id` (for filtering by project)
- `type` (for filtering by room type)
- `status` (for filtering by status)
- `is_archived` (for excluding archived rooms)
- `created_at`, `updated_at` (for sorting)

---

### Data JSONB Structures by Room Type

#### 1. Planning Poker Data
```typescript
interface PlanningPokerData {
  deckType: DeckType;
  customDeck?: string[];              // Only if deckType === CUSTOM
  rounds: PlanningPokerRound[];
  participants: string[];             // Array of userId
}

interface PlanningPokerRound {
  roundId: string;
  itemName?: string;                  // What is being estimated
  votes: Record<string, string | number>; // { userId: vote }
  revealed: boolean;
  finalValue: string | number | null;
  mean?: number;                      // Calculated on reveal
  median?: number;
  mode?: string | number;
  timestamp: string;
}
```

**Example**:
```json
{
  "deckType": "fibonacci",
  "rounds": [
    {
      "roundId": "round-123",
      "itemName": "User Login API",
      "votes": {
        "user-1": 5,
        "user-2": 8,
        "user-3": 5
      },
      "revealed": true,
      "finalValue": 5,
      "mean": 6.0,
      "median": 5,
      "mode": 5,
      "timestamp": "2025-12-30T10:30:00Z"
    }
  ],
  "participants": ["user-1", "user-2", "user-3"]
}
```

#### 2. Retrospective Data
```typescript
interface RetrospectiveData {
  columns: RetroColumn[];
  votingEnabled: boolean;
  maxVotesPerPerson?: number;
}

interface RetroColumn {
  columnId: string;
  title: string;
  order: number;
  items: RetroItem[];
}

interface RetroItem {
  itemId: string;
  content: string;
  createdBy: string;                  // userId
  createdByName: string;
  votes: string[];                    // Array of userId who voted
  discussion?: string;
  actionItem?: boolean;               // Converted to action item
  timestamp: string;
}
```

**Example**:
```json
{
  "columns": [
    {
      "columnId": "col-1",
      "title": "What Went Well",
      "order": 0,
      "items": [
        {
          "itemId": "item-123",
          "content": "Great team collaboration",
          "createdBy": "user-1",
          "createdByName": "John Doe",
          "votes": ["user-1", "user-2", "user-3"],
          "timestamp": "2025-12-30T10:00:00Z"
        }
      ]
    },
    {
      "columnId": "col-2",
      "title": "What Didn't Go Well",
      "order": 1,
      "items": [
        {
          "itemId": "item-456",
          "content": "Testing was delayed",
          "createdBy": "user-2",
          "createdByName": "Jane Smith",
          "votes": ["user-2"],
          "discussion": "Need to allocate more time for testing",
          "actionItem": true,
          "timestamp": "2025-12-30T10:05:00Z"
        }
      ]
    }
  ],
  "votingEnabled": true,
  "maxVotesPerPerson": 3
}
```

#### 3. Sprint Planning Data
```typescript
interface SprintPlanningData {
  capacity: number;                   // Team capacity in story points
  items: SprintPlanningItem[];
  sprintGoals: string[];
  actualWorkload: number;             // Sum of all in_scope items
}

interface SprintPlanningItem {
  itemId: string;
  title: string;
  estimate: number;
  status: 'ready' | 'in_scope' | 'out_of_scope';
  order: number;
}
```

**Example**:
```json
{
  "capacity": 40,
  "sprintGoals": [
    "Complete user authentication",
    "Implement basic dashboard"
  ],
  "items": [
    {
      "itemId": "item-1",
      "title": "User login API",
      "estimate": 8,
      "status": "in_scope",
      "order": 0
    },
    {
      "itemId": "item-2",
      "title": "Dashboard UI",
      "estimate": 13,
      "status": "in_scope",
      "order": 1
    },
    {
      "itemId": "item-3",
      "title": "Advanced reporting",
      "estimate": 21,
      "status": "out_of_scope",
      "order": 2
    }
  ],
  "actualWorkload": 21
}
```

#### 4. Refinement Data
```typescript
interface RefinementData {
  items: RefinementItem[];
}

interface RefinementItem {
  itemId: string;
  title: string;
  notes: string[];
  acceptanceCriteria: string[];
  aiSuggestions?: string[];           // AI-generated suggestions
  estimate?: number;
}
```

**Example**:
```json
{
  "items": [
    {
      "itemId": "item-1",
      "title": "User Registration Flow",
      "notes": [
        "Should support email verification",
        "Password strength requirements"
      ],
      "acceptanceCriteria": [
        "User can register with email and password",
        "Email verification link sent",
        "Password must meet security requirements"
      ],
      "aiSuggestions": [
        "Add CAPTCHA for bot prevention",
        "Implement OAuth social login options"
      ],
      "estimate": 8
    }
  ]
}
```

#### 5. MOM Data
```typescript
interface MOMData {
  rawInput: string;
  summary: string;
  decisions: string[];
  actionItems: Array<{
    id: string;
    description: string;
    assignee?: string;
    dueDate?: string;
  }>;
  attendees: string[];
  aiGenerated: boolean;
}
```

**Example**:
```json
{
  "rawInput": "Discussed sprint planning. Team agreed to focus on backend APIs first...",
  "summary": "Sprint planning discussion focusing on backend API development priorities",
  "decisions": [
    "Backend APIs will be developed first",
    "PostgreSQL selected as database"
  ],
  "actionItems": [
    {
      "id": "action-1",
      "description": "Implement authentication module",
      "assignee": "John",
      "dueDate": "2025-01-15"
    }
  ],
  "attendees": ["John", "Jane", "Mike"],
  "aiGenerated": true
}
```

---

## Room Types Overview

### Summary Table

| Room Type | Purpose | Key Features | AI Support |
|-----------|---------|--------------|------------|
| Planning Poker | Team estimation | Multiple decks, secret voting, statistics, reveal button | AI estimate suggestion |
| Retrospective | Sprint retrospectives | Drag-and-drop columns, voting, discussion mode | AI summary generation |
| Sprint Planning | Sprint capacity planning | Capacity tracking, item arrangement, workload calculation | No |
| Refinement | Backlog refinement | Acceptance criteria, notes, story breakdown | AI criteria rewrite |
| MOM | Meeting minutes | Raw input, AI parsing, export | AI parsing to structure |

---

## Screen 1: Scrum Rooms List

**Route**: `/scrum-rooms`
**Access**: All authenticated users
**Component**: `F:\StandupSnap\frontend\src\pages\ScrumRoomsPage.tsx`

### UI Components

1. **Page Header**
   - Title: "Scrum Rooms"
   - Subtitle: "Collaborative boards for Agile ceremonies"
   - "Create Room" button (primary, top-right)

2. **Filter Bar**
   - Project dropdown (filter by project, or "All Projects")
   - Room type filter (All, Planning Poker, Retrospective, Sprint Planning, Refinement, MOM)
   - Status filter (All, Active, Completed, Archived)
   - "Show Archived" checkbox
   - Search box (search by room name)

3. **Rooms Grid/List**
   - Card layout for each room:
     - Room name (bold, large)
     - Room type badge (colored by type)
     - Status badge (colored by status)
     - Description (truncated)
     - Project name (if associated)
     - Last updated timestamp
     - Created by user name
     - Action buttons:
       - "Open" (primary button)
       - "Archive/Restore" (icon button)
       - "Delete" (icon button, only if no data)

4. **Empty State**
   - Illustration
   - "No rooms yet"
   - "Create your first Scrum Room to get started"
   - "Create Room" button

### User Actions

#### Action 1: User Views Rooms List

**What happens**: Load and display all rooms with filters

**Frontend**:
1. On page load, fetch rooms list
2. Apply default filters (show active, non-archived)
3. Render rooms in grid layout

**API Call**:
```http
GET /api/scrum-rooms?projectId={projectId}&type={type}&status={status}&includeArchived={bool}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\scrum-rooms\scrum-rooms.controller.ts` - `@Get()`
- **Service**: `F:\StandupSnap\backend\src\scrum-rooms\scrum-rooms.service.ts` - `findAll(filters)`

**Backend Flow**:
1. **ScrumRoomsService.findAll()** receives filters
2. Build QueryBuilder with joins:
   ```sql
   SELECT room.*, project.name as project_name,
          creator.name as created_by_name,
          updater.name as updated_by_name
   FROM scrum_rooms room
   LEFT JOIN projects project ON room.project_id = project.id
   LEFT JOIN users creator ON room.created_by = creator.id
   LEFT JOIN users updater ON room.updated_by = updater.id
   WHERE room.is_archived = false
   ORDER BY room.updated_at DESC
   ```
3. Apply filters:
   - If `projectId`: `WHERE room.project_id = ?`
   - If `type`: `WHERE room.type = ?`
   - If `status`: `WHERE room.status = ?`
   - If `includeArchived = false`: `WHERE room.is_archived = false`
4. Return rooms array

**Response**:
```json
[
  {
    "id": "room-uuid",
    "name": "Sprint 5 Planning Poker",
    "type": "planning_poker",
    "description": "Estimation session for Sprint 5 stories",
    "status": "ACTIVE",
    "data": { ... },
    "project": {
      "id": "project-uuid",
      "name": "StandupSnap"
    },
    "isArchived": false,
    "createdBy": {
      "id": "user-uuid",
      "name": "John Doe"
    },
    "createdAt": "2025-12-28T10:00:00Z",
    "updatedAt": "2025-12-30T15:30:00Z"
  }
]
```

**UI Update**:
1. Display rooms in grid
2. Show room type badges with colors:
   - Planning Poker: Blue
   - Retrospective: Purple
   - Sprint Planning: Green
   - Refinement: Orange
   - MOM: Gray
3. Show status badges
4. Enable action buttons

---

#### Action 2: User Applies Filters

**What happens**: Filter rooms by project, type, status

**Frontend**:
1. User selects filter option
2. Update filter state
3. Re-fetch rooms with new filters
4. Update URL query params

**API Call**:
```http
GET /api/scrum-rooms?projectId={projectId}&type=planning_poker&status=ACTIVE
Authorization: Bearer {accessToken}
```

**Backend**: Same as Action 1, with applied filters

**UI Update**: Display filtered results

---

#### Action 3: User Searches Rooms

**What happens**: Filter rooms by name

**Frontend**:
1. User types in search box
2. Debounce input (300ms)
3. Filter rooms locally by name (case-insensitive)

**No API Call**: Client-side filtering on already loaded rooms

**UI Update**: Show matching rooms

---

#### Action 4: User Clicks "Create Room"

**What happens**: Open create room modal

**Frontend**:
1. Open modal/dialog
2. Show room creation form
3. See next section for modal details

---

#### Action 5: User Clicks "Open" on a Room

**What happens**: Navigate to room detail page

**Frontend**:
1. Navigate to `/scrum-rooms/{roomId}`
2. Load room-specific interface based on type
3. See room type sections below for details

---

#### Action 6: User Archives a Room

**What happens**: Soft-delete room (set isArchived = true)

**Frontend**:
1. User clicks archive icon
2. Show confirmation dialog: "Archive this room? You can restore it later."
3. On confirm, call archive API

**API Call**:
```http
POST /api/scrum-rooms/{roomId}/archive
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `@Post(':id/archive')`
- **Service**: `archiveRoom(id, userId)`

**Backend Flow**:
1. Find room by ID
2. Set `isArchived = true`, `archivedAt = now()`, `status = ARCHIVED`
3. Update `updatedBy = userId`
4. Save room

**Response**:
```json
{
  "id": "room-uuid",
  "isArchived": true,
  "archivedAt": "2025-12-30T16:00:00Z",
  "status": "ARCHIVED"
}
```

**UI Update**:
1. Remove room from active list
2. Show success toast: "Room archived"
3. If "Show Archived" is enabled, move to archived section

---

#### Action 7: User Restores an Archived Room

**What happens**: Restore archived room

**Frontend**:
1. User clicks restore icon on archived room
2. Call restore API

**API Call**:
```http
POST /api/scrum-rooms/{roomId}/restore
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `restoreRoom(id, userId)`

**Backend Flow**:
1. Find room by ID
2. Check if `isArchived === true` (else throw error)
3. Set `isArchived = false`, `archivedAt = null`, `status = ACTIVE`
4. Save room

**UI Update**: Move room to active list

---

#### Action 8: User Deletes a Room

**What happens**: Permanently delete room (only if no meaningful data)

**Frontend**:
1. User clicks delete icon
2. Show confirmation: "Permanently delete this room? This cannot be undone."
3. On confirm, call delete API

**API Call**:
```http
DELETE /api/scrum-rooms/{roomId}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `deleteRoom(id)`

**Backend Flow**:
1. Find room by ID
2. Delete from database (hard delete)

**UI Update**: Remove room from list

---

## Screen 2: Create Room Modal

**Component**: `F:\StandupSnap\frontend\src\components\scrum-rooms\CreateRoomModal.tsx`

### UI Components

1. **Modal Header**
   - Title: "Create Scrum Room"
   - Close button (X)

2. **Form Fields**
   - **Room Name** (text input, required)
     - Label: "Room Name"
     - Placeholder: "e.g., Sprint 5 Planning Poker"

   - **Room Type** (dropdown, required)
     - Label: "Room Type"
     - Options:
       - Planning Poker
       - Retrospective
       - Sprint Planning
       - Refinement
       - Meeting Minutes (MOM)
     - Description below dropdown changes based on selection

   - **Description** (textarea, optional)
     - Label: "Description"
     - Placeholder: "Optional description"

   - **Project** (dropdown, optional)
     - Label: "Project (Optional)"
     - Options: List of user's projects + "No Project"

3. **Room Type Descriptions**
   - **Planning Poker**: "Team estimation with voting and statistics"
   - **Retrospective**: "Sprint retrospective with drag-and-drop columns"
   - **Sprint Planning**: "Visual sprint planning with capacity tracking"
   - **Refinement**: "Backlog refinement and grooming"
   - **Meeting Minutes**: "AI-powered meeting minutes generation"

4. **Action Buttons**
   - "Cancel" (secondary)
   - "Create Room" (primary, disabled until name and type selected)

### User Actions

#### Action 1: User Fills Form and Creates Room

**What happens**: Create new room with default data structure

**Frontend**:
1. User fills required fields (name, type)
2. Optionally selects project and adds description
3. User clicks "Create Room"
4. Validate form
5. Call create API

**API Call**:
```http
POST /api/scrum-rooms
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Sprint 5 Planning Poker",
  "type": "planning_poker",
  "description": "Estimation session for user story backlog",
  "projectId": "project-uuid"  // Optional
}
```

**Backend**:
- **Controller**: `@Post()`
- **Service**: `createRoom(dto, userId)`

**Backend Flow**:
1. **Validate project** (if projectId provided):
   ```sql
   SELECT * FROM projects WHERE id = ?
   ```
   - If not found: throw `NotFoundException`

2. **Initialize default data based on type**:

   **If type = PLANNING_POKER**:
   ```typescript
   data = {
     deckType: 'fibonacci',
     rounds: [],
     participants: [userId]
   }
   ```

   **If type = RETROSPECTIVE**:
   ```typescript
   data = {
     columns: [
       { columnId: '1', title: 'What Went Well', order: 0, items: [] },
       { columnId: '2', title: "What Didn't Go Well", order: 1, items: [] },
       { columnId: '3', title: 'Improvements', order: 2, items: [] },
       { columnId: '4', title: 'Kudos', order: 3, items: [] }
     ],
     votingEnabled: true,
     maxVotesPerPerson: 3
   }
   ```

   **If type = SPRINT_PLANNING**:
   ```typescript
   data = {
     capacity: 0,
     items: [],
     sprintGoals: [],
     actualWorkload: 0
   }
   ```

   **If type = REFINEMENT**:
   ```typescript
   data = {
     items: []
   }
   ```

   **If type = MOM**:
   ```typescript
   data = {
     rawInput: '',
     summary: '',
     decisions: [],
     actionItems: [],
     attendees: [],
     aiGenerated: false
   }
   ```

3. **Create room**:
   ```sql
   INSERT INTO scrum_rooms
     (id, name, type, description, status, data, project_id, created_by, updated_by, created_at, updated_at)
   VALUES
     (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, NOW(), NOW())
   ```

4. **Fetch and return created room with relations**:
   ```sql
   SELECT room.*, project.*, creator.*, updater.*
   FROM scrum_rooms room
   LEFT JOIN projects project ON room.project_id = project.id
   LEFT JOIN users creator ON room.created_by = creator.id
   LEFT JOIN users updater ON room.updated_by = updater.id
   WHERE room.id = ?
   ```

**Response**:
```json
{
  "id": "room-uuid",
  "name": "Sprint 5 Planning Poker",
  "type": "planning_poker",
  "description": "Estimation session for user story backlog",
  "status": "ACTIVE",
  "data": {
    "deckType": "fibonacci",
    "rounds": [],
    "participants": ["user-uuid"]
  },
  "project": {
    "id": "project-uuid",
    "name": "StandupSnap"
  },
  "isArchived": false,
  "createdBy": {
    "id": "user-uuid",
    "name": "John Doe"
  },
  "createdAt": "2025-12-30T16:00:00Z",
  "updatedAt": "2025-12-30T16:00:00Z"
}
```

**UI Update**:
1. Close modal
2. Navigate to room detail page: `/scrum-rooms/{roomId}`
3. Show success toast: "Room created"

---

## Room Type 1: Planning Poker

**Route**: `/scrum-rooms/{roomId}` (when type = planning_poker)
**Component**: `F:\StandupSnap\frontend\src\components\scrum-rooms\PlanningPokerRoom.tsx`

### UI Components

1. **Room Header**
   - Room name (editable inline)
   - Room type badge: "Planning Poker"
   - Status: Active/Completed
   - "Complete Room" button
   - "Archive" button
   - Back to rooms list link

2. **Deck Selection Panel** (Top)
   - Deck type dropdown:
     - Fibonacci (1, 2, 3, 5, 8, 13, 21)
     - Modified Fibonacci (0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100)
     - T-Shirt Sizes (XS, S, M, L, XL, XXL)
     - Custom (user enters values)
   - If Custom selected: Input field for custom values (comma-separated)

3. **Current Round Panel**
   - "Item Name" input (what is being estimated)
   - Participant cards showing:
     - Each participant's name
     - Card back (if not revealed) or vote value (if revealed)
     - Current user can see their own vote
   - Vote buttons (based on selected deck)
   - "Reveal Votes" button (primary, appears when all have voted or host forces)
   - "Clear Round" button (reset current round)

4. **Statistics Panel** (appears after reveal)
   - Mean: {calculated mean}
   - Median: {calculated median}
   - Mode: {most common vote}
   - Visual chart/graph of vote distribution
   - "Finalize Estimate" input (set final value)
   - "Finalize & Start New Round" button

5. **Round History** (Bottom)
   - Table of past rounds:
     - Round #
     - Item Name
     - Votes (all votes shown)
     - Statistics (Mean, Median, Mode)
     - Final Value
     - Timestamp
   - Export session button (download CSV/JSON)

### User Actions

#### Action 1: User Selects Deck Type

**What happens**: Change voting deck

**Frontend**:
1. User selects deck type from dropdown
2. If Custom, show input field for custom values
3. Update room data with new deck type
4. Clear current round votes (if any)

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "data": {
    "deckType": "t_shirt",
    "rounds": [...existing rounds...],
    "participants": [...]
  }
}
```

**Backend**:
- **Service**: `updateRoomData(id, { data }, userId)`

**Backend Flow**:
1. Find room by ID
2. Update `data` JSONB field
3. Update `updatedBy = userId`, `updatedAt = now()`
4. Save and return room

**UI Update**: Update vote buttons to show new deck values

---

#### Action 2: User Casts Vote

**What happens**: Submit vote for current round

**Frontend**:
1. User clicks vote button (e.g., "5")
2. Send vote to backend
3. Show "Waiting for others..." if not all voted
4. Highlight user's vote button

**Implementation**: Real-time updates via polling or WebSockets (if implemented)

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "data": {
    "deckType": "fibonacci",
    "rounds": [
      {
        "roundId": "round-123",
        "itemName": "User Login API",
        "votes": {
          "user-1": 5,
          "user-2": 8,
          "current-user-id": 5
        },
        "revealed": false,
        "finalValue": null,
        "timestamp": "2025-12-30T16:10:00Z"
      }
    ],
    "participants": ["user-1", "user-2", "current-user-id"]
  }
}
```

**Backend**: Update room data

**UI Update**:
1. Show user's vote as selected
2. Update participant card to show "Voted" (card back)
3. If all voted, enable "Reveal Votes" button

---

#### Action 3: User Reveals Votes

**What happens**: Show all votes and calculate statistics

**Frontend**:
1. User clicks "Reveal Votes"
2. Call backend to mark round as revealed
3. Calculate statistics (mean, median, mode)
4. Animate card flip to show votes

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "data": {
    "deckType": "fibonacci",
    "rounds": [
      {
        "roundId": "round-123",
        "itemName": "User Login API",
        "votes": {
          "user-1": 5,
          "user-2": 8,
          "user-3": 5
        },
        "revealed": true,
        "finalValue": null,
        "mean": 6.0,
        "median": 5,
        "mode": 5,
        "timestamp": "2025-12-30T16:10:00Z"
      }
    ],
    "participants": ["user-1", "user-2", "user-3"]
  }
}
```

**Backend**:
- **Service**: `calculatePlanningPokerStats(votes)` is called

**Statistics Calculation** (Backend):
```typescript
calculatePlanningPokerStats(votes: Record<string, string | number>): {
  mean: number;
  median: number;
  mode: string | number;
} {
  // Convert to numeric values
  const numericVotes = Object.values(votes)
    .map(v => typeof v === 'string' ? parseFloat(v) : v)
    .filter(v => !isNaN(v));

  // Mean
  const mean = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;

  // Median
  const sorted = [...numericVotes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  // Mode (most frequent)
  const frequency: Record<string, number> = {};
  Object.values(votes).forEach(vote => {
    const key = String(vote);
    frequency[key] = (frequency[key] || 0) + 1;
  });
  const mode = Object.keys(frequency).reduce((a, b) =>
    frequency[a] > frequency[b] ? a : b
  );

  return {
    mean: Math.round(mean * 10) / 10,
    median,
    mode
  };
}
```

**UI Update**:
1. Flip all cards to show votes
2. Display statistics panel with mean, median, mode
3. Show vote distribution chart
4. Enable "Finalize Estimate" input

---

#### Action 4: User Finalizes Estimate

**What happens**: Set final agreed-upon value

**Frontend**:
1. User enters final value (can be different from votes)
2. Click "Finalize & Start New Round"
3. Update round with final value
4. Clear votes for new round

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "data": {
    "deckType": "fibonacci",
    "rounds": [
      {
        "roundId": "round-123",
        "itemName": "User Login API",
        "votes": { ... },
        "revealed": true,
        "finalValue": 5,
        "mean": 6.0,
        "median": 5,
        "mode": 5,
        "timestamp": "2025-12-30T16:10:00Z"
      },
      {
        "roundId": "round-124",
        "itemName": "",
        "votes": {},
        "revealed": false,
        "finalValue": null,
        "timestamp": "2025-12-30T16:15:00Z"
      }
    ],
    "participants": ["user-1", "user-2", "user-3"]
  }
}
```

**UI Update**:
1. Move completed round to history
2. Clear current round votes
3. Focus on item name input for next estimation

---

#### Action 5: User Exports Session

**What happens**: Download all rounds as CSV or JSON

**Frontend**:
1. User clicks "Export Session"
2. Generate CSV or JSON from round history
3. Download file

**Format (CSV)**:
```csv
Round,Item Name,User 1,User 2,User 3,Mean,Median,Mode,Final Value
1,User Login API,5,8,5,6.0,5,5,5
2,Dashboard UI,13,13,8,11.3,13,13,13
```

**No API Call**: Frontend-only export from current room data

---

## Room Type 2: Retrospective

**Route**: `/scrum-rooms/{roomId}` (when type = retrospective)
**Component**: `F:\StandupSnap\frontend\src\components\scrum-rooms\RetrospectiveRoom.tsx`

### UI Components

1. **Room Header**
   - Room name (editable)
   - "Retrospective" badge
   - "Complete Room" button
   - "Generate AI Summary" button
   - "Export Retro" button
   - Back to rooms list

2. **Column Configuration Panel** (Collapsible)
   - "Edit Columns" button
   - Modal to add/remove/rename columns
   - Default columns: "What Went Well", "What Didn't Go Well", "Improvements", "Kudos"

3. **Voting Settings Panel** (Collapsible)
   - "Enable Voting" toggle
   - "Max Votes Per Person" input (if voting enabled)

4. **Retro Board** (Main Area)
   - 4 columns (drag-and-drop enabled):
     - Column header with title and item count
     - "+ Add Item" button at top
     - Retro cards/items:
       - Content text
       - Created by user name
       - Vote count (if voting enabled)
       - Vote button (if voting enabled and user has votes left)
       - Discussion icon (expand for discussion)
       - "Convert to Action Item" button
       - Delete button (only own items)
   - Drag items between columns

5. **Item Detail Modal** (when clicked)
   - Item content
   - Created by
   - Discussion notes (editable)
   - Vote count and voters list
   - "Convert to Action Item" button
   - "Delete" button

6. **Action Items Summary** (Bottom)
   - List of items marked as action items
   - "Push to RAID Issues" button (future feature)

### User Actions

#### Action 1: User Adds Retro Item

**What happens**: Create new retro card in a column

**Frontend**:
1. User clicks "+ Add Item" in a column
2. Show inline input or modal
3. User types content
4. Submit item

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "data": {
    "columns": [
      {
        "columnId": "col-1",
        "title": "What Went Well",
        "order": 0,
        "items": [
          {
            "itemId": "item-new-uuid",
            "content": "Great team collaboration this sprint",
            "createdBy": "user-uuid",
            "createdByName": "John Doe",
            "votes": [],
            "timestamp": "2025-12-30T16:20:00Z"
          },
          ...existing items...
        ]
      },
      ...other columns...
    ],
    "votingEnabled": true,
    "maxVotesPerPerson": 3
  }
}
```

**Backend**: Update room data

**UI Update**:
1. Add new card to column
2. Animate card appearance
3. Clear input field

---

#### Action 2: User Drags Item Between Columns

**What happens**: Move item from one column to another

**Frontend**:
1. User drags item card
2. Drop in target column
3. Update item's parent column in data
4. Save to backend

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data
Authorization: Bearer {accessToken}

{
  "data": {
    "columns": [
      {
        "columnId": "col-1",
        "title": "What Went Well",
        "order": 0,
        "items": [...items without the moved item...]
      },
      {
        "columnId": "col-2",
        "title": "What Didn't Go Well",
        "order": 1,
        "items": [
          ...existing items...,
          {
            "itemId": "item-moved-uuid",
            "content": "Testing was delayed",
            ...
          }
        ]
      },
      ...
    ]
  }
}
```

**UI Update**: Item appears in new column with animation

---

#### Action 3: User Votes on Item

**What happens**: Add vote to retro item

**Frontend**:
1. Check if user has votes remaining (maxVotesPerPerson)
2. User clicks vote button on item
3. Add userId to item's votes array
4. Update vote count display

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data
Authorization: Bearer {accessToken}

{
  "data": {
    "columns": [
      {
        "columnId": "col-1",
        "title": "What Went Well",
        "order": 0,
        "items": [
          {
            "itemId": "item-123",
            "content": "Great team collaboration",
            "votes": ["user-1", "user-2", "current-user-uuid"],
            ...
          }
        ]
      }
    ]
  }
}
```

**Business Rule**: User can vote max `maxVotesPerPerson` times across all items

**UI Update**:
1. Increment vote count on item
2. Disable vote button if user already voted on this item
3. Update "Votes Remaining: X/3" indicator

---

#### Action 4: User Adds Discussion to Item

**What happens**: Expand item and add discussion notes

**Frontend**:
1. User clicks discussion icon or item card
2. Open item detail modal
3. Show discussion textarea
4. User adds notes
5. Save discussion

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "columns": [
      {
        "columnId": "col-2",
        "items": [
          {
            "itemId": "item-456",
            "content": "Testing was delayed",
            "discussion": "We need to allocate more time for testing in next sprint. Suggest adding buffer days.",
            ...
          }
        ]
      }
    ]
  }
}
```

**UI Update**: Show discussion text below item content

---

#### Action 5: User Converts Item to Action Item

**What happens**: Mark item as action item (future: push to RAID Issues)

**Frontend**:
1. User clicks "Convert to Action Item" in item modal
2. Mark `actionItem = true` in item
3. Item appears in "Action Items Summary" section

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "columns": [
      {
        "columnId": "col-2",
        "items": [
          {
            "itemId": "item-456",
            "content": "Allocate more testing time",
            "actionItem": true,
            ...
          }
        ]
      }
    ]
  }
}
```

**UI Update**:
1. Show action item badge on card
2. Add to action items summary section at bottom
3. Change card color/styling

**Future Feature**: "Push to RAID Issues" button will create actual Issue in RAID module

---

#### Action 6: User Generates AI Summary

**What happens**: AI generates retrospective summary (via Groq API)

**Frontend**:
1. User clicks "Generate AI Summary"
2. Show loading indicator
3. Collect all retro items from all columns
4. Send to AI for summary generation

**API Call**:
```http
POST /api/scrum-rooms/{roomId}/generate-summary
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "roomId": "room-uuid"
}
```

**Backend**:
- **Controller**: `@Post(':id/generate-summary')`
- **Service**: Custom method to generate retro summary

**Backend Flow**:
1. Fetch room data
2. Extract all items from all columns
3. Format items for AI prompt:
   ```
   RETROSPECTIVE SUMMARY GENERATION

   What Went Well:
   - Great team collaboration (3 votes)
   - Completed all stories (2 votes)

   What Didn't Go Well:
   - Testing was delayed (5 votes)
   - Communication gaps (1 vote)

   Improvements:
   - Add daily sync meetings
   - Use shared documentation

   Kudos:
   - John for debugging complex issue

   Generate a concise retrospective summary highlighting:
   1. Main achievements
   2. Key challenges
   3. Top voted items
   4. Recommended action items
   ```

4. **Call Groq API**:
   ```typescript
   const response = await axios.post(
     'https://api.groq.com/openai/v1/chat/completions',
     {
       model: 'llama-3.3-70b-versatile',
       messages: [
         {
           role: 'system',
           content: 'You are a Scrum Master assistant. Generate concise retrospective summaries.'
         },
         {
           role: 'user',
           content: prompt
         }
       ],
       temperature: 0.3,
       max_tokens: 1000
     },
     {
       headers: {
         'Authorization': `Bearer ${groqApiKey}`,
         'Content-Type': 'application/json'
       }
     }
   );
   ```

5. Parse AI response
6. Return summary

**Response**:
```json
{
  "summary": "Sprint Retrospective Summary:\n\nAchievements:\n- Strong team collaboration noted by multiple members\n- All planned stories completed\n\nChallenges:\n- Testing delays were the primary concern (highest votes)\n- Communication gaps between team members\n\nRecommendations:\n1. Implement daily sync meetings\n2. Establish shared documentation practices\n3. Allocate dedicated testing buffer time\n\nKudos: John recognized for exceptional debugging effort on complex issue."
}
```

**UI Update**:
1. Display AI summary in modal or side panel
2. Option to copy summary
3. Option to include in export

---

#### Action 7: User Exports Retro

**What happens**: Download retrospective summary

**Frontend**:
1. User clicks "Export Retro"
2. Generate formatted document with:
   - Room name
   - Date
   - All columns and items
   - Vote counts
   - Action items
   - AI summary (if generated)
3. Download as PDF, DOCX, or TXT

**Implementation**: Frontend-only using current room data + optional AI summary

**Export Format (Markdown)**:
```markdown
# Sprint 5 Retrospective
Date: 2025-12-30

## What Went Well
- Great team collaboration (3 votes)
- Completed all stories (2 votes)

## What Didn't Go Well
- Testing was delayed (5 votes)
  Discussion: Need to allocate more testing time
  **Action Item**

## Improvements
- Add daily sync meetings
- Use shared documentation

## Kudos
- John for debugging complex issue

---

## Action Items
1. Allocate more testing time
2. [Other action items]

## AI Summary
[AI-generated summary if available]
```

---

## Room Type 3: Sprint Planning

**Route**: `/scrum-rooms/{roomId}` (when type = sprint_planning)
**Component**: `F:\StandupSnap\frontend\src\components\scrum-rooms\SprintPlanningRoom.tsx`

### UI Components

1. **Room Header**
   - Room name
   - "Sprint Planning" badge
   - "Complete Room" button
   - "Export Plan" button

2. **Capacity Panel** (Top)
   - "Team Capacity" input (story points)
   - Current workload display: "21 / 40 SP"
   - Progress bar (green if under capacity, red if over)
   - Warning if over capacity: "Over capacity by 5 SP"

3. **Sprint Goals Panel**
   - "Sprint Goals" section
   - Input to add goals
   - List of goals with delete option

4. **Planning Board** (3 Columns - Drag & Drop)

   **Column 1: Ready (Backlog)**
   - Items waiting to be pulled into sprint
   - "+ Add Item" button

   **Column 2: In Scope**
   - Items committed to sprint
   - Auto-calculate total estimate

   **Column 3: Out of Scope**
   - Items that won't fit in sprint

5. **Item Card**
   - Title (editable inline)
   - Estimate input (story points)
   - Drag handle
   - Delete button

6. **Auto-Calculate Workload**
   - Sums estimates of all "In Scope" items
   - Updates `actualWorkload` in data
   - Compares to capacity

### User Actions

#### Action 1: User Sets Team Capacity

**What happens**: Input sprint capacity

**Frontend**:
1. User enters capacity value (e.g., 40 story points)
2. Update room data

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "capacity": 40,
    "items": [...],
    "sprintGoals": [...],
    "actualWorkload": 21
  }
}
```

**UI Update**:
1. Update capacity display
2. Update progress bar
3. Show/hide over-capacity warning

---

#### Action 2: User Adds Sprint Goal

**What happens**: Add goal to sprint

**Frontend**:
1. User clicks "+ Add Goal"
2. Input field appears
3. User types goal and presses Enter
4. Goal added to list

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "capacity": 40,
    "items": [...],
    "sprintGoals": [
      "Complete user authentication",
      "Implement basic dashboard"
    ],
    "actualWorkload": 21
  }
}
```

**UI Update**: Display goal in goals list

---

#### Action 3: User Adds Planning Item

**What happens**: Create new story/item for planning

**Frontend**:
1. User clicks "+ Add Item" in Ready column
2. Input title and estimate
3. Item added to Ready column

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "capacity": 40,
    "items": [
      {
        "itemId": "item-new-uuid",
        "title": "User Login API",
        "estimate": 8,
        "status": "ready",
        "order": 0
      },
      ...existing items...
    ],
    "sprintGoals": [...],
    "actualWorkload": 0
  }
}
```

**UI Update**: New item card appears in Ready column

---

#### Action 4: User Drags Item to "In Scope"

**What happens**: Commit item to sprint

**Frontend**:
1. User drags item from Ready to In Scope
2. Update item status
3. Recalculate workload
4. Check capacity

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "capacity": 40,
    "items": [
      {
        "itemId": "item-1",
        "title": "User Login API",
        "estimate": 8,
        "status": "in_scope",  // Changed from "ready"
        "order": 0
      },
      {
        "itemId": "item-2",
        "title": "Dashboard UI",
        "estimate": 13,
        "status": "in_scope",
        "order": 1
      }
    ],
    "sprintGoals": [...],
    "actualWorkload": 21  // 8 + 13
  }
}
```

**Business Rules**:
- Auto-calculate `actualWorkload` = sum of all "in_scope" item estimates
- Show warning if `actualWorkload > capacity`

**UI Update**:
1. Move item to In Scope column
2. Update workload: "21 / 40 SP"
3. Update progress bar
4. Show warning if over capacity

---

#### Action 5: User Updates Item Estimate

**What happens**: Change story points

**Frontend**:
1. User clicks on estimate value
2. Inline input appears
3. User enters new estimate
4. Recalculate workload

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "items": [
      {
        "itemId": "item-1",
        "title": "User Login API",
        "estimate": 5,  // Changed from 8
        "status": "in_scope",
        "order": 0
      }
    ],
    "actualWorkload": 18  // Recalculated
  }
}
```

**UI Update**: Update workload display

---

#### Action 6: User Exports Sprint Plan

**What happens**: Download sprint plan summary

**Frontend**:
1. User clicks "Export Plan"
2. Generate document with:
   - Room name
   - Sprint goals
   - Capacity vs. workload
   - All items by status
3. Download as PDF, DOCX, or CSV

**Export Format (Markdown)**:
```markdown
# Sprint 5 Planning

## Sprint Goals
- Complete user authentication
- Implement basic dashboard

## Capacity
- Team Capacity: 40 SP
- Committed Workload: 21 SP
- Remaining Capacity: 19 SP

## Items In Scope
1. User Login API - 8 SP
2. Dashboard UI - 13 SP

Total: 21 SP

## Items Out of Scope
1. Advanced Reporting - 21 SP

## Items Ready (Not Yet Committed)
1. Email Notifications - 5 SP
```

---

## Room Type 4: Refinement

**Route**: `/scrum-rooms/{roomId}` (when type = refinement)
**Component**: `F:\StandupSnap\frontend\src\components\scrum-rooms\RefinementRoom.tsx`

### UI Components

1. **Room Header**
   - Room name
   - "Refinement" badge
   - "Complete Room" button
   - "Export Refinement" button

2. **Items List** (Left Panel)
   - "+ Add Item" button
   - List of refinement items:
     - Item title
     - Estimate badge (if set)
     - Status indicator (refined/not refined)
     - Click to view details

3. **Item Detail Panel** (Right Panel)
   - Item title (editable)
   - Estimate input (story points)

   **Notes Section**:
   - "+ Add Note" button
   - List of notes with delete option

   **Acceptance Criteria Section**:
   - "+ Add Criterion" button
   - List of criteria (editable)
   - "AI Rewrite Criteria" button (per criterion or all)

   **AI Suggestions Section**:
   - "Get AI Suggestions" button
   - AI-generated suggestions for story breakdown
   - AI-enhanced acceptance criteria

   **Story Breakdown Section**:
   - AI suggestions for breaking story into smaller tasks

4. **Action Buttons**
   - "Save Item"
   - "Delete Item"

### User Actions

#### Action 1: User Adds Refinement Item

**What happens**: Create new item for refinement

**Frontend**:
1. User clicks "+ Add Item"
2. Input title
3. Item created with empty details

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "items": [
      {
        "itemId": "item-new-uuid",
        "title": "User Registration Flow",
        "notes": [],
        "acceptanceCriteria": [],
        "timestamp": "2025-12-30T17:00:00Z"
      },
      ...existing items...
    ]
  }
}
```

**UI Update**: New item appears in list

---

#### Action 2: User Adds Notes

**What happens**: Add discussion notes to item

**Frontend**:
1. User clicks "+ Add Note"
2. Input note text
3. Add to notes array

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "items": [
      {
        "itemId": "item-1",
        "title": "User Registration Flow",
        "notes": [
          "Should support email verification",
          "Password strength requirements needed"
        ],
        "acceptanceCriteria": [],
        ...
      }
    ]
  }
}
```

**UI Update**: Note appears in notes list

---

#### Action 3: User Adds Acceptance Criteria

**What happens**: Define acceptance criteria for story

**Frontend**:
1. User clicks "+ Add Criterion"
2. Input criterion text
3. Add to acceptanceCriteria array

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "items": [
      {
        "itemId": "item-1",
        "title": "User Registration Flow",
        "notes": [...],
        "acceptanceCriteria": [
          "User can register with email and password",
          "Email verification link sent",
          "Password must meet security requirements"
        ],
        ...
      }
    ]
  }
}
```

**UI Update**: Criterion appears in criteria list

---

#### Action 4: User Requests AI Rewrite of Acceptance Criteria

**What happens**: AI rewrites criteria for clarity (via Groq API)

**Frontend**:
1. User clicks "AI Rewrite Criteria"
2. Show loading state
3. Send current criteria to AI
4. AI returns improved version

**API Call**:
```http
POST /api/scrum-rooms/{roomId}/ai-rewrite-criteria
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "itemId": "item-1",
  "currentCriteria": [
    "User can register",
    "Email sent",
    "Password secure"
  ]
}
```

**Backend**:
- **Custom endpoint or part of room service**

**Backend Flow**:
1. Receive current criteria
2. Format prompt for AI:
   ```
   You are a product owner assistant. Rewrite these acceptance criteria to be clear, specific, and testable:

   Current criteria:
   - User can register
   - Email sent
   - Password secure

   Return improved acceptance criteria in bullet point format.
   ```

3. **Call Groq API**:
   ```typescript
   const response = await axios.post(
     'https://api.groq.com/openai/v1/chat/completions',
     {
       model: 'llama-3.3-70b-versatile',
       messages: [
         {
           role: 'system',
           content: 'You are a product owner assistant. Improve acceptance criteria to be clear, specific, and testable.'
         },
         {
           role: 'user',
           content: prompt
         }
       ],
       temperature: 0.3,
       max_tokens: 800
     },
     { headers: { Authorization: `Bearer ${groqApiKey}` } }
   );
   ```

4. Parse AI response
5. Return improved criteria

**Response**:
```json
{
  "improvedCriteria": [
    "Given valid email and password, when user submits registration form, then account is created and confirmation email sent",
    "Given new user registration, when email verification link is clicked, then account is activated",
    "Given password input, when user creates password, then password must contain minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character"
  ]
}
```

**UI Update**:
1. Show side-by-side comparison (old vs. AI-improved)
2. "Accept AI Version" button
3. "Keep Original" button
4. User can manually edit AI suggestions

---

#### Action 5: User Gets AI Suggestions for Story Breakdown

**What happens**: AI suggests how to break story into smaller tasks

**Frontend**:
1. User clicks "Get AI Suggestions"
2. Send item title, notes, and criteria to AI
3. AI returns breakdown suggestions

**API Call**:
```http
POST /api/scrum-rooms/{roomId}/ai-story-breakdown
Content-Type: application/json

{
  "itemId": "item-1",
  "title": "User Registration Flow",
  "notes": [...],
  "acceptanceCriteria": [...]
}
```

**Backend Flow**:
1. Format prompt:
   ```
   You are a Scrum Master. Break down this user story into smaller technical tasks:

   Story: User Registration Flow

   Notes:
   - Email verification needed
   - Password requirements

   Acceptance Criteria:
   - User can register with email and password
   - Email verification link sent
   - Password meets security requirements

   Provide a list of technical tasks to implement this story.
   ```

2. Call Groq API
3. Parse response

**Response**:
```json
{
  "aiSuggestions": [
    "Create user registration API endpoint (POST /api/auth/register)",
    "Implement email validation logic",
    "Design and implement password strength validation",
    "Set up email service integration for verification emails",
    "Create email verification endpoint (GET /api/auth/verify-email/:token)",
    "Design registration form UI",
    "Implement form validation on frontend",
    "Add password strength indicator",
    "Write unit tests for registration logic",
    "Write integration tests for registration flow"
  ]
}
```

**UI Update**:
1. Display AI suggestions in panel
2. User can:
   - Accept suggestions (copy to notes)
   - Edit suggestions
   - Dismiss

---

#### Action 6: User Sets Estimate

**What happens**: Assign story points to refined item

**Frontend**:
1. User enters estimate value
2. Update item

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "items": [
      {
        "itemId": "item-1",
        "title": "User Registration Flow",
        "estimate": 8,
        ...
      }
    ]
  }
}
```

**UI Update**: Show estimate badge on item

---

#### Action 7: User Exports Refinement

**What happens**: Download refinement summary

**Export Format (Markdown)**:
```markdown
# Refinement Session: Sprint 5 Backlog

## Item 1: User Registration Flow
**Estimate**: 8 SP

### Notes
- Email verification needed
- Password requirements

### Acceptance Criteria
1. User can register with email and password
2. Email verification link sent
3. Password must meet security requirements

### AI Suggestions (Story Breakdown)
- Create user registration API endpoint
- Implement email validation logic
- Set up email service integration
- [etc.]

---

## Item 2: Dashboard UI
...
```

---

## Room Type 5: MOM (Meeting Minutes)

**Route**: `/scrum-rooms/{roomId}` (when type = mom)
**Component**: `F:\StandupSnap\frontend\src\components\scrum-rooms\MOMRoom.tsx`

### UI Components

1. **Room Header**
   - Room name
   - "Meeting Minutes" badge
   - "Export MOM" button

2. **Input Panel** (Left Side)
   - **Raw Input Tab**:
     - Large textarea for meeting notes
     - "Parse with AI" button (primary)
     - File upload option (TXT, PDF, DOCX)

   - **Attendees Section**:
     - "+ Add Attendee" button
     - List of attendees (removable)

3. **Structured Output Panel** (Right Side)
   - **Summary Section**:
     - Display AI-generated summary
     - Editable textarea

   - **Decisions Section**:
     - List of decisions (editable)
     - "+ Add Decision" button

   - **Action Items Section**:
     - Table with columns:
       - Description
       - Assignee
       - Due Date
     - "+ Add Action Item" button

   - **Save MOM** button
   - **Export** button (TXT, DOCX, PDF)

### User Actions

#### Action 1: User Enters Raw Meeting Notes

**What happens**: Input unstructured meeting notes

**Frontend**:
1. User types or pastes meeting notes in textarea
2. Save raw input to room data

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "rawInput": "Team discussed sprint planning. John presented API progress. Decided to launch on March 15th. Sarah will review docs by March 10th.",
    "summary": "",
    "decisions": [],
    "actionItems": [],
    "attendees": [],
    "aiGenerated": false
  }
}
```

**UI Update**: Raw input saved

---

#### Action 2: User Uploads Transcript File

**What happens**: Upload meeting transcript (TXT, PDF, DOCX)

**Frontend**:
1. User clicks upload button
2. Select file (TXT, PDF, or DOCX)
3. Upload file to backend
4. Backend extracts text
5. Populate raw input with extracted text

**API Call**:
```http
POST /api/scrum-rooms/{roomId}/upload-transcript
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

file: [transcript.pdf]
```

**Backend**:
- Same extraction logic as Standalone MOM (pdf-parse, mammoth)

**Backend Flow**:
1. Receive file
2. Extract text based on MIME type:
   - **TXT**: `file.buffer.toString('utf-8')`
   - **PDF**: `await pdfParse(file.buffer)` → `result.text`
   - **DOCX**: `await mammoth.extractRawText({ buffer: file.buffer })` → `result.value`
3. Return extracted text

**Response**:
```json
{
  "extractedText": "Team discussed sprint planning. John presented API progress..."
}
```

**UI Update**:
1. Populate raw input textarea with extracted text
2. Enable "Parse with AI" button

---

#### Action 3: User Clicks "Parse with AI"

**What happens**: AI parses raw notes into structured MOM (via Groq API)

**Frontend**:
1. User clicks "Parse with AI"
2. Show loading indicator
3. Send raw input to AI
4. Receive structured output
5. Populate Summary, Decisions, Action Items sections

**API Call**:
```http
POST /api/scrum-rooms/{roomId}/generate-mom
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "rawInput": "Team discussed sprint planning. John presented API progress. Decided to launch on March 15th. Sarah will review docs by March 10th. Mike raised testing concerns."
}
```

**Backend**:
- **Custom endpoint or use ScrumRoomsService.generateMOMSummary()**

**Backend Flow**:
1. Receive raw input
2. Format prompt:
   ```
   You are an expert meeting minutes assistant. Parse meeting notes and extract:
   1. Summary: A concise overview
   2. Decisions: All decisions made
   3. Action Items: Tasks with owners and deadlines

   Return ONLY a JSON object:
   {
     "summary": "Brief meeting summary",
     "decisions": ["Decision 1", "Decision 2"],
     "actionItems": [{"description": "Task", "assignee": "Person", "dueDate": "YYYY-MM-DD"}]
   }

   Meeting notes:
   Team discussed sprint planning. John presented API progress. Decided to launch on March 15th. Sarah will review docs by March 10th. Mike raised testing concerns.
   ```

3. **Call Groq API**:
   ```typescript
   const response = await axios.post(
     'https://api.groq.com/openai/v1/chat/completions',
     {
       model: 'llama-3.3-70b-versatile',
       messages: [
         {
           role: 'system',
           content: 'You are a meeting minutes assistant. Extract structured MOM from raw notes. Return ONLY valid JSON.'
         },
         {
           role: 'user',
           content: prompt
         }
       ],
       temperature: 0.3,
       max_tokens: 2000,
       response_format: { type: 'json_object' }
     },
     {
       headers: {
         Authorization: `Bearer ${groqApiKey}`,
         'Content-Type': 'application/json'
       },
       timeout: 30000
     }
   );
   ```

4. Parse JSON response
5. Return structured data

**Response**:
```json
{
  "summary": "Sprint planning discussion focusing on API development and launch timeline. Testing concerns were raised.",
  "decisions": [
    "Launch date confirmed for March 15th",
    "Documentation review deadline set for March 10th"
  ],
  "actionItems": [
    {
      "id": "action-1734789600-0",
      "description": "Review and finalize documentation",
      "assignee": "Sarah",
      "dueDate": "2025-03-10"
    },
    {
      "id": "action-1734789600-1",
      "description": "Address testing concerns raised",
      "assignee": "Mike",
      "dueDate": null
    }
  ]
}
```

**Fallback** (if AI fails):
```json
{
  "summary": "[First 500 chars of raw input]",
  "decisions": [],
  "actionItems": []
}
```

**Update Room Data**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "rawInput": "...",
    "summary": "Sprint planning discussion...",
    "decisions": ["Launch on March 15th", ...],
    "actionItems": [{...}],
    "attendees": [],
    "aiGenerated": true
  }
}
```

**UI Update**:
1. Populate Summary section with AI-generated text
2. Display Decisions as editable list
3. Display Action Items in table (editable)
4. Show "AI Generated" badge
5. User can manually edit all fields

---

#### Action 4: User Manually Edits AI Output

**What happens**: Refine AI-generated content

**Frontend**:
1. User edits summary, decisions, or action items
2. Auto-save changes to room data

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    "rawInput": "...",
    "summary": "User-edited summary...",
    "decisions": ["Updated decision 1", ...],
    "actionItems": [{...}],
    "attendees": [...],
    "aiGenerated": true
  }
}
```

---

#### Action 5: User Adds Attendees

**What happens**: Record meeting attendees

**Frontend**:
1. User clicks "+ Add Attendee"
2. Input name
3. Add to attendees array

**API Call**:
```http
PATCH /api/scrum-rooms/{roomId}/data

{
  "data": {
    ...existing data...,
    "attendees": ["John Doe", "Jane Smith", "Mike Johnson"]
  }
}
```

---

#### Action 6: User Exports MOM

**What happens**: Download meeting minutes as TXT or DOCX

**Frontend**:
1. User clicks "Export MOM"
2. Select format (TXT or DOCX)
3. Generate document
4. Download file

**Export Format (TXT)**:
```
Meeting Minutes
===============

Room: Sprint Planning Discussion
Date: 2025-12-30

Attendees:
- John Doe
- Jane Smith
- Mike Johnson

Summary:
--------
Sprint planning discussion focusing on API development and launch timeline. Testing concerns were raised.

Decisions:
----------
1. Launch date confirmed for March 15th
2. Documentation review deadline set for March 10th

Action Items:
-------------
1. Review and finalize documentation
   Assignee: Sarah
   Due Date: 2025-03-10

2. Address testing concerns raised
   Assignee: Mike
   Due Date: TBD
```

**DOCX Export**: Use `docx` library (same as Standalone MOM service)

---

## API Endpoints

### Room Management

#### 1. Create Room
```http
POST /api/scrum-rooms
Authorization: Bearer {accessToken}
Content-Type: application/json

Body:
{
  "name": "Sprint 5 Planning Poker",
  "type": "planning_poker",
  "description": "Optional description",
  "projectId": "project-uuid"  // Optional
}

Response: 201 Created
{
  "id": "room-uuid",
  "name": "Sprint 5 Planning Poker",
  "type": "planning_poker",
  "status": "ACTIVE",
  "data": { ...initialized data... },
  "project": { ... },
  "createdBy": { ... },
  "createdAt": "2025-12-30T16:00:00Z"
}
```

---

#### 2. Get All Rooms
```http
GET /api/scrum-rooms?projectId={uuid}&type={type}&status={status}&includeArchived={bool}
Authorization: Bearer {accessToken}

Response: 200 OK
[
  {
    "id": "room-uuid",
    "name": "Sprint 5 Planning Poker",
    "type": "planning_poker",
    "status": "ACTIVE",
    "data": { ... },
    "project": { ... },
    "isArchived": false,
    "createdBy": { ... },
    "createdAt": "2025-12-30T16:00:00Z",
    "updatedAt": "2025-12-30T16:30:00Z"
  }
]
```

---

#### 3. Get Room by ID
```http
GET /api/scrum-rooms/{roomId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "id": "room-uuid",
  "name": "Sprint 5 Planning Poker",
  "type": "planning_poker",
  "status": "ACTIVE",
  "data": { ...full room data... },
  "project": { ... },
  "createdBy": { ... },
  "updatedBy": { ... },
  "createdAt": "2025-12-30T16:00:00Z",
  "updatedAt": "2025-12-30T16:30:00Z"
}
```

---

#### 4. Update Room Metadata
```http
PATCH /api/scrum-rooms/{roomId}
Authorization: Bearer {accessToken}
Content-Type: application/json

Body:
{
  "name": "Updated Room Name",
  "description": "Updated description",
  "status": "COMPLETED"
}

Response: 200 OK
{
  "id": "room-uuid",
  "name": "Updated Room Name",
  ...
}
```

---

#### 5. Update Room Data
```http
PATCH /api/scrum-rooms/{roomId}/data
Authorization: Bearer {accessToken}
Content-Type: application/json

Body:
{
  "data": {
    ...full updated room data based on type...
  }
}

Response: 200 OK
{
  "id": "room-uuid",
  "data": { ...updated data... },
  ...
}
```

---

#### 6. Complete Room
```http
POST /api/scrum-rooms/{roomId}/complete
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "id": "room-uuid",
  "status": "COMPLETED",
  "completedAt": "2025-12-30T18:00:00Z",
  ...
}
```

---

#### 7. Archive Room
```http
POST /api/scrum-rooms/{roomId}/archive
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "id": "room-uuid",
  "status": "ARCHIVED",
  "isArchived": true,
  "archivedAt": "2025-12-30T18:00:00Z",
  ...
}
```

---

#### 8. Restore Room
```http
POST /api/scrum-rooms/{roomId}/restore
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "id": "room-uuid",
  "status": "ACTIVE",
  "isArchived": false,
  "archivedAt": null,
  ...
}
```

---

#### 9. Delete Room
```http
DELETE /api/scrum-rooms/{roomId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### AI-Specific Endpoints

#### 10. Generate MOM Summary (Room-based)
```http
POST /api/scrum-rooms/{roomId}/generate-mom
Authorization: Bearer {accessToken}
Content-Type: application/json

Body:
{
  "rawInput": "Meeting notes text..."
}

Response: 200 OK
{
  "summary": "AI-generated summary",
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": [
    {
      "id": "action-123",
      "description": "Task description",
      "assignee": "Person",
      "dueDate": "2025-03-15"
    }
  ]
}
```

**Backend**: Uses `ScrumRoomsService.generateMOMSummary(text)`

---

## AI Integration

### Groq API Configuration

**Environment Variables**:
```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
```

**Service Configuration**:
```typescript
// F:\StandupSnap\backend\src\scrum-rooms\scrum-rooms.service.ts

constructor(
  private configService: ConfigService
) {
  this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') || '';
  this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
}
```

---

### AI Use Cases

#### 1. MOM AI Parsing

**Prompt Template**:
```
You are an expert meeting minutes assistant. Parse meeting notes and extract:
1. Summary: A concise overview of the main discussions and topics
2. Decisions: All decisions made, agreements, or conclusions
3. Action Items: Tasks with owners and deadlines (if mentioned)

Return ONLY a JSON object with this structure:
{
  "summary": "Brief meeting summary",
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": [{"description": "Task description", "assignee": "Person name", "dueDate": "YYYY-MM-DD"}]
}

If a field is not found, use empty strings or arrays.

Meeting notes:
{rawInput}
```

**API Call**:
```typescript
const response = await axios.post(
  'https://api.groq.com/openai/v1/chat/completions',
  {
    model: this.groqModel,
    messages: [
      {
        role: 'system',
        content: 'You are a meeting minutes assistant. Extract structured MOM from raw notes. Return ONLY valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: 'json_object' }
  },
  {
    headers: {
      Authorization: `Bearer ${this.groqApiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  }
);
```

**Error Handling**:
```typescript
try {
  const content = response.data?.choices?.[0]?.message?.content || '';
  let parsed = JSON.parse(content);
  return {
    summary: parsed.summary || 'Meeting discussion',
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    actionItems: (parsed.actionItems || []).map((item, idx) => ({
      id: `action-${Date.now()}-${idx}`,
      description: item.description || String(item),
      assignee: item.assignee || item.owner,
      dueDate: item.dueDate || item.due_date
    }))
  };
} catch (error) {
  console.error('AI generation error:', error.message);
  return this.fallbackMOMParse(text);
}
```

**Fallback**:
```typescript
private fallbackMOMParse(text: string) {
  return {
    summary: text.substring(0, 500),
    decisions: [],
    actionItems: []
  };
}
```

---

#### 2. Retrospective AI Summary

**Prompt Template**:
```
You are a Scrum Master assistant. Generate a concise retrospective summary highlighting:
1. Main achievements
2. Key challenges
3. Top voted items
4. Recommended action items

Retrospective data:
{columns and items with vote counts}

Generate a professional summary in markdown format.
```

**Implementation**: Similar structure to MOM AI parsing

---

#### 3. Refinement AI Criteria Rewrite

**Prompt Template**:
```
You are a product owner assistant. Rewrite these acceptance criteria to be clear, specific, and testable using Given-When-Then format where appropriate:

Current criteria:
{currentCriteria}

Return improved acceptance criteria as a JSON array of strings.
```

**Response Format**:
```json
{
  "improvedCriteria": [
    "Given valid email and password, when user submits registration, then account is created",
    "..."
  ]
}
```

---

#### 4. Refinement AI Story Breakdown

**Prompt Template**:
```
You are a Scrum Master. Break down this user story into smaller technical tasks:

Story: {title}
Notes: {notes}
Acceptance Criteria: {acceptanceCriteria}

Provide a list of technical tasks to implement this story. Return as JSON array.
```

**Response Format**:
```json
{
  "tasks": [
    "Create API endpoint",
    "Implement validation logic",
    "..."
  ]
}
```

---

## Complete User Journeys

### Journey 1: Planning Poker Estimation Session

1. **SM creates Planning Poker room**
   - Navigate to Scrum Rooms
   - Click "Create Room"
   - Select "Planning Poker"
   - Name: "Sprint 5 Estimation"
   - Associate with Project
   - Create room

2. **SM shares room with team**
   - Open room
   - Copy room URL
   - Share with team via Slack/email

3. **Team joins room**
   - Each team member opens room URL
   - System adds them to participants

4. **SM sets up deck**
   - Select "Fibonacci" deck
   - Enter first story: "User Login API"

5. **Team votes**
   - Each member selects their estimate
   - Cards show "Voted" (face down)

6. **SM reveals votes**
   - Click "Reveal Votes"
   - All votes shown
   - Statistics calculated (Mean: 6.0, Median: 5, Mode: 5)

7. **Team discusses**
   - See divergent votes (5, 8, 5)
   - Discuss assumptions

8. **SM finalizes estimate**
   - Team agrees on 5 points
   - Enter "5" in final value
   - Click "Finalize & Start New Round"

9. **Repeat for all stories**
   - Continue estimation rounds

10. **SM exports session**
    - Click "Export Session"
    - Download CSV with all estimates

---

### Journey 2: Sprint Retrospective

1. **SM creates Retro room**
   - Create room, type: "Retrospective"
   - Default columns appear

2. **Team adds items**
   - Each member adds cards to columns
   - "Great collaboration" → What Went Well
   - "Testing delayed" → What Didn't Go Well

3. **Team votes on items**
   - Each member has 3 votes
   - Vote on most important items
   - "Testing delayed" gets 5 votes

4. **Team discusses top items**
   - Click on "Testing delayed"
   - Add discussion notes
   - Identify root cause

5. **Convert to action item**
   - Mark "Allocate testing time" as action item
   - Item appears in Action Items section

6. **SM generates AI summary**
   - Click "Generate AI Summary"
   - AI analyzes all items and votes
   - Summary generated highlighting key points

7. **SM exports retro**
   - Click "Export Retro"
   - Download PDF with all items, votes, action items, and AI summary

---

### Journey 3: Sprint Planning with Capacity

1. **SM creates Sprint Planning room**
   - Create room, type: "Sprint Planning"

2. **SM sets capacity**
   - Enter team capacity: 40 SP

3. **SM adds sprint goals**
   - "Complete user authentication"
   - "Implement basic dashboard"

4. **SM adds candidate items**
   - Add items to "Ready" column with estimates
   - "User Login API" - 8 SP
   - "Dashboard UI" - 13 SP
   - "Advanced Reporting" - 21 SP

5. **Team commits items**
   - Drag "User Login API" to "In Scope"
   - Workload: 8/40 SP
   - Drag "Dashboard UI" to "In Scope"
   - Workload: 21/40 SP

6. **Check capacity**
   - Try to drag "Advanced Reporting" (21 SP)
   - Workload would be 42/40 SP
   - System shows warning: "Over capacity by 2 SP"
   - Drag to "Out of Scope"

7. **Export sprint plan**
   - Click "Export Plan"
   - Download PDF with goals, committed items, capacity

---

### Journey 4: Backlog Refinement with AI

1. **PO creates Refinement room**
   - Create room, type: "Refinement"

2. **PO adds story**
   - Add item: "User Registration Flow"

3. **Team discusses and adds notes**
   - "Email verification needed"
   - "Password strength requirements"

4. **PO drafts acceptance criteria**
   - "User can register"
   - "Email sent"
   - "Password secure"

5. **PO requests AI rewrite**
   - Click "AI Rewrite Criteria"
   - AI returns improved criteria:
     - "Given valid email and password, when user submits registration, then account is created and confirmation email sent"
   - PO reviews and accepts AI version

6. **Team requests AI breakdown**
   - Click "Get AI Suggestions"
   - AI suggests technical tasks:
     - "Create registration API endpoint"
     - "Implement email validation"
     - "Set up email service"
   - Team reviews and adds to notes

7. **Team estimates story**
   - Set estimate: 8 SP

8. **Export refinement summary**
   - Download PDF with all refined stories

---

### Journey 5: Meeting Minutes with AI

1. **SM creates MOM room**
   - Create room, type: "Meeting Minutes"
   - Name: "Sprint Planning Meeting"

2. **SM enters raw notes**
   - Types: "Discussed API development. John presented progress. Decided to launch March 15. Sarah will review docs by March 10."

3. **SM triggers AI parsing**
   - Click "Parse with AI"
   - AI extracts:
     - Summary: "Sprint planning discussion..."
     - Decisions: ["Launch on March 15"]
     - Action Items: [{"description": "Review docs", "assignee": "Sarah", "dueDate": "2025-03-10"}]

4. **SM reviews and edits**
   - Edit summary for clarity
   - Add missing decision
   - Update action item assignee

5. **SM adds attendees**
   - Add "John Doe", "Jane Smith", "Mike Johnson"

6. **SM exports MOM**
   - Click "Export MOM"
   - Download DOCX file

---

## Business Rules

### General Rules

1. **Room Creation**
   - Any authenticated user can create rooms
   - Room name is required (max 255 chars)
   - Room type cannot be changed after creation
   - Project association is optional

2. **Room Status**
   - Default status: ACTIVE
   - Only ACTIVE rooms appear in default view
   - COMPLETED rooms are read-only (can still view)
   - ARCHIVED rooms don't appear unless "Show Archived" enabled

3. **Room Data**
   - Data structure must match room type
   - Invalid data structure throws validation error
   - Data updates are incremental (merge with existing)

4. **Room Permissions**
   - All team members can view and edit rooms (MVP)
   - Future: Role-based permissions (only SM can finalize, etc.)

---

### Planning Poker Rules

1. **Voting**
   - User can only vote once per round
   - User can change vote before reveal
   - Votes hidden until "Reveal" clicked
   - All participants should vote (recommended, not enforced)

2. **Statistics**
   - Mean, Median, Mode calculated only on numeric votes
   - Non-numeric votes (T-Shirt sizes) excluded from mean/median
   - Mode works for all vote types

3. **Finalization**
   - Final value can differ from votes
   - Final value can be set before all have voted
   - Once finalized, round moves to history

4. **Custom Deck**
   - User can enter comma-separated values
   - Values can be numeric or text
   - Minimum 2 values required

---

### Retrospective Rules

1. **Voting**
   - If voting enabled, each user has `maxVotesPerPerson` votes
   - User can vote on multiple items
   - User cannot vote on same item twice
   - Voting can be disabled entirely

2. **Columns**
   - Minimum 1 column required
   - Maximum 10 columns recommended
   - Columns can be reordered
   - Deleting column deletes all items in it

3. **Items**
   - User can only delete own items
   - Items can be moved between columns
   - Discussion can be added by anyone
   - Action item flag can be toggled by anyone

4. **AI Summary**
   - Summary generated from all visible items
   - Top-voted items highlighted in summary
   - Summary is separate from room data (not saved automatically)

---

### Sprint Planning Rules

1. **Capacity**
   - Capacity must be positive number
   - Capacity can be 0 (unlimited)
   - Over-capacity shows warning but doesn't block

2. **Items**
   - Items can have estimate of 0 (for tasks/spikes)
   - Negative estimates not allowed
   - Items can be in only one status (ready/in_scope/out_of_scope)

3. **Workload Calculation**
   - `actualWorkload = SUM(in_scope items estimates)`
   - Auto-calculated on every item status change
   - Displayed as "X / Y SP"

4. **Sprint Goals**
   - Minimum 0 goals
   - Maximum 10 goals recommended
   - Goals are text only (not linked to items)

---

### Refinement Rules

1. **Acceptance Criteria**
   - No limit on number of criteria
   - Criteria are plain text (no formatting)
   - AI rewrite preserves count (doesn't add/remove)

2. **AI Suggestions**
   - Suggestions are non-binding (user can ignore)
   - Suggestions don't auto-save to item
   - User must manually accept/edit suggestions

3. **Estimates**
   - Estimate is optional
   - Estimate should be story points (but not enforced)
   - No validation on estimate value

---

### MOM Rules

1. **AI Parsing**
   - Raw input required for AI parsing
   - AI parsing can fail → fallback used
   - User can always manually edit AI output

2. **File Upload**
   - Supported formats: TXT, PDF, DOCX
   - Max file size: 10 MB (configurable)
   - Extraction errors return user-friendly message

3. **Action Items**
   - Action items extracted by AI
   - User can manually add/edit/delete action items
   - Assignee and due date are optional

4. **Export**
   - Export includes all sections (raw, summary, decisions, actions, attendees)
   - TXT export is plain text
   - DOCX export is formatted with headings

---

## Code References

### Backend Files

- **Entity**: `F:\StandupSnap\backend\src\entities\scrum-room.entity.ts`
- **Service**: `F:\StandupSnap\backend\src\scrum-rooms\scrum-rooms.service.ts`
- **Controller**: `F:\StandupSnap\backend\src\scrum-rooms\scrum-rooms.controller.ts`
- **Module**: `F:\StandupSnap\backend\src\scrum-rooms\scrum-rooms.module.ts`
- **DTOs**:
  - `F:\StandupSnap\backend\src\scrum-rooms\dto\create-room.dto.ts`
  - `F:\StandupSnap\backend\src\scrum-rooms\dto\update-room.dto.ts`
  - `F:\StandupSnap\backend\src\scrum-rooms\dto\update-room-data.dto.ts`

### Frontend Files

- **Pages**:
  - `F:\StandupSnap\frontend\src\pages\ScrumRoomsPage.tsx` (List)
  - `F:\StandupSnap\frontend\src\pages\ScrumRoomDetailPage.tsx` (Detail router)
- **Components**:
  - `F:\StandupSnap\frontend\src\components\scrum-rooms\CreateRoomModal.tsx`
  - `F:\StandupSnap\frontend\src\components\scrum-rooms\PlanningPokerRoom.tsx`
  - `F:\StandupSnap\frontend\src\components\scrum-rooms\RetrospectiveRoom.tsx`
  - `F:\StandupSnap\frontend\src\components\scrum-rooms\SprintPlanningRoom.tsx`
  - `F:\StandupSnap\frontend\src\components\scrum-rooms\RefinementRoom.tsx`
  - `F:\StandupSnap\frontend\src\components\scrum-rooms\MOMRoom.tsx`
- **Types**: `F:\StandupSnap\frontend\src\types\scrumRooms.ts`
- **API Service**: `F:\StandupSnap\frontend\src\services\api\scrumRooms.ts`

---

## Error Handling

### Common Errors

1. **Room Not Found**
   - Status: 404
   - Message: "Room not found"
   - Cause: Invalid roomId or room deleted

2. **Project Not Found**
   - Status: 404
   - Message: "Project not found"
   - Cause: Invalid projectId when creating room

3. **AI Service Not Configured**
   - Status: 400
   - Message: "AI service not configured"
   - Cause: GROQ_API_KEY not set in environment

4. **AI Generation Failed**
   - Status: 200 (doesn't throw error)
   - Fallback: Returns basic/fallback parsing
   - Logged: AI error logged to console

5. **Cannot Restore Non-Archived Room**
   - Status: 400
   - Message: "Room is not archived"
   - Cause: Trying to restore active room

6. **Invalid Room Type**
   - Status: 400
   - Message: "Invalid room type"
   - Cause: Type not in RoomType enum

7. **Unauthorized**
   - Status: 401
   - Message: "Unauthorized"
   - Cause: Missing or invalid JWT token

---

## Performance Considerations

1. **JSONB Indexing**
   - PostgreSQL JSONB indexed for fast queries
   - Consider GIN index on `data` column for large deployments

2. **AI API Timeouts**
   - Groq API timeout: 30 seconds
   - Frontend shows loading state
   - Fallback if timeout exceeded

3. **Room Data Size**
   - No hard limit on room data size
   - Recommend pagination for large round histories
   - Consider archiving old rooms

4. **Real-Time Updates** (Future)
   - Current: Manual refresh or polling
   - Future: WebSocket for real-time collaboration
   - Consider using Socket.IO or similar

---

## Summary

Scrum Rooms is a **comprehensive collaborative module** with 5 distinct room types, each serving a specific Agile ceremony. The module leverages:

- **JSONB storage** for flexible, type-specific data structures
- **AI integration** (Groq API) for intelligent parsing and suggestions
- **Drag-and-drop interfaces** for intuitive user experience
- **Export capabilities** for documentation and sharing
- **Optional project association** for organization

**Key Features**:
- Planning Poker: Team estimation with voting, statistics, and multiple deck types
- Retrospective: Column-based retro with voting, discussion, and AI summaries
- Sprint Planning: Capacity-aware planning with visual workload tracking
- Refinement: AI-assisted story refinement with acceptance criteria rewriting
- MOM: AI-powered meeting minutes extraction and structuring

This module provides **end-to-end support** for all major Scrum ceremonies in a single, unified interface.
