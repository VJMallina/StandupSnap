# Standup Book - How It Works

## Overview
- **Purpose**: Historical standup tracking and MOM (Minutes of Meeting) management
- **Key Features**: Calendar view, day details, multi-slot support, MOM creation with AI, DOCX export
- **Integration**: Snaps, Sprints, Daily Locks, Cards, Team Members
- **Use Case**: View past standups, generate meeting minutes, export to Word documents

## Database Schema

### DailyLock Entity
**Table**: `daily_locks`
**File**: `F:\StandupSnap\backend\src\entities\daily-lock.entity.ts`

#### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto-generated |
| `sprint` | Relation | Parent sprint | ManyToOne, CASCADE delete |
| `date` | Date | Lock date (YYYY-MM-DD) | Required |
| `slotNumber` | Integer | Slot number (null = entire day) | Nullable |
| `isLocked` | Boolean | Lock status | Default: true |
| `dailySummaryDone` | Text | Aggregated done items | Nullable |
| `dailySummaryToDo` | Text | Aggregated todo items | Nullable |
| `dailySummaryBlockers` | Text | Aggregated blockers | Nullable |
| `lockedBy` | Relation | User who locked | ManyToOne, nullable |
| `lockedAt` | Timestamp | Lock timestamp | Auto-generated |

**Unique Constraint**: `[sprint, date, slotNumber]`

#### Lock Types
- **Day-level lock**: `slotNumber = null` - Locks entire day
- **Slot-level lock**: `slotNumber = 1/2/3` - Locks specific slot

---

### Mom Entity
**Table**: `moms`
**File**: `F:\StandupSnap\backend\src\entities\mom.entity.ts`

#### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto-generated |
| `sprint` | Relation | Parent sprint | ManyToOne, CASCADE delete |
| `date` | Date | MOM date | Required |
| `rawInput` | Text | Original input text | Nullable |
| `agenda` | Text | Meeting agenda | Nullable |
| `keyDiscussionPoints` | Text | Discussion summary | Nullable |
| `decisionsTaken` | Text | Decisions made | Nullable |
| `actionItems` | Text | Action items assigned | Nullable |
| `createdBy` | Relation | User who created | ManyToOne, SET NULL |
| `updatedBy` | Relation | Last user who edited | ManyToOne, SET NULL |
| `createdAt` | Timestamp | Creation timestamp | Auto-generated |
| `updatedAt` | Timestamp | Update timestamp | Auto-updated |

**Business Rule**: One MOM per sprint day (not enforced by DB, enforced by service)

---

## Screens & Pages

### Screen 1: Standup Book - Calendar View
**Route**: `/standup-book?sprintId={sprintId}`
**Access**: Requires `VIEW_SPRINT` permission
**Component**: `F:\StandupSnap\frontend\src\pages\StandupBook.tsx` (inferred)

#### UI Components
- **Sprint Selector**: Dropdown to select active/past sprint
- **Month Navigation**: Previous/Next month arrows
- **Calendar Grid**: 7-column grid (Sun-Sat)
- **Day Cells**: Each cell shows:
  - Day number
  - Snap count badge (e.g., "5 snaps")
  - Lock indicator icon (if locked)
  - Visual state (not started, in progress, completed)
  - Today indicator (highlighted border)
- **Sprint Date Range Overlay**: Visual highlighting of sprint days
- **Legend**: Color coding explanation
- **Filter Panel**: Filter by team member (optional)
- **Export Button**: Export visible days to DOCX

#### User Actions

##### Action 1: Load Calendar View for Active Sprint

**What happens**: Display calendar with sprint days highlighted

**Frontend**:
1. On page mount, get active sprint for current project
2. If no `sprintId` in URL params, auto-select active sprint
3. Call API to get sprint details and all sprint days
4. Render calendar grid centered on sprint month

**API Call 1** (Get Active Sprint):
```http
GET /api/standup-book/active-sprint/{projectId}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\standup-book\standup-book.controller.ts` - `@Get('active-sprint/:projectId')`
- **Service**: `F:\StandupSnap\backend\src\standup-book\standup-book.service.ts` - `getActiveSprint()`

**Service Logic**:
```typescript
async getActiveSprint(projectId: string): Promise<Sprint | null> {
  return this.sprintRepository.findOne({
    where: {
      project: { id: projectId },
      status: SprintStatus.ACTIVE,
    },
    relations: ['project'],
  });
}
```

**Database Query**:
```sql
SELECT s.* FROM sprints s
INNER JOIN projects p ON s.project_id = p.id
WHERE p.id = ? AND s.status = 'active'
LIMIT 1
```

**Response**:
```json
{
  "id": "sprint-uuid",
  "name": "Sprint 5",
  "startDate": "2025-12-16",
  "endDate": "2025-12-29",
  "status": "active",
  "dailyStandupCount": 2,
  "slotTimes": {
    "1": "09:30 AM",
    "2": "05:00 PM"
  }
}
```

**API Call 2** (Get All Sprint Days):
```http
GET /api/standup-book/sprint-days/{sprintId}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `standup-book.controller.ts` - `@Get('sprint-days/:sprintId')`
- **Service**: `standup-book.service.ts` - `getSprintDays()`

**Service Logic**:
```typescript
async getSprintDays(sprintId: string): Promise<{ date: string; dayNumber: number; isAccessible: boolean }[]> {
  const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });

  const sprintStart = new Date(sprint.startDate);
  const sprintEnd = new Date(sprint.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: { date: string; dayNumber: number; isAccessible: boolean }[] = [];
  let currentDate = new Date(sprintStart);
  let dayNumber = 1;

  while (currentDate <= sprintEnd) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const normalizedCurrentDate = new Date(currentDate);
    normalizedCurrentDate.setHours(0, 0, 0, 0);
    const isAccessible = normalizedCurrentDate <= today;

    days.push({ date: dateStr, dayNumber, isAccessible });

    currentDate.setDate(currentDate.getDate() + 1);
    dayNumber++;
  }

  return days;
}
```

**Response**:
```json
[
  { "date": "2025-12-16", "dayNumber": 1, "isAccessible": true },
  { "date": "2025-12-17", "dayNumber": 2, "isAccessible": true },
  ...
  { "date": "2025-12-29", "dayNumber": 14, "isAccessible": true },
  { "date": "2025-12-30", "dayNumber": 15, "isAccessible": false }
]
```

**API Call 3** (Get Day Metadata for each visible day):
```http
GET /api/standup-book/day-metadata/{sprintId}?date=2025-12-16
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `standup-book.controller.ts` - `@Get('day-metadata/:sprintId')`
- **Service**: `standup-book.service.ts` - `getDayMetadata()`

**Service Logic**:
```typescript
async getDayMetadata(sprintId: string, date: string): Promise<DayMetadata> {
  const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });
  const targetDate = new Date(date);
  const sprintStart = new Date(sprint.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  // Calculate day number
  const dayNumber = Math.floor((targetDate.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Check if day is locked
  const dayLock = await this.dailyLockRepository.findOne({
    where: { sprint: { id: sprintId }, date: targetDate },
  });

  // Get snaps for this day
  const snaps = await this.snapRepository.find({
    where: { card: { sprint: { id: sprintId } }, snapDate: targetDate },
    relations: ['card'],
  });

  // Get unique cards
  const uniqueCardIds = [...new Set(snaps.map(snap => snap.card.id))];

  // Determine day status
  let dayStatus: 'not_started' | 'in_progress' | 'completed';
  if (dayLock?.isLocked) {
    dayStatus = 'completed';
  } else if (targetDate.getTime() === today.getTime()) {
    dayStatus = 'in_progress';
  } else {
    dayStatus = 'not_started';
  }

  return {
    dayNumber,
    date: targetDate.toISOString().split('T')[0],
    dayStatus,
    isLocked: dayLock?.isLocked || false,
    totalSnaps: snaps.length,
    totalCards: uniqueCardIds.length,
    standupSlotCount: sprint.dailyStandupCount || 1,
  };
}
```

**Database Queries**:
```sql
-- Get sprint
SELECT * FROM sprints WHERE id = ?

-- Get day lock
SELECT * FROM daily_locks WHERE sprint_id = ? AND date = ?

-- Get snaps for day
SELECT s.*, c.* FROM snaps s
INNER JOIN cards c ON s.card_id = c.id
WHERE c.sprint_id = ? AND s.snap_date = ?
```

**Response**:
```json
{
  "dayNumber": 3,
  "date": "2025-12-18",
  "dayStatus": "completed",
  "isLocked": true,
  "totalSnaps": 8,
  "totalCards": 6,
  "standupSlotCount": 2
}
```

**UI Update**:
1. Render calendar grid with days from sprint
2. Mark future days (isAccessible = false) as grayed out
3. Show snap count badge on each day
4. Add lock icon if `isLocked = true`
5. Color-code day cells:
   - **Gray**: Not started (future)
   - **Blue**: In progress (today)
   - **Green**: Completed (locked)
6. Highlight sprint date range with border

**Validations**:
- Must have an active sprint to view calendar
- Days beyond today are not accessible (read-only)

**Error Handling**:
- **No active sprint**: Show empty state with "No active sprint" message
- **Sprint not found**: Show error banner
- **Network error**: Retry mechanism with loading spinner

---

##### Action 2: Click on a Day to View Details

**What happens**: Navigate to day details page showing all snaps

**Frontend**:
1. User clicks on a calendar day cell
2. If day is not accessible (future), show tooltip "This day hasn't occurred yet"
3. If accessible, navigate to `/standup-book/day?sprintId={id}&date={date}`

**API Call** (Get Snaps for Day):
```http
GET /api/standup-book/snaps/{sprintId}?date=2025-12-18
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `standup-book.controller.ts` - `@Get('snaps/:sprintId')`
- **Service**: `standup-book.service.ts` - `getSnapsForDay()`

**Service Logic**:
```typescript
async getSnapsForDay(sprintId: string, date: string): Promise<Snap[]> {
  const targetDate = new Date(date);

  return this.snapRepository.find({
    where: {
      card: { sprint: { id: sprintId } },
      snapDate: targetDate,
    },
    relations: ['card', 'card.assignee'],
    order: { createdAt: 'DESC' },
  });
}
```

**Database Query**:
```sql
SELECT s.*, c.*, a.* FROM snaps s
INNER JOIN cards c ON s.card_id = c.id
LEFT JOIN team_members a ON c.assignee_id = a.id
WHERE c.sprint_id = ? AND s.snap_date = ?
ORDER BY s.created_at DESC
```

**Response**:
```json
[
  {
    "id": "snap-1",
    "rawInput": "Completed login API. Working on token refresh. Blocked by SSL cert.",
    "done": "Completed login API endpoint with validation",
    "toDo": "Implement token refresh mechanism",
    "blockers": "Waiting for SSL certificate from DevOps",
    "suggestedRAG": "amber",
    "finalRAG": "amber",
    "snapDate": "2025-12-18",
    "slotNumber": 1,
    "isLocked": true,
    "card": {
      "id": "card-1",
      "title": "User Authentication API",
      "assignee": {
        "id": "tm-1",
        "fullName": "John Doe",
        "designationRole": "Backend Developer"
      }
    }
  },
  ...
]
```

**UI Update**:
1. Display day details page with header:
   - Sprint name
   - Date (formatted: "Wednesday, December 18, 2025")
   - Day number (e.g., "Day 3 of 14")
   - Lock status badge
2. Group snaps by team member (assignee)
3. For each assignee section:
   - Show assignee name and role
   - Show card title
   - Display Done/ToDo/Blockers in formatted boxes
   - Show RAG status indicator
4. If multi-slot sprint, show slot number for each snap
5. If day is locked, show "Day Locked" banner (read-only)

**Grouping Logic** (Frontend):
```typescript
const groupedByAssignee = snaps.reduce((acc, snap) => {
  const assigneeId = snap.card.assignee.id;
  if (!acc[assigneeId]) {
    acc[assigneeId] = {
      assignee: snap.card.assignee,
      snaps: []
    };
  }
  acc[assigneeId].snaps.push(snap);
  return acc;
}, {});
```

**Validations**:
- Day must be within sprint range
- Day must be accessible (not future)

**Business Rules**:
- Snaps are read-only in Standup Book (historical view)
- Locked days cannot be edited
- Can only view days that have occurred

---

##### Action 3: View Multi-Slot Standup Day

**What happens**: Display snaps grouped by slot

**Frontend**:
1. On day details page, if `standupSlotCount > 1`, show slot tabs
2. Each tab represents a slot (Slot 1, Slot 2, etc.)
3. User can switch between slots to view snaps

**API Call** (Get Snaps Grouped by Slots):
```http
GET /api/standup-book/snaps-by-slots/{sprintId}?date=2025-12-18
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `standup-book.controller.ts` - `@Get('snaps-by-slots/:sprintId')`
- **Service**: `standup-book.service.ts` - `getSnapsGroupedBySlots()`

**Service Logic**:
```typescript
async getSnapsGroupedBySlots(sprintId: string, date: string): Promise<SlotGroup[]> {
  const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });
  const snaps = await this.getSnapsForDay(sprintId, date);
  const totalSlots = sprint.dailyStandupCount || 1;

  // Group snaps by slotNumber
  const slotMap = new Map<number, Snap[]>();

  // Initialize all slots
  for (let i = 1; i <= totalSlots; i++) {
    slotMap.set(i, []);
  }

  // Group snaps
  snaps.forEach(snap => {
    const slotNum = snap.slotNumber || 1;
    if (slotMap.has(slotNum)) {
      slotMap.get(slotNum)!.push(snap);
    }
  });

  // Convert to SlotGroup array
  const allSlots: SlotGroup[] = [];
  for (let i = 1; i <= totalSlots; i++) {
    const slotSnaps = slotMap.get(i) || [];
    allSlots.push({
      slotNumber: i,
      snaps: slotSnaps,
      cardIds: [...new Set(slotSnaps.map(s => s.card.id))],
    });
  }

  return allSlots;
}
```

**Response**:
```json
[
  {
    "slotNumber": 1,
    "snaps": [
      { "id": "snap-1", ... },
      { "id": "snap-2", ... }
    ],
    "cardIds": ["card-1", "card-2"]
  },
  {
    "slotNumber": 2,
    "snaps": [
      { "id": "snap-3", ... }
    ],
    "cardIds": ["card-3"]
  }
]
```

**UI Update**:
1. Render tabs for each slot
2. Display slot time if configured (e.g., "Slot 1 - 09:30 AM")
3. Show snap count per slot
4. Active tab shows snaps for that slot
5. Empty slots show "No snaps recorded for this slot"

**Business Rules**:
- All configured slots are shown even if empty
- Slot times are displayed from `sprint.slotTimes` JSONB field
- Default to Slot 1 if `slotNumber` is null

---

### Screen 2: Create MOM (Minutes of Meeting)
**Route**: `/standup-book/day/{date}/mom/create`
**Access**: Requires `EDIT_SPRINT` permission
**Component**: `F:\StandupSnap\frontend\src\pages\CreateMOM.tsx` (inferred)

#### UI Components
- **Day Header**: Sprint name, date, day number
- **AI Parsing Mode Toggle**: Switch between manual and AI-assisted
- **Raw Input Textarea**: Free-form text input (if AI mode)
- **AI Parse Button**: "Parse with AI" button
- **Structured Form Fields** (manual or AI-suggested):
  - Agenda (multiline)
  - Key Discussion Points (multiline)
  - Decisions Taken (multiline)
  - Action Items (multiline)
- **Save Button**: "Create MOM"
- **Cancel Button**: Return to day view
- **Loading Spinner**: During AI parsing

#### User Actions

##### Action 1: Create MOM Manually

**What happens**: User fills in structured fields directly

**Frontend**:
1. User types into Agenda, Key Discussion Points, Decisions, Action Items fields
2. Validates that at least one field is filled
3. On "Save", calls create MOM API

**API Call**:
```http
POST /api/standup-book/mom
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "sprintId": "sprint-uuid",
  "date": "2025-12-18",
  "rawInput": "",
  "agenda": "Sprint retrospective and planning",
  "keyDiscussionPoints": "Discussed velocity improvements. Team raised concerns about testing coverage.",
  "decisionsTaken": "Decided to allocate 20% sprint capacity to tech debt. Agreed to implement automated tests for all new features.",
  "actionItems": "John: Set up CI/CD pipeline\nSarah: Create test coverage report\nTeam: Review test strategy by Friday"
}
```

**Backend**:
- **Controller**: `standup-book.controller.ts` - `@Post('mom')`
- **Service**: `F:\StandupSnap\backend\src\standup-book\mom.service.ts` - `create()`

**Service Logic**:
```typescript
async create(createMomDto: CreateMomDto, userId: string): Promise<Mom> {
  const { sprintId, date, rawInput, agenda, keyDiscussionPoints, decisionsTaken, actionItems } = createMomDto;

  // Find sprint
  const sprint = await this.sprintRepository.findOne({
    where: { id: sprintId },
    relations: ['project'],
  });

  if (!sprint) {
    throw new NotFoundException(`Sprint with ID ${sprintId} not found`);
  }

  // Validate date is within sprint range
  const targetDate = new Date(date);
  const sprintStart = new Date(sprint.startDate);
  const sprintEnd = new Date(sprint.endDate);

  if (targetDate < sprintStart || targetDate > sprintEnd) {
    throw new BadRequestException('MOM date must be within sprint date range');
  }

  // Check if day is locked (day-level lock check)
  const dayLock = await this.dailyLockRepository.findOne({
    where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
  });

  if (dayLock && dayLock.isLocked) {
    throw new ForbiddenException('Cannot create MOM for a locked day');
  }

  // Check if MOM already exists
  const existingMom = await this.momRepository.findOne({
    where: { sprint: { id: sprintId }, date: targetDate },
  });

  if (existingMom) {
    throw new BadRequestException('MOM already exists for this day. Use update instead.');
  }

  // Create MOM
  const mom = this.momRepository.create({
    sprint,
    date: targetDate,
    rawInput,
    agenda,
    keyDiscussionPoints,
    decisionsTaken,
    actionItems,
    createdBy: { id: userId } as User,
    updatedBy: { id: userId } as User,
  });

  return this.momRepository.save(mom);
}
```

**Database Queries**:
```sql
-- Validate sprint exists
SELECT * FROM sprints WHERE id = ?

-- Check day lock
SELECT * FROM daily_locks
WHERE sprint_id = ? AND date = ? AND slot_number IS NULL

-- Check existing MOM
SELECT * FROM moms WHERE sprint_id = ? AND date = ?

-- Insert MOM
INSERT INTO moms (id, sprint_id, date, raw_input, agenda, key_discussion_points, decisions_taken, action_items, created_by, updated_by)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**Response**:
```json
{
  "id": "mom-uuid",
  "sprintId": "sprint-uuid",
  "date": "2025-12-18",
  "agenda": "Sprint retrospective and planning",
  "keyDiscussionPoints": "Discussed velocity improvements...",
  "decisionsTaken": "Decided to allocate 20% sprint capacity...",
  "actionItems": "John: Set up CI/CD pipeline...",
  "createdAt": "2025-12-18T10:30:00Z",
  "updatedAt": "2025-12-18T10:30:00Z"
}
```

**UI Update**:
1. Show success toast "MOM created successfully"
2. Redirect back to day details page
3. Display MOM badge on calendar day

**Validations**:
- At least one field (agenda, discussion, decisions, or actions) must be filled
- Date must be within sprint range
- Day must not be locked
- MOM must not already exist for this day

**Error Handling**:
- **Day locked**: "Cannot create MOM for a locked day"
- **MOM exists**: "MOM already exists. Please edit the existing MOM."
- **Invalid date**: "MOM date must be within sprint range"

---

##### Action 2: Create MOM with AI Parsing

**What happens**: AI parses raw text into structured fields

**Frontend**:
1. User toggles "Use AI Parsing" switch
2. User types free-form meeting notes in Raw Input textarea
3. User clicks "Parse with AI" button
4. Loading spinner shows during parsing
5. AI-suggested fields populate the structured form
6. User can edit suggestions before saving

**API Call 1** (Generate with AI):
```http
POST /api/standup-book/mom/generate
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "rawInput": "We discussed sprint retrospective today. Team velocity was good but testing coverage needs improvement. We decided to allocate 20% of sprint capacity to tech debt going forward. Also agreed to implement automated tests for all new features. John will set up CI/CD pipeline. Sarah will create test coverage report. Everyone needs to review the test strategy by Friday."
}
```

**Backend**:
- **Controller**: `standup-book.controller.ts` - `@Post('mom/generate')`
- **Service**: `mom.service.ts` - `generateMomWithAI()`

**Service Logic** (AI Parsing with Groq):
```typescript
async generateMomWithAI(generateMomDto: GenerateMomDto): Promise<{
  agenda: string;
  keyDiscussionPoints: string;
  decisionsTaken: string;
  actionItems: string;
}> {
  const { rawInput } = generateMomDto;

  const prompt = `You are a meeting minutes assistant. Analyze and categorize meeting notes.

MEETING NOTES:
${rawInput}

INSTRUCTIONS:
1. ANALYZE the text and identify:
   - What topics were discussed? → agenda
   - What insights, opinions, concerns were shared? → keyDiscussionPoints
   - What was decided or concluded? → decisionsTaken
   - What tasks were assigned? → actionItems

2. CATEGORIZE:
   "agenda" = Meeting topics and subjects discussed
   "keyDiscussionPoints" = Discussion, insights, concerns, opinions
   "decisionsTaken" = Specific decisions and agreements finalized
   "actionItems" = Tasks assigned with owners (format: "Person: Task")

3. Return ONLY valid JSON:
{"agenda":"...","keyDiscussionPoints":"...","decisionsTaken":"...","actionItems":"Person A: Task 1\\nPerson B: Task 2"}`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: this.groqModel, // llama-3.3-70b-versatile
        messages: [
          {
            role: 'system',
            content: 'You are a meeting minutes assistant. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*?\}/);

    if (!jsonMatch) {
      return this.fallbackParse(rawInput);
    }

    let jsonString = jsonMatch[0];
    let parsed;

    try {
      parsed = JSON.parse(jsonString);
    } catch (firstError) {
      // Fix common issues with control characters
      jsonString = jsonString
        .replace(/\r\n/g, '\\n')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, ' ');

      parsed = JSON.parse(jsonString);
    }

    return {
      agenda: parsed.agenda || 'No agenda specified',
      keyDiscussionPoints: parsed.keyDiscussionPoints || rawInput,
      decisionsTaken: parsed.decisionsTaken || 'No decisions recorded',
      actionItems: parsed.actionItems || 'No action items',
    };
  } catch (error) {
    console.error('[MomService] AI parsing failed:', error.message);
    return this.fallbackParse(rawInput);
  }
}

private fallbackParse(rawInput: string): {
  agenda: string;
  keyDiscussionPoints: string;
  decisionsTaken: string;
  actionItems: string;
} {
  return {
    agenda: 'Meeting discussion',
    keyDiscussionPoints: rawInput,
    decisionsTaken: 'To be reviewed',
    actionItems: 'To be determined',
  };
}
```

**Groq API Integration**:
- **Endpoint**: `https://api.groq.com/openai/v1/chat/completions`
- **Model**: `llama-3.3-70b-versatile` (configured via env)
- **API Key**: Stored in `GROQ_API_KEY` environment variable
- **Temperature**: 0.2 (low for consistency)
- **Max Tokens**: 1500

**Response**:
```json
{
  "agenda": "Sprint retrospective and planning, velocity review, testing coverage discussion",
  "keyDiscussionPoints": "Team reviewed sprint velocity performance. Concerns raised about insufficient testing coverage. Discussed need for better automation and quality assurance practices.",
  "decisionsTaken": "Decided to allocate 20% of sprint capacity to tech debt. Agreed to implement automated tests for all new features moving forward.",
  "actionItems": "John: Set up CI/CD pipeline\nSarah: Create test coverage report\nTeam: Review test strategy by Friday"
}
```

**Frontend Flow After AI Response**:
1. Populate the 4 structured fields with AI-suggested values
2. User can edit any field before saving
3. Click "Create MOM" to save (calls same POST /api/standup-book/mom endpoint)

**UI Update**:
1. Show parsing success message
2. Highlight AI-suggested text (optional: different color)
3. Allow user to review and modify
4. Display "AI Assisted" badge when saving

**Validations**:
- Raw input must not be empty
- AI timeout: 30 seconds max
- Fallback to manual if AI fails

**Error Handling**:
- **AI API failure**: Use fallback parsing (puts raw text in keyDiscussionPoints)
- **Timeout**: Show error "AI parsing timed out. Please try again or enter manually."
- **Invalid JSON from AI**: Retry parsing with cleanup, then fallback

---

##### Action 3: Edit Existing MOM

**What happens**: Update MOM fields

**Frontend**:
1. On day details page, if MOM exists, show "Edit MOM" button
2. Navigate to edit page with pre-filled form
3. User modifies any field
4. Click "Save Changes"

**API Call**:
```http
PUT /api/standup-book/mom/{momId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "agenda": "Updated agenda",
  "keyDiscussionPoints": "Updated discussion points",
  "decisionsTaken": "Updated decisions",
  "actionItems": "Updated action items"
}
```

**Backend**:
- **Controller**: `standup-book.controller.ts` - `@Put('mom/:id')`
- **Service**: `mom.service.ts` - `update()`

**Service Logic**:
```typescript
async update(momId: string, updateMomDto: UpdateMomDto, userId: string): Promise<Mom> {
  const mom = await this.momRepository.findOne({
    where: { id: momId },
    relations: ['sprint'],
  });

  if (!mom) {
    throw new NotFoundException(`MOM with ID ${momId} not found`);
  }

  // Check if day is locked
  const dayLock = await this.dailyLockRepository.findOne({
    where: { sprint: { id: mom.sprint.id }, date: mom.date, slotNumber: IsNull() },
  });

  if (dayLock && dayLock.isLocked) {
    throw new ForbiddenException('Cannot edit MOM for a locked day');
  }

  // Update fields
  if (updateMomDto.rawInput !== undefined) mom.rawInput = updateMomDto.rawInput;
  if (updateMomDto.agenda !== undefined) mom.agenda = updateMomDto.agenda;
  if (updateMomDto.keyDiscussionPoints !== undefined) mom.keyDiscussionPoints = updateMomDto.keyDiscussionPoints;
  if (updateMomDto.decisionsTaken !== undefined) mom.decisionsTaken = updateMomDto.decisionsTaken;
  if (updateMomDto.actionItems !== undefined) mom.actionItems = updateMomDto.actionItems;

  mom.updatedBy = { id: userId } as User;

  return this.momRepository.save(mom);
}
```

**Database Query**:
```sql
-- Get MOM
SELECT m.*, s.* FROM moms m
INNER JOIN sprints s ON m.sprint_id = s.id
WHERE m.id = ?

-- Check lock
SELECT * FROM daily_locks
WHERE sprint_id = ? AND date = ? AND slot_number IS NULL

-- Update MOM
UPDATE moms
SET agenda = ?, key_discussion_points = ?, decisions_taken = ?, action_items = ?, updated_by = ?, updated_at = NOW()
WHERE id = ?
```

**Response**:
```json
{
  "id": "mom-uuid",
  "agenda": "Updated agenda",
  "updatedAt": "2025-12-18T15:45:00Z"
}
```

**UI Update**:
1. Show success toast "MOM updated successfully"
2. Redirect to day details
3. Display updated MOM content

**Validations**:
- MOM must exist
- Day must not be locked
- User must have `EDIT_SPRINT` permission

**Error Handling**:
- **MOM not found**: "MOM not found"
- **Day locked**: "Cannot edit MOM for a locked day"

---

### Screen 3: Lock Day

**Route**: Action on day details page
**Access**: Requires `EDIT_SPRINT` permission

#### User Actions

##### Action 1: Lock Entire Day

**What happens**: Locks all snaps for the day and generates summary

**Frontend**:
1. On day details page, click "Lock Day" button
2. Confirmation modal: "Lock this day? All snaps will become read-only."
3. User confirms

**API Call**:
```http
POST /api/standup-book/lock-day
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "sprintId": "sprint-uuid",
  "date": "2025-12-18"
}
```

**Backend**:
- **Controller**: `standup-book.controller.ts` - `@Post('lock-day')`
- **Service**: `F:\StandupSnap\backend\src\standup-book\daily-lock.service.ts` - `lockDay()`

**Service Logic**:
```typescript
async lockDay(lockDayDto: LockDayDto, userId: string): Promise<DailyLock> {
  const { sprintId, date } = lockDayDto;

  // Find sprint
  const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });

  // Validate date is within sprint range
  const targetDate = new Date(date);
  const sprintStart = new Date(sprint.startDate);
  const sprintEnd = new Date(sprint.endDate);

  if (targetDate < sprintStart || targetDate > sprintEnd) {
    throw new BadRequestException('Date must be within sprint date range');
  }

  // Check if already locked
  const existingLock = await this.dailyLockRepository.findOne({
    where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
  });

  if (existingLock) {
    throw new BadRequestException('This day is already locked');
  }

  // Get all snaps for this day
  const snaps = await this.snapRepository.find({
    where: { card: { sprint: { id: sprintId } }, snapDate: targetDate },
    relations: ['card'],
  });

  // Generate daily summary
  const summary = await this.generateDailySummary(sprintId, targetDate);

  // Create day-level lock (slotNumber = null)
  const dailyLock = this.dailyLockRepository.create({
    sprint,
    date: targetDate,
    slotNumber: null, // null = entire day locked
    isLocked: true,
    dailySummaryDone: summary.done,
    dailySummaryToDo: summary.toDo,
    dailySummaryBlockers: summary.blockers,
  });

  // Mark all snaps as locked
  for (const snap of snaps) {
    snap.isLocked = true;
  }
  await this.snapRepository.save(snaps);

  return this.dailyLockRepository.save(dailyLock);
}

private async generateDailySummary(sprintId: string, date: Date): Promise<{
  done: string;
  toDo: string;
  blockers: string;
}> {
  const snaps = await this.snapRepository.find({
    where: { card: { sprint: { id: sprintId } }, snapDate: date },
    relations: ['card'],
  });

  if (snaps.length === 0) {
    return {
      done: 'No updates recorded',
      toDo: 'No updates recorded',
      blockers: 'None',
    };
  }

  const doneList: string[] = [];
  const toDoList: string[] = [];
  const blockersList: string[] = [];

  snaps.forEach(snap => {
    if (snap.done) doneList.push(`- ${snap.done}`);
    if (snap.toDo) toDoList.push(`- ${snap.toDo}`);
    if (snap.blockers) blockersList.push(`- ${snap.blockers}`);
  });

  return {
    done: doneList.length > 0 ? doneList.join('\n') : 'No updates',
    toDo: toDoList.length > 0 ? toDoList.join('\n') : 'No updates',
    blockers: blockersList.length > 0 ? blockersList.join('\n') : 'None',
  };
}
```

**Database Queries**:
```sql
-- Get sprint
SELECT * FROM sprints WHERE id = ?

-- Check existing lock
SELECT * FROM daily_locks
WHERE sprint_id = ? AND date = ? AND slot_number IS NULL

-- Get all snaps
SELECT s.*, c.* FROM snaps s
INNER JOIN cards c ON s.card_id = c.id
WHERE c.sprint_id = ? AND s.snap_date = ?

-- Create lock
INSERT INTO daily_locks (id, sprint_id, date, slot_number, is_locked, daily_summary_done, daily_summary_to_do, daily_summary_blockers)
VALUES (?, ?, ?, NULL, true, ?, ?, ?)

-- Update snaps to locked
UPDATE snaps SET is_locked = true WHERE id IN (?, ?, ...)
```

**Response**:
```json
{
  "id": "lock-uuid",
  "sprintId": "sprint-uuid",
  "date": "2025-12-18",
  "slotNumber": null,
  "isLocked": true,
  "dailySummaryDone": "- Completed login API\n- Finished database schema",
  "dailySummaryToDo": "- Implement token refresh\n- Create unit tests",
  "dailySummaryBlockers": "- Waiting for SSL certificate",
  "lockedAt": "2025-12-18T16:00:00Z"
}
```

**UI Update**:
1. Show success toast "Day locked successfully"
2. Update calendar day to show lock icon
3. Disable all snap edit/delete buttons on day details
4. Display daily summary in a card/panel

**Validations**:
- Day must be within sprint range
- Day must not already be locked
- User must have `EDIT_SPRINT` permission

**Business Rules**:
- Locking a day locks ALL snaps for that day
- Locked snaps cannot be edited or deleted
- Daily summary is auto-generated from all snaps
- Once locked, only admin can unlock (not exposed in UI)

**Error Handling**:
- **Already locked**: "This day is already locked"
- **Invalid date**: "Date must be within sprint range"
- **No snaps**: Still creates lock with "No updates recorded"

---

### Screen 4: Export to DOCX

**Route**: Action on calendar view or day details
**Access**: Requires `VIEW_SPRINT` permission

#### User Actions

##### Action 1: Download MOM as TXT

**What happens**: Download MOM in plain text format

**Frontend**:
1. On day details, if MOM exists, show "Download MOM" button
2. Dropdown: TXT or DOCX
3. User selects TXT

**API Call**:
```http
GET /api/standup-book/mom/{momId}/download?format=txt
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `standup-book.controller.ts` - `@Get('mom/:id/download')`

**Service Logic**:
```typescript
@Get('mom/:id/download')
async downloadMom(
  @Param('id') id: string,
  @Query('format') format: string,
  @Res() res: Response,
) {
  const mom = await this.momService.findById(id);

  if (!mom) {
    return res.status(HttpStatus.NOT_FOUND).json({ message: 'MOM not found' });
  }

  const formattedDate = new Date(mom.date).toISOString().split('T')[0];

  const content = `
Sprint MOM
Date: ${formattedDate}

Agenda:
${mom.agenda || 'N/A'}

Key Discussion Points:
${mom.keyDiscussionPoints || 'N/A'}

Decisions Taken:
${mom.decisionsTaken || 'N/A'}

Action Items:
${mom.actionItems || 'N/A'}
  `.trim();

  const fileName = `MOM_${formattedDate}.txt`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(content);
}
```

**Response**: Plain text file download
```
Sprint MOM
Date: 2025-12-18

Agenda:
Sprint retrospective and planning

Key Discussion Points:
Discussed velocity improvements. Team raised concerns about testing coverage.

Decisions Taken:
Decided to allocate 20% sprint capacity to tech debt.

Action Items:
John: Set up CI/CD pipeline
Sarah: Create test coverage report
```

**File Naming Convention**: `MOM_YYYY-MM-DD.txt`

**UI Update**:
1. Browser downloads file
2. Show success toast "MOM downloaded"

---

##### Action 2: Export Sprint Standup Book to DOCX

**What happens**: Generate Word document with all sprint standups

**Frontend**:
1. On calendar view, click "Export to DOCX" button
2. Modal appears:
   - Date range selector (default: entire sprint)
   - Team member filter (optional, multi-select)
   - Include MOM checkbox
   - Format options (group by date vs group by assignee)
3. Click "Generate DOCX"

**API Call** (Not implemented in backend, frontend handles):
```http
GET /api/standup-book/snaps/{sprintId}?date={date}
// Called for each day in range
```

**Frontend DOCX Generation** (using `docx` library):
```typescript
import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableCell, TableRow } from 'docx';

async function generateStandupBookDocx(sprint, snaps, dateRange) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          text: `Standup Book - ${sprint.name}`,
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: `Date Range: ${dateRange.start} to ${dateRange.end}`,
        }),
        new Paragraph({ text: '' }), // Empty line

        // For each day
        ...generateDayParagraphs(snaps)
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `StandupBook_${sprint.name}_${dateRange.start}_${dateRange.end}.docx`);
}

function generateDayParagraphs(snapsByDay) {
  const paragraphs = [];

  Object.keys(snapsByDay).forEach(date => {
    // Day header
    paragraphs.push(new Paragraph({
      text: `Day: ${date}`,
      heading: HeadingLevel.HEADING_2,
    }));

    // Group by assignee
    const grouped = groupByAssignee(snapsByDay[date]);

    Object.keys(grouped).forEach(assigneeName => {
      paragraphs.push(new Paragraph({
        text: assigneeName,
        heading: HeadingLevel.HEADING_3,
      }));

      grouped[assigneeName].forEach(snap => {
        // Card title
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: 'Card: ', bold: true }),
            new TextRun(snap.card.title),
          ]
        }));

        // Done
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: 'Done: ', bold: true }),
            new TextRun(snap.done || 'N/A'),
          ]
        }));

        // To Do
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: 'To Do: ', bold: true }),
            new TextRun(snap.toDo || 'N/A'),
          ]
        }));

        // Blockers
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: 'Blockers: ', bold: true }),
            new TextRun({ text: snap.blockers || 'None', color: snap.blockers ? 'FF0000' : '000000' }),
          ]
        }));

        // RAG Status
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: 'Status: ', bold: true }),
            new TextRun({
              text: snap.finalRAG?.toUpperCase() || 'N/A',
              color: snap.finalRAG === 'red' ? 'FF0000' : snap.finalRAG === 'amber' ? 'FFA500' : '00FF00'
            }),
          ]
        }));

        paragraphs.push(new Paragraph({ text: '' })); // Empty line
      });
    });
  });

  return paragraphs;
}
```

**DOCX Document Structure**:
```
Title: Standup Book - Sprint 5
Subtitle: Date Range: 2025-12-16 to 2025-12-29

--- Day: 2025-12-16 ---

  === John Doe (Backend Developer) ===

  Card: User Authentication API
  Done: Completed login API endpoint
  To Do: Implement token refresh
  Blockers: Waiting for SSL certificate
  Status: AMBER

  === Sarah Smith (QA Tester) ===

  Card: Testing Framework Setup
  Done: Set up Jest configuration
  To Do: Write unit tests for auth module
  Blockers: None
  Status: GREEN

--- Day: 2025-12-17 ---
  ...
```

**File Naming Convention**: `StandupBook_{SprintName}_{StartDate}_{EndDate}.docx`

**Library Used**: `docx` (https://www.npmjs.com/package/docx)

**Headers/Footers**:
- **Header**: Sprint name, Project name
- **Footer**: Page number, Generated date

**Styling**:
- **Heading 1**: Sprint title (24pt, bold)
- **Heading 2**: Day header (18pt, bold)
- **Heading 3**: Assignee name (14pt, bold)
- **Body**: 11pt, regular
- **RAG colors**: Red/Amber/Green text color

**UI Update**:
1. Show progress indicator during generation
2. Browser downloads file
3. Success toast "DOCX exported successfully"

**Validations**:
- At least one day must be selected
- Date range must be within sprint
- Maximum 100 days to prevent huge files

**Error Handling**:
- **No snaps in range**: Generate document with "No snaps recorded"
- **DOCX generation failure**: Show error "Export failed. Please try again."

---

## Complete User Journeys

### Journey 1: View Historical Standup for a Past Sprint

**Actors**: Scrum Master, Product Owner, PMO

**Preconditions**:
- User is logged in
- Past sprint exists with locked days

**Steps**:
1. Navigate to Standup Book page
2. Select past sprint from dropdown
3. Calendar loads showing all sprint days
4. Days with snaps show snap count badge
5. Locked days show lock icon
6. Click on a locked day (e.g., Day 5)
7. Day details page loads with all snaps for that day
8. Snaps are grouped by assignee
9. All data is read-only (no edit/delete buttons)
10. If MOM exists, it's displayed at the top
11. User can download MOM as TXT
12. User can export entire sprint to DOCX

**Expected Outcome**: User can view complete historical standup data without ability to modify

---

### Journey 2: Create MOM with AI Assistance

**Actors**: Scrum Master, Product Owner

**Preconditions**:
- User is logged in with `EDIT_SPRINT` permission
- Active sprint exists
- Day has occurred (not future)
- Day is not locked

**Steps**:
1. Navigate to day details page for today
2. Click "Create MOM" button
3. MOM creation page loads
4. Toggle "Use AI Parsing" switch ON
5. Type free-form meeting notes in Raw Input textarea:
   ```
   We discussed sprint retrospective today. Team velocity was good but testing coverage needs improvement. We decided to allocate 20% of sprint capacity to tech debt going forward. Also agreed to implement automated tests for all new features. John will set up CI/CD pipeline. Sarah will create test coverage report. Everyone needs to review the test strategy by Friday.
   ```
6. Click "Parse with AI" button
7. Loading spinner shows for 2-3 seconds
8. AI-suggested fields populate:
   - **Agenda**: "Sprint retrospective, velocity review, testing coverage discussion"
   - **Key Discussion Points**: "Team reviewed sprint velocity performance. Concerns raised about insufficient testing coverage..."
   - **Decisions Taken**: "Decided to allocate 20% of sprint capacity to tech debt. Agreed to implement automated tests..."
   - **Action Items**: "John: Set up CI/CD pipeline\nSarah: Create test coverage report\nTeam: Review test strategy by Friday"
9. User reviews suggestions and makes minor edits
10. Click "Create MOM"
11. Success toast shows
12. Redirects to day details
13. MOM is now visible on day details page

**Expected Outcome**: MOM is created with AI assistance, saving user time

---

### Journey 3: Lock a Day and Generate Summary

**Actors**: Scrum Master

**Preconditions**:
- User is logged in with `EDIT_SPRINT` permission
- Day has snaps recorded
- Day is not already locked

**Steps**:
1. Navigate to day details for a completed day
2. All snaps are visible and editable
3. Click "Lock Day" button in top-right
4. Confirmation modal appears: "Lock this day? All snaps will become read-only and a summary will be generated."
5. User confirms
6. API call processes:
   - Creates daily lock record
   - Sets all snaps to `isLocked = true`
   - Generates summary from all snaps
7. Page reloads showing:
   - "Day Locked" banner
   - All edit/delete buttons removed
   - Daily summary card showing aggregated Done/ToDo/Blockers
8. Calendar view now shows lock icon on this day
9. Future attempts to edit snaps show error

**Expected Outcome**: Day is locked, snaps are read-only, summary is generated

---

## API Endpoints Summary

### Standup Book Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/api/standup-book/active-sprint/:projectId` | `VIEW_SPRINT` | Get active sprint for project |
| `GET` | `/api/standup-book/sprint-days/:sprintId` | `VIEW_SPRINT` | Get all days in sprint |
| `GET` | `/api/standup-book/day-metadata/:sprintId?date=` | `VIEW_SPRINT` | Get metadata for specific day |
| `GET` | `/api/standup-book/snaps/:sprintId?date=` | `VIEW_SPRINT` | Get all snaps for a day |
| `GET` | `/api/standup-book/snaps-by-slots/:sprintId?date=` | `VIEW_SPRINT` | Get snaps grouped by slots |
| `POST` | `/api/standup-book/lock-day` | `EDIT_SPRINT` | Lock entire day |
| `GET` | `/api/standup-book/daily-lock/:sprintId?date=` | `VIEW_SPRINT` | Get daily lock status |

### MOM Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `POST` | `/api/standup-book/mom` | `EDIT_SPRINT` | Create MOM |
| `PUT` | `/api/standup-book/mom/:id` | `EDIT_SPRINT` | Update MOM |
| `GET` | `/api/standup-book/mom/:sprintId?date=` | `VIEW_SPRINT` | Get MOM for specific day |
| `GET` | `/api/standup-book/moms/:sprintId` | `VIEW_SPRINT` | Get all MOMs for sprint |
| `DELETE` | `/api/standup-book/mom/:id` | `EDIT_SPRINT` | Delete MOM |
| `POST` | `/api/standup-book/mom/generate` | `EDIT_SPRINT` | Generate MOM with AI |
| `GET` | `/api/standup-book/mom/:id/download?format=` | `VIEW_SPRINT` | Download MOM (TXT) |

---

## Permissions & RBAC

### Permissions Required

| Action | Permission | Scrum Master | Product Owner | PMO |
|--------|------------|--------------|---------------|-----|
| View calendar | `VIEW_SPRINT` | Yes | Yes | Yes |
| View day details | `VIEW_SPRINT` | Yes | Yes | Yes |
| View snaps | `VIEW_SPRINT` | Yes | Yes | Yes |
| Lock day | `EDIT_SPRINT` | Yes | Yes | No |
| Create MOM | `EDIT_SPRINT` | Yes | Yes | No |
| Edit MOM | `EDIT_SPRINT` | Yes | Yes | No |
| Delete MOM | `EDIT_SPRINT` | Yes | Yes | No |
| Download MOM | `VIEW_SPRINT` | Yes | Yes | Yes |
| Export to DOCX | `VIEW_SPRINT` | Yes | Yes | Yes |

### Role-Based Access

**Scrum Master**:
- Full access to all features
- Can lock/unlock days
- Can create/edit/delete MOMs

**Product Owner**:
- Full access to all features
- Can lock days and manage MOMs
- Cannot unlock days (admin only)

**PMO**:
- Read-only access
- Can view all historical data
- Can export to DOCX
- Cannot lock days or create MOMs

---

## Integration Points

### 1. Integration with Snaps Module
- **Data Flow**: Standup Book displays snaps created in Snaps module
- **Locking**: When day is locked, all snaps get `isLocked = true`
- **Summary Generation**: Daily summary aggregates Done/ToDo/Blockers from all snaps

### 2. Integration with Sprints Module
- **Sprint Selection**: Active sprint is auto-selected
- **Date Validation**: All dates must be within sprint range
- **Sprint Status**: Only shows days up to today (even for active sprint)

### 3. Integration with Cards Module
- **Card Details**: Each snap links to parent card
- **Assignee Info**: Snaps grouped by card assignee

### 4. Integration with Dashboard Module
- **Activity Feed**: MOM creation appears in recent activity
- **Quick Actions**: Link to Standup Book from dashboard

---

## Business Rules

### Day Lock Rules
1. **Day-level lock** (slotNumber = null):
   - Locks entire day regardless of slots
   - All snaps marked as `isLocked = true`
   - Cannot create/edit/delete snaps for this day
   - Can still view snaps (read-only)

2. **Slot-level lock** (slotNumber = 1/2/3):
   - Locks only specific slot
   - Snaps in that slot marked as locked
   - Other slots remain editable
   - Used for progressive locking in multi-slot standups

3. **Lock Hierarchy**:
   - If day is locked, all slots are locked
   - Cannot create slot lock if day is locked
   - Can lock all slots individually, then lock entire day

### MOM Rules
1. **One MOM per day**: Only one MOM record per sprint day
2. **Cannot create MOM for locked day**: Day must be unlocked
3. **Cannot edit MOM for locked day**: Lock prevents all modifications
4. **AI parsing is optional**: Can create MOM manually or with AI

### Summary Generation Rules
1. **Auto-generated on lock**: Summary created when day is locked
2. **Aggregation logic**:
   - Concatenate all Done items with bullet points
   - Concatenate all ToDo items
   - Concatenate all Blockers
   - If no items, use "No updates" / "None"
3. **Stored in DailyLock**: Summary stored in `dailySummaryDone`, `dailySummaryToDo`, `dailySummaryBlockers` fields

### Historical Data Rules
1. **Read-only past days**: Days in past are read-only (except if unlocked)
2. **Future days not accessible**: Cannot view days beyond today
3. **Locked data immutable**: Once locked, data frozen (except by admin unlock)

---

## Common Issues & Solutions

### Issue 1: AI Parsing Timeout
**Symptoms**: MOM generation takes more than 30 seconds, times out
**Root Cause**: Groq API slow or down
**Solution**:
- Frontend shows timeout error after 30s
- Falls back to manual entry
- User can retry or enter manually

**Prevention**:
- Set timeout to 30s
- Implement fallback parsing
- Show loading spinner with progress

---

### Issue 2: Day Shows as Locked But Snaps Are Editable
**Symptoms**: Day has lock record but snaps can still be edited
**Root Cause**: Snaps not marked as `isLocked = true` during lock operation
**Solution**:
- Check `daily_locks` table for lock record
- Check `snaps` table for `is_locked` field
- If mismatch, run update query:
  ```sql
  UPDATE snaps SET is_locked = true
  WHERE card_id IN (
    SELECT id FROM cards WHERE sprint_id = ?
  ) AND snap_date = ?
  ```

**Prevention**:
- Ensure transaction wraps both lock creation and snap update
- Add database constraint or trigger

---

### Issue 3: Cannot Create MOM - "MOM Already Exists"
**Symptoms**: Error when creating MOM, says it already exists
**Root Cause**: MOM record exists in database for that day
**Solution**:
- Query to check: `SELECT * FROM moms WHERE sprint_id = ? AND date = ?`
- If exists, redirect to edit page instead
- Or delete existing and recreate

**Prevention**:
- Check for existing MOM before showing create button
- Show "Edit MOM" instead if exists

---

### Issue 4: DOCX Export Missing Data
**Symptoms**: Exported DOCX is empty or missing snaps
**Root Cause**: API calls for date range failed or returned no data
**Solution**:
- Check network tab for failed API calls
- Verify date range is correct
- Ensure snaps exist for selected days
- Check browser console for DOCX generation errors

**Prevention**:
- Add validation for empty data before generating DOCX
- Show warning if no snaps found
- Implement retry for failed API calls

---

### Issue 5: Multi-Slot Day Shows All Snaps in Slot 1
**Symptoms**: All snaps appear in Slot 1 tab, other slots empty
**Root Cause**: Snaps created without `slotNumber` field (defaults to null or 1)
**Solution**:
- Check `snaps` table: `SELECT slot_number, COUNT(*) FROM snaps WHERE snap_date = ? GROUP BY slot_number`
- If null, update: `UPDATE snaps SET slot_number = 1 WHERE snap_date = ? AND slot_number IS NULL`
- Ensure snap creation sets correct slot number

**Prevention**:
- Make `slotNumber` required when creating snap in multi-slot sprint
- Default to 1 if not provided
- Show slot selector prominently in UI

---

## Data Flow Diagrams

### Daily Lock Flow
```
User clicks "Lock Day" →
Frontend shows confirmation modal →
User confirms →
POST /api/standup-book/lock-day →
Backend validates sprint and date →
Check if already locked →
Get all snaps for day →
Generate daily summary (aggregate Done/ToDo/Blockers) →
Create DailyLock record (slotNumber = null) →
Update all snaps: SET is_locked = true →
Return lock record →
Frontend shows success →
Calendar updates to show lock icon →
Day details page shows "Day Locked" banner
```

### MOM Creation with AI Flow
```
User types meeting notes in Raw Input →
User clicks "Parse with AI" →
POST /api/standup-book/mom/generate →
Backend calls Groq API with prompt →
Groq returns JSON: { agenda, keyDiscussionPoints, decisionsTaken, actionItems } →
Backend parses JSON (handles control characters) →
If parsing fails, use fallback →
Return structured fields →
Frontend populates form fields →
User reviews and edits →
User clicks "Create MOM" →
POST /api/standup-book/mom →
Backend validates day not locked →
Check MOM doesn't exist →
Insert into moms table →
Return MOM record →
Frontend redirects to day details →
MOM displayed on page
```

### Export to DOCX Flow
```
User clicks "Export to DOCX" →
Frontend shows export modal (date range, filters) →
User configures and clicks "Generate" →
Frontend loops through each day in range:
  GET /api/standup-book/snaps/{sprintId}?date={date} →
  Collect snaps for each day →
Frontend groups snaps by assignee →
Frontend uses docx library to build document:
  - Add title (Sprint name)
  - Add date range
  - For each day:
    - Add day header
    - For each assignee:
      - Add assignee name
      - For each snap:
        - Add card title
        - Add Done/ToDo/Blockers
        - Add RAG status (colored) →
Generate .docx file blob →
Trigger browser download →
Show success toast
```

---

## Edge Cases

### Edge Case 1: Lock Day with No Snaps
**Scenario**: Scrum Master locks a day that has no snaps
**Expected Behavior**:
- Lock is created successfully
- Daily summary shows "No updates recorded"
- Day shows lock icon
- No errors thrown

**Implementation**:
```typescript
if (snaps.length === 0) {
  return {
    done: 'No updates recorded',
    toDo: 'No updates recorded',
    blockers: 'None',
  };
}
```

---

### Edge Case 2: Create MOM for Future Day
**Scenario**: User tries to create MOM for a future day
**Expected Behavior**:
- API returns 400 Bad Request
- Error message: "Cannot create MOM for a future day"
- Frontend disables "Create MOM" button for future days

**Implementation**:
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
const targetDate = new Date(date);

if (targetDate > today) {
  throw new BadRequestException('Cannot create MOM for a future day');
}
```

---

### Edge Case 3: AI Returns Invalid JSON
**Scenario**: Groq API returns malformed JSON or plain text
**Expected Behavior**:
- Backend catches JSON.parse error
- Tries cleanup (escape control characters)
- If still fails, uses fallback parsing
- Fallback puts raw text in keyDiscussionPoints

**Implementation**:
```typescript
try {
  parsed = JSON.parse(jsonString);
} catch (firstError) {
  // Cleanup
  jsonString = jsonString
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, ' ');

  try {
    parsed = JSON.parse(jsonString);
  } catch (secondError) {
    // Use fallback
    return this.fallbackParse(rawInput);
  }
}
```

---

### Edge Case 4: Unlock Day (Admin Function)
**Scenario**: Admin needs to unlock a locked day to make corrections
**Expected Behavior**:
- API endpoint exists but not exposed in UI
- `DELETE /api/standup-book/unlock-day`
- Removes DailyLock record
- Sets all snaps to `isLocked = false`
- Only accessible to admin role

**Implementation** (not in UI):
```typescript
async unlockDay(sprintId: string, date: string): Promise<void> {
  const targetDate = new Date(date);

  const lock = await this.dailyLockRepository.findOne({
    where: { sprint: { id: sprintId }, date: targetDate },
  });

  if (!lock) {
    throw new NotFoundException('No lock found for this day');
  }

  // Get all snaps
  const snaps = await this.snapRepository.find({
    where: { card: { sprint: { id: sprintId } }, snapDate: targetDate },
  });

  // Unlock snaps
  for (const snap of snaps) {
    snap.isLocked = false;
  }
  await this.snapRepository.save(snaps);

  // Remove lock
  await this.dailyLockRepository.remove(lock);
}
```

---

## Performance Considerations

### 1. Calendar View Loading
- **Challenge**: Loading metadata for 30+ days can be slow
- **Solution**: Batch API calls or use single endpoint that returns all day metadata
- **Optimization**: Cache day metadata in frontend for 5 minutes

### 2. DOCX Generation for Large Sprints
- **Challenge**: Generating DOCX for 100+ snaps can freeze UI
- **Solution**: Show progress indicator during generation
- **Optimization**: Use Web Worker for DOCX generation (offload from main thread)

### 3. AI Parsing Timeout
- **Challenge**: Groq API can be slow (5-10 seconds)
- **Solution**: Set 30-second timeout, show spinner
- **Optimization**: Cache AI responses for same raw input (optional)

---

## Security Considerations

### 1. Day Lock Authorization
- **Risk**: Unauthorized users unlocking days
- **Mitigation**: Unlock endpoint not exposed in UI, requires admin role
- **Validation**: Check user has `EDIT_SPRINT` permission before locking

### 2. MOM Content Sanitization
- **Risk**: XSS attacks via MOM content
- **Mitigation**: Sanitize all text inputs before saving
- **Validation**: Escape HTML in frontend when displaying

### 3. DOCX Download Path Traversal
- **Risk**: Malicious filename causing file system access
- **Mitigation**: Generate filename programmatically, don't accept user input
- **Validation**: Sanitize sprint name before using in filename

---

## Testing Scenarios

### Test Case 1: Lock Day with Multiple Slots
**Given**: Sprint has 2 daily standup slots
**When**: User locks entire day
**Then**:
- DailyLock created with `slotNumber = null`
- All snaps in Slot 1 marked as `isLocked = true`
- All snaps in Slot 2 marked as `isLocked = true`
- Daily summary aggregates snaps from both slots

### Test Case 2: Create MOM with AI - Success
**Given**: Valid raw input text
**When**: User clicks "Parse with AI"
**Then**:
- API calls Groq with correct prompt
- Groq returns valid JSON
- Frontend populates all 4 fields
- User can edit suggestions
- MOM saves successfully

### Test Case 3: Create MOM with AI - API Failure
**Given**: Groq API is down or returns error
**When**: User clicks "Parse with AI"
**Then**:
- API catches error
- Fallback parsing executes
- keyDiscussionPoints = raw input
- Other fields = placeholder text
- User can still save MOM

### Test Case 4: Export DOCX for Empty Sprint
**Given**: Sprint has no snaps
**When**: User clicks "Export to DOCX"
**Then**:
- DOCX generated successfully
- Document contains sprint header
- Body shows "No snaps recorded"
- No errors thrown

---

**End of Standup Book Documentation**
