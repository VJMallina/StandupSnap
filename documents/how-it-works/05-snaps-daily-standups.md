# Snaps (Daily Standups) - How It Works

## Overview
- **Purpose**: Core daily standup update system with AI-powered parsing
- **Key Features**: Free-form text input, AI parsing (Groq API), Done/ToDo/Blockers extraction, AI-suggested RAG status, daily lock mechanism, multi-slot standup support
- **Integration**: Cards, Sprints, RAG tracking, Daily Summaries
- **THIS IS THE SIGNATURE FEATURE OF STANDUPSNAP**

## Database Schema

### Snap Entity
**Table**: `snaps`
**File**: `F:\StandupSnap\backend\src\entities\snap.entity.ts`

#### Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto-generated |
| `card` | Relation | Parent card | ManyToOne, CASCADE delete |
| `cardId` | String | Card reference | Indexed |
| `createdBy` | Relation | User who created snap | ManyToOne |
| `createdById` | String | User reference | Required |
| `rawInput` | Text | Original free-form text | Required |
| `done` | Text | Parsed "Done" section | Nullable |
| `toDo` | Text | Parsed "To Do" section | Nullable |
| `blockers` | Text | Parsed "Blockers" section | Nullable |
| `suggestedRAG` | Enum | AI-suggested RAG status | Nullable |
| `finalRAG` | Enum | Final RAG (after override) | Nullable |
| `snapDate` | Date | Date of snap (not timestamp) | Required, indexed |
| `slotNumber` | Integer | Standup slot (1-3) | Nullable |
| `isLocked` | Boolean | Lock status | Default: false |
| `createdAt` | Timestamp | Creation timestamp | Auto-generated |
| `updatedAt` | Timestamp | Last update timestamp | Auto-updated |

#### Enums

```typescript
export enum SnapRAG {
  GREEN = 'green',
  AMBER = 'amber',
  RED = 'red',
}
```

### DailyLock Entity
**Table**: `daily_locks`
**File**: `F:\StandupSnap\backend\src\entities\daily-lock.entity.ts`

Manages daily and slot-specific snap locks.

#### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `sprint` | Relation | Parent sprint |
| `date` | Date | Lock date |
| `slotNumber` | Integer | Slot number (null = entire day) |
| `isLocked` | Boolean | Lock status |
| `dailySummaryDone` | Text | Aggregated done items |
| `dailySummaryToDo` | Text | Aggregated todo items |
| `dailySummaryBlockers` | Text | Aggregated blockers |
| `lockedBy` | Relation | User who locked (nullable) |
| `lockedAt` | Timestamp | Lock timestamp |

**Unique Constraint**: `[sprint, date, slotNumber]`

### DailySnapLock Entity (Legacy)
**Table**: `daily_snap_locks`
**File**: `F:\StandupSnap\backend\src\entities\daily-snap-lock.entity.ts`

Older lock tracking mechanism.

#### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `sprint` | Relation | Parent sprint |
| `sprintId` | String | Sprint reference |
| `lockDate` | Date | Date that was locked |
| `lockedBy` | Relation | User who locked (nullable) |
| `lockedById` | String | User reference (nullable) |
| `isAutoLocked` | Boolean | Auto vs manual lock |
| `createdAt` | Timestamp | Lock creation time |

### DailySummary Entity
**Table**: `daily_summaries`
**File**: `F:\StandupSnap\backend\src\entities\daily-summary.entity.ts`

Aggregated daily standup summary.

#### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `sprint` | Relation | Parent sprint |
| `sprintId` | String | Sprint reference |
| `summaryDate` | Date | Summary date |
| `done` | Text | Consolidated done items |
| `toDo` | Text | Consolidated todo items |
| `blockers` | Text | Consolidated blockers |
| `ragOverview` | JSONB | RAG breakdown (see below) |
| `fullData` | JSONB | Complete structured data |
| `createdAt` | Timestamp | Summary generation time |

**RAG Overview Structure**:
```typescript
{
  cardLevel: { green: number; amber: number; red: number };
  assigneeLevel: { green: number; amber: number; red: number };
  sprintLevel: string; // 'green', 'amber', or 'red'
}
```

---

## THE CORE FEATURE: AI-Powered Snap Creation

### Overview of the Complete Flow

**StandupSnap's Magic**: Transform free-form text into structured standup updates using AI

**User Experience**:
1. User writes natural language update (e.g., "Completed API integration. Working on UI next. Waiting for design approval.")
2. Click "Generate Snap"
3. AI parses into:
   - ✅ **Done**: "Completed API integration"
   - → **To Do**: "Working on UI development"
   - ⚠ **Blockers**: "Waiting for design approval from design team"
   - 🔴 **RAG**: AMBER (due to blocker)
4. User reviews, edits if needed, saves
5. Card status auto-updates, RAG recalculates

---

## Screens & Pages

### Screen 1: Daily Snaps Page
**Route**: `/snaps/:sprintId`
**Access**: Requires `VIEW_SNAP` permission
**Component**: `F:\StandupSnap\frontend\src\pages\snaps\DailySnapsPage.tsx`

#### UI Components
- **Header Banner**: Gradient header with "Daily Snap Management" title
- **Back to Sprint Button**: Navigate back to sprint details
- **Date Selector**:
  - Date input (restricted to sprint date range)
  - Lock status badge (if day is locked)
  - "Lock Snaps for Today" button (if SM and snaps exist)
- **View Mode Toggle**:
  - "Snaps View" (individual updates)
  - "Summary View" (aggregated daily summary)
- **Snaps View** (default):
  - Grouped by assignee
  - Shows all cards for sprint
  - Displays snaps per card
  - "Add Snap" button per card (if not locked)
- **Summary View**:
  - RAG overview (sprint, card, assignee levels)
  - Done section
  - To Do section
  - Blockers section
  - Detailed breakdown by team member (collapsible)
  - Download summary button

#### User Actions

##### Action 1: Select Date and View Snaps

**What happens**: Load all snaps for selected date

**Frontend Flow**:
1. Page loads with today's date pre-selected
2. User can change date using date input
3. Each date change triggers `loadDailyData()`
4. Loads cards, snaps, lock status, and summary (if locked)

**API Calls**:
```http
GET /api/cards?sprintId={uuid}
GET /api/snaps/sprint/{sprintId}/date/{date}
GET /api/snaps/is-locked/{sprintId}/{date}
GET /api/snaps/summary/{sprintId}/{date}  (if locked)
```

**Backend**:
- **Cards**: Standard cards.findAll with sprint filter
- **Snaps**: `snap.controller.ts` Line 82-88 - `@Get('sprint/:sprintId/date/:date')`
- **Lock Check**: `snap.controller.ts` Line 165-173 - `@Get('is-locked/:sprintId/:date')`
- **Summary**: `snap.controller.ts` Line 138-145 - `@Get('summary/:sprintId/:date')`

**Snaps Query** (Lines 364-395 in snap.service.ts):
```typescript
async findBySprintAndDate(sprintId: string, date: string): Promise<Snap[]> {
  const sprint = await this.sprintRepository.findOne({
    where: { id: sprintId },
    relations: ['project'],
  });

  if (!sprint) {
    throw new NotFoundException('Sprint not found');
  }

  // Get all cards for this sprint
  const cards = await this.cardRepository.find({
    where: { sprint: { id: sprintId } },
  });

  const cardIds = cards.map((c) => c.id);

  if (cardIds.length === 0) {
    return [];
  }

  // Use query builder to avoid date comparison issues
  return this.snapRepository
    .createQueryBuilder('snap')
    .leftJoinAndSelect('snap.card', 'card')
    .leftJoinAndSelect('snap.createdBy', 'createdBy')
    .leftJoinAndSelect('card.assignee', 'assignee')
    .where('snap.card_id IN (:...cardIds)', { cardIds })
    .andWhere('snap.snapDate = :date', { date })
    .orderBy('snap.createdAt', 'ASC')
    .getMany();
}
```

**Database**:
```sql
SELECT
  snap.*,
  card.*,
  createdBy.*,
  assignee.*
FROM snaps snap
LEFT JOIN cards card ON snap.card_id = card.id
LEFT JOIN users createdBy ON snap.created_by = createdBy.id
LEFT JOIN team_members assignee ON card.assignee_id = assignee.id
WHERE snap.card_id IN (?)
  AND snap.snapDate = ?
ORDER BY snap.createdAt ASC
```

**Response**:
```json
[
  {
    "id": "uuid",
    "rawInput": "Completed API integration. Working on UI next.",
    "done": "Completed API integration for user authentication",
    "toDo": "Working on UI development for login page",
    "blockers": "",
    "suggestedRAG": "green",
    "finalRAG": "green",
    "snapDate": "2025-01-20",
    "slotNumber": 1,
    "isLocked": false,
    "card": { ... },
    "createdBy": { ... },
    "createdAt": "2025-01-20T09:15:00Z",
    "updatedAt": "2025-01-20T09:15:00Z"
  }
]
```

**UI Update**:
- Snaps group by assignee
- Each card shows its snaps for the day
- Cards without snaps show "No snap recorded for today"
- Lock status badge appears if day is locked

---

### Screen 2: Create Snap Modal
**Component**: `F:\StandupSnap\frontend\src\components\snaps\CreateSnapModal.tsx`
**Trigger**: Click "Add Snap" button on Daily Snaps Page or Card Details Page

#### UI Components - Step 1: Input
- **Modal Header**: "Add Snap for {cardTitle}"
- **Past Snaps Section** (collapsible):
  - Yesterday's snap (if exists) - highlighted in blue
  - Older snaps (collapsed by default)
  - Shows Done/ToDo/Blockers/RAG for context
- **Raw Input Field**:
  - Large textarea (4 rows)
  - Placeholder: "Example: Completed API integration for user auth. Working on frontend UI next. Blocked on database permissions."
  - Helper text: "Standup Snap will automatically parse your update into Done, To Do, and Blockers sections."
- **Slot Selection**:
  - Dropdown: Slot 1, Slot 2, Slot 3 (based on sprint.dailyStandupCount)
  - Helper text: "Select which standup slot this update belongs to."
- **Action Buttons**:
  - "Cancel" (secondary)
  - "Generate Snap" (primary, disabled if rawInput empty)
  - Loading spinner during AI parsing

#### UI Components - Step 2: Review
- **Success Banner**: "✓ Snap Generated! Review and edit below, then save."
- **Original Input Display**: Shows raw input in gray box
- **Parsed Fields** (all editable):
  - **Done** textarea (2 rows)
  - **To Do** textarea (2 rows)
  - **Blockers** textarea (2 rows)
  - **Snap Suggested RAG** dropdown (Green/Amber/Red)
  - **Override RAG Status** dropdown (Keep suggested/Green/Amber/Red)
- **Action Buttons**:
  - "← Back to Edit Input" (secondary)
  - "Cancel" (secondary)
  - "Save Snap" (primary, green background)

#### User Actions

##### Action 1: Parse Free-Form Text with AI (M8-UC01 Part 1)

**What happens**: Send text to AI, get structured output

**Frontend Flow**:
1. User enters free-form text in `rawInput`
2. User selects slot number
3. User clicks "Generate Snap"
4. Sets `parsing` state to true
5. Calls `snapsApi.parse(cardId, rawInput)`

**API Call**:
```http
POST /api/snaps/parse
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "cardId": "uuid",
  "rawInput": "Completed API integration. Working on UI next. Blocked on design approval."
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\snap\snap.controller.ts` - `@Post('parse')` (Lines 47-51)
- **Permission**: `CREATE_SNAP`
- **Service**: `F:\StandupSnap\backend\src\snap\snap.service.ts` - `parseOnly()` (Lines 179-194)

**parseOnly Logic** (Lines 179-194):
```typescript
async parseOnly(cardId: string, rawInput: string): Promise<ParsedSnapData> {
  // 1. Find card
  const card = await this.cardRepository.findOne({
    where: { id: cardId },
    relations: ['sprint'],
  });

  if (!card) {
    throw new NotFoundException('Card not found');
  }

  // 2. Parse with AI
  const parsedData = await this.parseSnapWithAI(rawInput, card);

  return parsedData;
}
```

**THE MAGIC: parseSnapWithAI Function** (Lines 755-867)

This is THE core AI integration. Let me document it in EXTREME detail:

**Function Signature**:
```typescript
private async parseSnapWithAI(rawInput: string, card: Card): Promise<ParsedSnapData>
```

**Return Type**:
```typescript
export interface ParsedSnapData {
  done: string;
  toDo: string;
  blockers: string;
  suggestedRAG: SnapRAG;
}
```

**Step-by-Step Breakdown**:

**1. Build AI Prompt** (Lines 757-800):

The prompt is carefully engineered to get consistent, high-quality results:

```typescript
const prompt = `You are a standup meeting assistant. Analyze the following update and extract structured information.

TASK: ${card.title}
USER'S UPDATE: "${rawInput}"

INSTRUCTIONS:
1. UNDERSTAND the update thoroughly - what work was mentioned, what's planned, any issues
2. REPHRASE each section in clear, professional language (don't just copy the input)
3. CATEGORIZE correctly:
   - "done": Work that has been COMPLETED (past tense, finished tasks)
   - "toDo": Work that is PLANNED or IN PROGRESS (future/ongoing tasks)
   - "blockers": Any ISSUES, dependencies, or problems mentioned (or empty string if none)
4. ASSESS the overall status for RAG

REPHRASING GUIDELINES:
- Convert casual language to professional standup format
- Start "done" items with action verbs like "Completed", "Finished", "Implemented", "Fixed"
- Start "toDo" items with "Will", "Planning to", "Working on", "Next steps include"
- Keep each section concise but informative
- NEVER leave fields empty. Use these defaults if nothing mentioned:
  - done: "Continuing progress on current tasks" or "No specific completions to report"
  - toDo: "Will continue with ongoing work" or "No new tasks planned"
  - blockers: "No blockers reported"

EXAMPLES:
Input: "finished the login page yesterday, today working on dashboard, waiting for API docs from backend team"
Output: {"done":"Completed the login page implementation","toDo":"Working on dashboard development","blockers":"Waiting for API documentation from backend team","suggestedRAG":"amber"}

Input: "all good, completed testing and deployment"
Output: {"done":"Completed testing and successfully deployed the changes","toDo":"Will continue with ongoing work","blockers":"No blockers reported","suggestedRAG":"green"}

Input: "everything is good, nothing to discuss"
Output: {"done":"All tasks progressing smoothly with no issues","toDo":"Will continue with ongoing work","blockers":"No blockers reported","suggestedRAG":"green"}

Input: "still working on the same task"
Output: {"done":"No specific completions to report","toDo":"Continuing work on current task","blockers":"No blockers reported","suggestedRAG":"green"}

RAG STATUS:
- green: Good progress, no issues, on track
- amber: Minor delays, dependencies, or small issues
- red: Major blockers, stuck, significant problems

Return ONLY valid JSON:
{"done":"...","toDo":"...","blockers":"...","suggestedRAG":"green|amber|red"}`;
```

**Key Prompt Engineering Techniques**:
- ✅ **Context Awareness**: Includes card title for task-specific understanding
- ✅ **Clear Instructions**: Numbered steps, explicit categorization
- ✅ **Rephrasing Guidance**: Transform casual → professional language
- ✅ **Default Values**: Ensures fields never empty (prevents UI errors)
- ✅ **Examples**: Few-shot learning with diverse inputs
- ✅ **Format Specification**: JSON-only output, no extra text
- ✅ **RAG Logic**: Clear criteria for status determination

**2. Call Groq API** (Lines 802-828):

**API Details**:
- **Endpoint**: `https://api.groq.com/openai/v1/chat/completions`
- **Model**: `llama-3.3-70b-versatile` (configured in .env as `GROQ_MODEL`)
- **API Key**: From environment variable `GROQ_API_KEY`
- **Temperature**: `0.3` (low for consistent, deterministic outputs)
- **Max Tokens**: `500` (sufficient for structured response)
- **Timeout**: `30000ms` (30 seconds)

**Full API Call**:
```typescript
const response = await axios.post(
  'https://api.groq.com/openai/v1/chat/completions',
  {
    model: this.groqModel,  // 'llama-3.3-70b-versatile'
    messages: [
      {
        role: 'system',
        content: 'You are a standup meeting assistant. You analyze updates and return ONLY valid JSON with no additional text.'
      },
      {
        role: 'user',
        content: prompt  // The prompt built above
      }
    ],
    temperature: 0.3,
    max_tokens: 500,
  },
  {
    headers: {
      'Authorization': `Bearer ${this.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  }
);
```

**Why Groq?**:
- ⚡ **Speed**: 10-100x faster than OpenAI (typically <1 second)
- 💰 **Cost**: Free tier available, very affordable
- 🎯 **Quality**: Llama 3.3 70B produces high-quality structured outputs
- 📊 **Reliability**: Low latency, high uptime

**3. Parse AI Response** (Lines 830-858):

**Extract Content**:
```typescript
const content = response.data?.choices?.[0]?.message?.content || '';
console.log('[SnapService.parseSnapWithAI] Raw response:', content);
```

**Example Raw Response**:
```json
{"done":"Completed the login page implementation and integrated JWT authentication","toDo":"Working on dashboard development and user profile features","blockers":"Waiting for API documentation from backend team","suggestedRAG":"amber"}
```

**Handle Edge Cases**:
```typescript
// Extract JSON from response (in case AI adds explanatory text)
const jsonMatch = content.match(/\{[\s\S]*?\}/);
if (!jsonMatch) {
  console.warn('[SnapService.parseSnapWithAI] No JSON found, attempting manual parse');
  // Fallback to manual parsing
  return this.manualParse(rawInput);
}

const parsed = JSON.parse(jsonMatch[0]);
console.log('[SnapService.parseSnapWithAI] Parsed:', parsed);
```

**Map RAG Status**:
```typescript
// Validate and map RAG status
let rag = SnapRAG.AMBER;  // Default to AMBER for safety
if (parsed.suggestedRAG) {
  const ragLower = parsed.suggestedRAG.toLowerCase();
  if (ragLower === 'green') rag = SnapRAG.GREEN;
  else if (ragLower === 'red') rag = SnapRAG.RED;
  else rag = SnapRAG.AMBER;
}

return {
  done: parsed.done || '',
  toDo: parsed.toDo || parsed.todo || '',  // Handle both spellings
  blockers: parsed.blockers || '',
  suggestedRAG: rag,
};
```

**4. Error Handling and Fallback** (Lines 859-867):

```typescript
} catch (error: any) {
  console.error('[SnapService.parseSnapWithAI] Error:', error.message);
  if (error.response?.data) {
    console.error('[SnapService.parseSnapWithAI] Groq API error:', error.response.data);
  }
  // Fallback to manual parsing
  return this.manualParse(rawInput);
}
```

**Error Scenarios**:
- Network failure
- Groq API down
- API rate limit exceeded
- Invalid JSON response
- Timeout (30s)

**Fallback: Manual Parsing** (Lines 872-909):

When AI fails, fall back to keyword-based parsing:

```typescript
private manualParse(rawInput: string): ParsedSnapData {
  console.warn('[SnapService.manualParse] AI failed, using fallback parsing');

  // Split by common separators and keywords
  const sentences = rawInput.split(/[.,;]\s*/).filter(s => s.trim());

  let done = '';
  let toDo = '';
  let blockers = '';

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase().trim();

    // Categorize each sentence individually
    if (lower.includes('blocked') || lower.includes('waiting') ||
        lower.includes('stuck') || lower.includes('issue') ||
        lower.includes('problem')) {
      blockers = blockers ? `${blockers}. ${sentence.trim()}` : sentence.trim();
    } else if (lower.includes('will') || lower.includes('working on') ||
               lower.includes('next') || lower.includes('planning') ||
               lower.includes('tomorrow') || lower.includes('today')) {
      toDo = toDo ? `${toDo}. ${sentence.trim()}` : sentence.trim();
    } else if (lower.includes('completed') || lower.includes('finished') ||
               lower.includes('done') || lower.includes('fixed') ||
               lower.includes('implemented')) {
      done = done ? `${done}. ${sentence.trim()}` : sentence.trim();
    }
  }

  // If nothing was categorized, put everything in done
  if (!done && !toDo && !blockers) {
    done = rawInput;
  }

  // Determine RAG based on content
  let rag = SnapRAG.GREEN;
  if (blockers) {
    rag = SnapRAG.RED;
  } else if (!done && toDo) {
    rag = SnapRAG.AMBER;
  }

  return { done, toDo, blockers, suggestedRAG: rag };
}
```

**Fallback Logic**:
- Keyword-based sentence categorization
- Blockers detected by: "blocked", "waiting", "stuck", "issue", "problem"
- ToDo detected by: "will", "working on", "next", "planning", "today", "tomorrow"
- Done detected by: "completed", "finished", "done", "fixed", "implemented"
- Simple RAG: Blockers → RED, No done → AMBER, Otherwise → GREEN

**Response to Frontend**:
```json
{
  "done": "Completed API integration for user authentication",
  "toDo": "Working on UI development for login page",
  "blockers": "Waiting for design approval from design team",
  "suggestedRAG": "amber"
}
```

**UI Update**:
- Modal transitions to Step 2 (review)
- All fields pre-populated with AI-parsed values
- User can edit any field
- RAG dropdown shows AI suggestion
- Override RAG defaults to "Keep suggested"

---

##### Action 2: Save Snap (M8-UC01 Part 2)

**What happens**: Create snap record in database, update card status and RAG

**Frontend Flow**:
1. User reviews parsed output
2. User optionally edits Done/ToDo/Blockers
3. User optionally overrides RAG status
4. User clicks "Save Snap"
5. Calls `snapsApi.create()`

**API Call**:
```http
POST /api/snaps
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "cardId": "uuid",
  "rawInput": "Completed API integration. Working on UI next. Blocked on design.",
  "slotNumber": 1,
  "done": "Completed API integration for user authentication",
  "toDo": "Working on UI development for login page",
  "blockers": "Waiting for design approval from design team",
  "suggestedRAG": "amber",
  "finalRAG": "red"  // User overrode to RED
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\snap\snap.controller.ts` - `@Post()` (Lines 35-39)
- **Permission**: `CREATE_SNAP` (SM only)
- **Service**: `F:\StandupSnap\backend\src\snap\snap.service.ts` - `create()` (Lines 64-173)

**THE COMPLETE CREATE FLOW** (Lines 64-173):

**1. Extract DTO Fields**:
```typescript
const { cardId, rawInput, done, toDo, blockers, suggestedRAG, finalRAG, slotNumber } = createSnapDto;
```

**2. Validate Card Exists** (Lines 70-80):
```typescript
const card = await this.cardRepository.findOne({
  where: { id: cardId },
  relations: ['sprint', 'snaps'],
});

if (!card) {
  console.error('[SnapService.create] Card not found:', cardId);
  throw new NotFoundException('Card not found');
}

console.log('[SnapService.create] Card found:', { cardId: card.id, sprintId: card.sprint?.id });
```

**3. Business Validation: Card Must Have ET** (Lines 82-85):
```typescript
if (!card.estimatedTime || card.estimatedTime <= 0) {
  throw new BadRequestException('Card must have Estimated Time (ET) specified to create snap');
}
```

**Business Rule BR-SNAP-001**: Card must have ET before snaps can be created

**4. Validate Sprint is Active** (Lines 87-94):
```typescript
if (card.sprint.status !== SprintStatus.ACTIVE) {
  throw new BadRequestException('Cannot create snaps for cards in non-Active sprints');
}

if (card.sprint.isClosed) {
  throw new BadRequestException('Cannot create snaps after sprint closure');
}
```

**Business Rule BR-SNAP-002**: Cannot create snaps in non-Active or closed sprints

**5. Validate Slot Number** (Lines 96-101):
```typescript
const today = new Date().toISOString().split('T')[0];
const maxSlots = card.sprint.dailyStandupCount || 1;
if (slotNumber < 1 || slotNumber > maxSlots) {
  throw new BadRequestException(`Invalid slot number. Sprint has ${maxSlots} daily standup slot(s). Please select a slot between 1 and ${maxSlots}.`);
}
```

**Business Rule BR-SNAP-003**: Slot number must be within sprint's configured slots (1-3)

**6. Check Daily Lock Status** (Lines 103-107):
```typescript
const isLocked = await this.isDayLocked(card.sprint.id, today, slotNumber);
if (isLocked) {
  throw new BadRequestException(`Cannot create snaps for locked slot ${slotNumber}. The day or this slot has been locked.`);
}
```

**Business Rule BR-SNAP-004**: Cannot create snaps for locked days/slots

**Lock Check Logic** (Lines 726-750):
```typescript
async isDayLocked(sprintId: string, date: string, slotNumber?: number): Promise<boolean> {
  const targetDate = new Date(date);

  // Check if entire day is locked (slotNumber = null)
  const dayLock = await this.dailyLockRepository.findOne({
    where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
  });

  if (dayLock && dayLock.isLocked) {
    return true; // Entire day is locked
  }

  // If checking specific slot, also check slot-level lock
  if (slotNumber !== undefined) {
    const slotLock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber },
    });

    if (slotLock && slotLock.isLocked) {
      return true; // This specific slot is locked
    }
  }

  return false;
}
```

**7. Validate Snap Date Within Sprint Range** (Lines 109-116):
```typescript
const snapDate = new Date(today);
const sprintStart = new Date(card.sprint.startDate);
const sprintEnd = new Date(card.sprint.endDate);

if (snapDate < sprintStart || snapDate > sprintEnd) {
  throw new BadRequestException('Snap date must be within sprint date range');
}
```

**Business Rule BR-SNAP-005**: Snap date must fall within sprint date range

**8. AI Parsing (if not already done)** (Lines 118-123):
```typescript
let parsedData: ParsedSnapData | null = null;
if (!done && !toDo && !blockers && !suggestedRAG) {
  // Use AI to parse the raw input
  parsedData = await this.parseSnapWithAI(rawInput, card);
}
```

**Note**: Usually parsing is done via `/parse` endpoint first, but this allows direct save with raw input

**9. Create Snap Entity** (Lines 125-138):
```typescript
const snap = this.snapRepository.create({
  cardId,
  createdById: userId,
  rawInput,
  done: done || parsedData?.done || null,
  toDo: toDo || parsedData?.toDo || null,
  blockers: blockers || parsedData?.blockers || null,
  suggestedRAG: suggestedRAG || parsedData?.suggestedRAG || null,
  finalRAG: finalRAG || parsedData?.suggestedRAG || null, // Default to suggested if not overridden
  snapDate,
  slotNumber,
  isLocked: false,
});
```

**10. Save Snap to Database** (Lines 141-143):
```typescript
console.log('[SnapService.create] Saving snap...');
const savedSnap = await this.snapRepository.save(snap);
console.log('[SnapService.create] Snap saved:', savedSnap.id);
```

**Database**:
```sql
INSERT INTO snaps (
  id, card_id, created_by, raw_input,
  done, toDo, blockers,
  suggestedRAG, finalRAG,
  snapDate, slotNumber, isLocked,
  createdAt, updatedAt
) VALUES (
  gen_random_uuid(), ?, ?, ?,
  ?, ?, ?,
  ?, ?,
  ?, ?, false,
  NOW(), NOW()
) RETURNING *
```

**11. Auto-Transition Card to IN_PROGRESS** (Lines 145-149):
```typescript
if (card.status === CardStatus.NOT_STARTED) {
  console.log('[SnapService.create] Transitioning card to IN_PROGRESS');
  await this.cardRepository.update(card.id, { status: CardStatus.IN_PROGRESS });
}
```

**Business Rule BR-SNAP-006**: First snap for a NOT_STARTED card auto-transitions to IN_PROGRESS

**Database**:
```sql
UPDATE cards
SET status = 'in_progress', updatedAt = NOW()
WHERE id = ?
  AND status = 'not_started'
```

**12. Update Card RAG Status** (Lines 151-153):
```typescript
console.log('[SnapService.create] Updating card RAG...');
await this.updateCardRAG(cardId);
```

**Update RAG Logic** (Lines 915-956):
```typescript
private async updateCardRAG(cardId: string): Promise<void> {
  // Get snaps separately to avoid cascade issues
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

    // Map SnapRAG to CardRAG
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

  // Update only the RAG status field to avoid cascade issues
  await this.cardRepository.update(cardId, { ragStatus: newRAG });
}
```

**Database**:
```sql
UPDATE cards
SET ragStatus = ?, updatedAt = NOW()
WHERE id = ?
```

**Business Rule BR-SNAP-007**: Card RAG mirrors latest snap's final RAG

**13. Return Snap with Relations** (Lines 156-168):
```typescript
console.log('[SnapService.create] Fetching snap with relations...');
const result = await this.snapRepository.findOne({
  where: { id: savedSnap.id },
  relations: ['card', 'createdBy'],
});

if (!result) {
  console.error('[SnapService.create] Failed to retrieve created snap:', savedSnap.id);
  throw new Error('Failed to retrieve created snap');
}

console.log('[SnapService.create] Snap creation successful');
return result;
```

**Response**:
```json
{
  "id": "uuid",
  "rawInput": "Completed API integration. Working on UI next. Blocked on design.",
  "done": "Completed API integration for user authentication",
  "toDo": "Working on UI development for login page",
  "blockers": "Waiting for design approval from design team",
  "suggestedRAG": "amber",
  "finalRAG": "red",
  "snapDate": "2025-01-20",
  "slotNumber": 1,
  "isLocked": false,
  "card": { ... },
  "createdBy": { ... },
  "createdAt": "2025-01-20T09:15:00Z",
  "updatedAt": "2025-01-20T09:15:00Z"
}
```

**UI Update**:
- Modal closes
- Success callback triggers parent page reload
- New snap appears in list
- Card status updates to IN_PROGRESS (if was NOT_STARTED)
- Card RAG badge updates based on snap's final RAG

**Error Handling**:
- If card not found: "Card not found"
- If card has no ET: "Card must have Estimated Time (ET) specified to create snap"
- If sprint not active: "Cannot create snaps for cards in non-Active sprints"
- If sprint closed: "Cannot create snaps after sprint closure"
- If invalid slot: "Invalid slot number. Sprint has N daily standup slot(s)..."
- If day locked: "Cannot create snaps for locked slot N..."
- If date out of range: "Snap date must be within sprint date range"

---

### Screen 3: Edit Snap Modal
**Component**: `F:\StandupSnap\frontend\src\components\snaps\EditSnapModal.tsx`
**Trigger**: Click edit icon on Snap Card (only if snap is from today and not locked)

#### UI Components
- **Modal Header**: "Edit Snap ({date})"
- **Lock Warning**: Yellow banner if snap is locked (prevents edits)
- **Yesterday's Snap Context**: Shows yesterday's snap for reference (blue banner)
- **Older Snaps**: Collapsible section with older snaps history
- **Form Fields**:
  - **Raw Input** textarea (required)
  - **Regenerate Checkbox**: "Regenerate using Standup Snap" (triggers AI re-parse)
  - **Done** textarea (hidden if regenerate checked)
  - **To Do** textarea (hidden if regenerate checked)
  - **Blockers** textarea (hidden if regenerate checked)
  - **Suggested RAG** dropdown (hidden if regenerate checked)
  - **Final RAG** dropdown (hidden if regenerate checked)
- **Action Buttons**: "Cancel", "Save Changes"

#### User Actions

##### Action 1: Edit Snap (M8-UC02)

**What happens**: Update snap with new values, optionally re-parse with AI

**Conditions**:
- Snap must be from today
- Snap must not be locked
- Day must not be locked
- Sprint must be Active
- User must be snap creator (or have EDIT_ANY_SNAP permission)

**Frontend Flow**:
1. Form pre-filled with current snap data
2. User can edit rawInput and/or structured fields
3. User can check "Regenerate" to re-run AI parsing
4. On submit, calls `snapsApi.update()`

**API Call**:
```http
PATCH /api/snaps/:id
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "rawInput": "Updated text",
  "done": "Updated done section",
  "toDo": "Updated todo section",
  "blockers": "Updated blockers",
  "suggestedRAG": "green",
  "finalRAG": "amber",
  "regenerate": false  // If true, AI re-parses rawInput
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\snap\snap.controller.ts` - `@Patch(':id')` (Lines 97-105)
- **Permission**: `EDIT_OWN_SNAP` or `EDIT_ANY_SNAP`
- **Service**: `F:\StandupSnap\backend\src\snap\snap.service.ts` - `update()` (Lines 202-271)

**Update Flow** (Lines 202-271):

**1. Extract DTO and Find Snap** (Lines 203-213):
```typescript
const { regenerate, ...updateData } = updateSnapDto;

const snap = await this.snapRepository.findOne({
  where: { id },
  relations: ['card', 'card.sprint'],
});

if (!snap) {
  throw new NotFoundException('Snap not found');
}
```

**2. Validate Ownership** (Lines 215-220):
```typescript
if (snap.createdById !== userId) {
  // Note: Permission check should be done in controller with PermissionsGuard
  // This is additional validation
  throw new ForbiddenException('You can only edit your own snaps');
}
```

**Business Rule BR-SNAP-008**: Users can only edit their own snaps (unless EDIT_ANY_SNAP permission)

**3. Validate Snap is from Today** (Lines 222-228):
```typescript
const today = new Date().toISOString().split('T')[0];
const snapDateStr = new Date(snap.snapDate).toISOString().split('T')[0];

if (snapDateStr !== today) {
  throw new BadRequestException('Only today\'s snaps can be edited');
}
```

**Business Rule BR-SNAP-009**: Only today's snaps can be edited

**4. Validate Snap is Not Locked** (Lines 230-233):
```typescript
if (snap.isLocked) {
  throw new BadRequestException('Cannot edit locked snaps');
}
```

**5. Validate Daily Lock Not Applied** (Lines 235-239):
```typescript
const isLocked = await this.isDayLocked(snap.card.sprint.id, today, snap.slotNumber);
if (isLocked) {
  throw new BadRequestException(`Cannot edit snaps after slot ${snap.slotNumber} has been locked`);
}
```

**Business Rule BR-SNAP-010**: Cannot edit after daily lock

**6. Validate Sprint is Active** (Lines 241-244):
```typescript
if (snap.card.sprint.status !== SprintStatus.ACTIVE) {
  throw new BadRequestException('Cannot edit snaps for cards in non-Active sprints');
}
```

**7. Handle Regenerate Flag** (Lines 246-257):
```typescript
if (regenerate && updateData.rawInput) {
  const parsedData = await this.parseSnapWithAI(updateData.rawInput, snap.card);
  updateData.done = parsedData.done;
  updateData.toDo = parsedData.toDo;
  updateData.blockers = parsedData.blockers;
  updateData.suggestedRAG = parsedData.suggestedRAG;
  // Keep finalRAG as user's override, or use suggested if not set
  if (!updateData.finalRAG) {
    updateData.finalRAG = parsedData.suggestedRAG;
  }
}
```

**Business Rule BR-SNAP-011**: Regenerate re-runs AI parsing, preserving finalRAG override if set

**8. Update Snap** (Lines 259-261):
```typescript
Object.assign(snap, updateData);
const updatedSnap = await this.snapRepository.save(snap);
```

**Database**:
```sql
UPDATE snaps
SET
  rawInput = ?,
  done = ?,
  toDo = ?,
  blockers = ?,
  suggestedRAG = ?,
  finalRAG = ?,
  updatedAt = NOW()
WHERE id = ?
```

**9. Recalculate Card RAG** (Line 264):
```typescript
await this.updateCardRAG(snap.cardId);
```

**10. Return Updated Snap** (Lines 267-270):
```typescript
return this.snapRepository.findOne({
  where: { id: updatedSnap.id },
  relations: ['card', 'createdBy'],
});
```

**Response**: Updated snap with relations

**UI Update**:
- Modal closes
- Snap card updates with new content
- Card RAG may update if snap's finalRAG changed

**Error Handling**:
- If snap not found: "Snap not found"
- If not owner: "You can only edit your own snaps"
- If not today: "Only today's snaps can be edited"
- If locked: "Cannot edit locked snaps"
- If day locked: "Cannot edit snaps after slot N has been locked"
- If sprint not active: "Cannot edit snaps for cards in non-Active sprints"

---

##### Action 2: Delete Snap (M8-UC03)

**What happens**: Permanently delete snap

**Conditions**:
- Same as edit: today's snap, not locked, Active sprint, owner

**Frontend**:
1. Click delete icon (trash can)
2. Confirmation dialog: "Are you sure? This action cannot be undone."
3. User confirms
4. Calls `snapsApi.delete()`

**API Call**:
```http
DELETE /api/snaps/:id
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\snap\snap.controller.ts` - `@Delete(':id')` (Lines 113-118)
- **Permission**: `DELETE_OWN_SNAP` or `DELETE_ANY_SNAP`
- **Service**: `F:\StandupSnap\backend\src\snap\snap.service.ts` - `remove()` (Lines 278-325)

**Delete Flow** (Lines 278-325):

**Validation Steps** (same as edit):
1. Find snap with relations
2. Validate ownership
3. Validate snap is from today
4. Validate snap not locked
5. Validate daily lock not applied
6. Validate sprint is Active

**Delete Logic** (Lines 318-324):
```typescript
const cardId = snap.cardId;

// 7. Delete snap
await this.snapRepository.remove(snap);

// 8. Recalculate card RAG after deletion
await this.updateCardRAG(cardId);
```

**Database**:
```sql
DELETE FROM snaps WHERE id = ?
```

**Response**: 204 No Content

**UI Update**:
- Snap card disappears from list
- Card RAG recalculates (may change if deleted snap was latest)
- If last snap for card, card may show RAG = RED (no recent updates)

---

## THE DAILY LOCK MECHANISM

### Overview

Daily lock is a critical feature that:
1. **Prevents tampering** with historical standup data
2. **Triggers summary generation** for reporting
3. **Enforces audit trail** for compliance
4. **Enables trend analysis** with immutable data

### Lock Levels

**Two-Tier Lock System**:
1. **Day-Level Lock**: Locks all slots for entire day
2. **Slot-Level Lock**: Locks specific standup slot (e.g., Slot 1)

### Lock Trigger (M8-UC04)

**Who Can Lock**: SM (Scrum Master) only - `LOCK_DAILY_SNAPS` permission

**When to Lock**:
- End of day (after all standups completed)
- Before generating daily report
- Manual trigger by SM

**Frontend**:
- **Location**: Daily Snaps Page, date selector area
- **Button**: "Lock Snaps for Today" (orange background)
- **Condition**: Only appears if:
  - Day not already locked
  - Snaps exist for selected date
  - User has LOCK_DAILY_SNAPS permission

**Confirmation Dialog**:
```
Lock all snaps for {date}?

This will prevent further edits and generate the daily summary.
```

**API Call**:
```http
POST /api/snaps/lock-daily
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "sprintId": "uuid",
  "lockDate": "2025-01-20"
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\snap\snap.controller.ts` - `@Post('lock-daily')` (Lines 126-130)
- **Permission**: `LOCK_DAILY_SNAPS`
- **Service**: `F:\StandupSnap\backend\src\snap\snap.service.ts` - `lockDailySnaps()` (Lines 403-451)

### Lock Process Flow (Lines 403-451)

**1. Validate Sprint** (Lines 406-410):
```typescript
const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });
if (!sprint) {
  throw new NotFoundException('Sprint not found');
}
```

**2. Validate Sprint Not Closed** (Lines 412-415):
```typescript
if (sprint.isClosed) {
  throw new BadRequestException('Cannot lock snaps for closed sprints');
}
```

**Business Rule BR-SNAP-012**: Cannot lock snaps after sprint is closed

**3. Check if Already Locked** (Lines 417-427):
```typescript
const existingLock = await this.lockRepository
  .createQueryBuilder('lock')
  .where('lock.sprintId = :sprintId', { sprintId })
  .andWhere('lock.lockDate = :lockDate', { lockDate })
  .getOne();

if (existingLock) {
  throw new BadRequestException('Daily snaps for this date are already locked');
}
```

**Business Rule BR-SNAP-013**: Cannot lock same day twice

**4. Get All Snaps for Date** (Line 429):
```typescript
const snaps = await this.findBySprintAndDate(sprintId, lockDate);
```

**5. Lock All Snaps** (Lines 431-435):
```typescript
for (const snap of snaps) {
  snap.isLocked = true;
}
await this.snapRepository.save(snaps);
```

**Database**:
```sql
UPDATE snaps
SET isLocked = true, updatedAt = NOW()
WHERE snapDate = ?
  AND card_id IN (SELECT id FROM cards WHERE sprint_id = ?)
```

**6. Create Lock Record** (Lines 437-445):
```typescript
const lock = this.lockRepository.create({
  sprintId,
  lockDate: new Date(lockDate),
  lockedById: userId,
  isAutoLocked: false,
});

const savedLock = await this.lockRepository.save(lock);
```

**Database**:
```sql
INSERT INTO daily_snap_locks (
  id, sprint_id, lockDate, locked_by, isAutoLocked, createdAt
) VALUES (
  gen_random_uuid(), ?, ?, ?, false, NOW()
) RETURNING *
```

**7. Generate Daily Summary** (Lines 447-448):
```typescript
await this.generateDailySummary(sprintId, lockDate);
```

**Response**: Lock record object

**UI Update**:
- Lock badge appears: "🔒 Day Locked"
- "Lock Snaps" button disappears
- All snap edit/delete buttons disappear
- Summary view becomes available
- Success alert: "Daily snaps locked successfully and summary generated!"

### Auto-Lock Feature

**Location**: `F:\StandupSnap\backend\src\snap\snap.service.ts` Lines 456-495

**Purpose**: Automatically lock snaps at end of day (via scheduler)

**Trigger**: Cron job or scheduled task (not shown in code, would be in separate scheduler module)

**Logic** (Lines 456-495):
```typescript
async autoLockDailySnaps(sprintId: string, lockDate: string): Promise<void> {
  // 1. Validate sprint
  const sprint = await this.sprintRepository.findOne({ where: { id: sprintId } });
  if (!sprint || sprint.isClosed) {
    return; // Skip if sprint not found or closed
  }

  // 2. Check if already locked
  const existingLock = await this.lockRepository
    .createQueryBuilder('lock')
    .where('lock.sprintId = :sprintId', { sprintId })
    .andWhere('lock.lockDate = :lockDate', { lockDate })
    .getOne();

  if (existingLock) {
    return; // Already locked
  }

  // 3. Get all snaps for this date
  const snaps = await this.findBySprintAndDate(sprintId, lockDate);

  // 4. Lock all snaps
  for (const snap of snaps) {
    snap.isLocked = true;
  }
  await this.snapRepository.save(snaps);

  // 5. Create lock record (no user)
  const lock = this.lockRepository.create({
    sprintId,
    lockDate: new Date(lockDate),
    lockedById: null,  // Auto-lock, no user
    isAutoLocked: true,
  });

  await this.lockRepository.save(lock);

  // 6. Generate daily summary
  await this.generateDailySummary(sprintId, lockDate);
}
```

**Differences from Manual Lock**:
- `lockedById` is NULL (no user)
- `isAutoLocked` is TRUE
- No permission check (system action)
- Silent (no UI notification)

**Business Rule BR-SNAP-014**: Auto-lock runs for all Active sprints at end of day

---

## DAILY SUMMARY GENERATION

### Overview

Daily Summary aggregates all snaps for a date into:
- Consolidated Done/ToDo/Blockers sections
- RAG breakdown (card-level, assignee-level, sprint-level)
- Structured data by team member

### Summary Trigger (M8-UC05)

**Automatic**: After daily lock (manual or auto)
**Manual**: SM can trigger via "Generate Summary" button

**API Call**:
```http
POST /api/snaps/generate-summary
Content-Type: application/json
Authorization: Bearer {accessToken}

{
  "sprintId": "uuid",
  "date": "2025-01-20"
}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\snap\snap.controller.ts` - `@Post('generate-summary')` (Lines 153-157)
- **Permission**: `GENERATE_SUMMARY` (SM only)
- **Service**: `F:\StandupSnap\backend\src\snap\snap.service.ts` - `generateDailySummary()` (Lines 503-618)

### Summary Generation Algorithm (Lines 503-618)

**THE COMPLETE FLOW**:

**1. Check if Summary Already Exists** (Lines 504-513):
```typescript
const existing = await this.summaryRepository
  .createQueryBuilder('summary')
  .where('summary.sprintId = :sprintId', { sprintId })
  .andWhere('summary.summaryDate = :date', { date })
  .getOne();

if (existing) {
  return existing; // Already generated
}
```

**2. Get All Snaps for Date** (Line 516):
```typescript
const snaps = await this.findBySprintAndDate(sprintId, date);
```

**3. Initialize Aggregation Structures** (Lines 518-524):
```typescript
// 3. Aggregate content
const doneItems: string[] = [];
const toDoItems: string[] = [];
const blockerItems: string[] = [];

// 4. Group by assignee for structure
const byAssignee = new Map<string, { name: string; snaps: Snap[] }>();
```

**4. Aggregate Content and Group by Assignee** (Lines 526-546):
```typescript
for (const snap of snaps) {
  const assigneeName = snap.card.assignee
    ? snap.card.assignee.fullName
    : 'Unassigned';

  if (!byAssignee.has(assigneeName)) {
    byAssignee.set(assigneeName, { name: assigneeName, snaps: [] });
  }
  byAssignee.get(assigneeName).snaps.push(snap);

  // Aggregate content
  if (snap.done) {
    doneItems.push(`[${snap.card.title}] ${snap.done}`);
  }
  if (snap.toDo) {
    toDoItems.push(`[${snap.card.title}] ${snap.toDo}`);
  }
  if (snap.blockers) {
    blockerItems.push(`[${snap.card.title}] ${snap.blockers}`);
  }
}
```

**Example Aggregation**:
```
doneItems = [
  "[User Authentication] Completed JWT integration and testing",
  "[Dashboard UI] Finished responsive layout for mobile devices",
  "[API Optimization] Reduced API response time by 40%"
]
```

**5. Calculate Card-Level RAG** (Lines 548-557):
```typescript
// 5. Calculate RAG overview
const cardRAG = { green: 0, amber: 0, red: 0 };
const assigneeRAG = { green: 0, amber: 0, red: 0 };

// Card-level RAG
for (const snap of snaps) {
  if (snap.finalRAG === SnapRAG.GREEN) cardRAG.green++;
  else if (snap.finalRAG === SnapRAG.AMBER) cardRAG.amber++;
  else if (snap.finalRAG === SnapRAG.RED) cardRAG.red++;
}
```

**6. Calculate Assignee-Level RAG (Worst-Case)** (Lines 559-574):
```typescript
// Assignee-level RAG (simplified: based on worst RAG for each assignee)
for (const [_, data] of byAssignee) {
  let worstRAG = SnapRAG.GREEN;
  for (const snap of data.snaps) {
    if (snap.finalRAG === SnapRAG.RED) {
      worstRAG = SnapRAG.RED;
      break;
    } else if (snap.finalRAG === SnapRAG.AMBER) {
      worstRAG = SnapRAG.AMBER;
    }
  }

  if (worstRAG === SnapRAG.GREEN) assigneeRAG.green++;
  else if (worstRAG === SnapRAG.AMBER) assigneeRAG.amber++;
  else if (worstRAG === SnapRAG.RED) assigneeRAG.red++;
}
```

**Business Rule BR-SNAP-015**: Assignee RAG is worst RAG among their snaps

**7. Calculate Sprint-Level RAG** (Lines 576-589):
```typescript
// Sprint-level RAG (based on which color outnumbers the other two combined)
let sprintLevel = 'green';
if (cardRAG.red > cardRAG.green + cardRAG.amber) {
  sprintLevel = 'red';
} else if (cardRAG.amber > cardRAG.green + cardRAG.red) {
  sprintLevel = 'amber';
} else if (cardRAG.green > cardRAG.amber + cardRAG.red) {
  sprintLevel = 'green';
} else {
  // If no clear majority, default to the worst status present
  if (cardRAG.red > 0) sprintLevel = 'red';
  else if (cardRAG.amber > 0) sprintLevel = 'amber';
  else sprintLevel = 'green';
}
```

**Business Rule BR-SNAP-016**: Sprint RAG Logic
- If RED cards > (GREEN + AMBER), sprint is RED
- Else if AMBER cards > (GREEN + RED), sprint is AMBER
- Else if GREEN cards > (AMBER + RED), sprint is GREEN
- Else (tie): Worst-case logic applies (RED > AMBER > GREEN)

**8. Create Summary Entity** (Lines 591-616):
```typescript
// 6. Create summary
const summary = this.summaryRepository.create({
  sprintId,
  summaryDate: new Date(date),
  done: doneItems.join('\n'),
  toDo: toDoItems.join('\n'),
  blockers: blockerItems.join('\n'),
  ragOverview: {
    cardLevel: cardRAG,
    assigneeLevel: assigneeRAG,
    sprintLevel,
  },
  fullData: {
    byAssignee: Array.from(byAssignee.entries()).map(([name, data]) => ({
      assignee: name,
      snaps: data.snaps.map((s) => ({
        cardTitle: s.card.title,
        done: s.done,
        toDo: s.toDo,
        blockers: s.blockers,
        rag: s.finalRAG,
      })),
    })),
  },
});

return this.summaryRepository.save(summary);
```

**Database**:
```sql
INSERT INTO daily_summaries (
  id, sprint_id, summaryDate,
  done, toDo, blockers, ragOverview, fullData,
  createdAt
) VALUES (
  gen_random_uuid(), ?, ?,
  ?, ?, ?, ?::jsonb, ?::jsonb,
  NOW()
) RETURNING *
```

**Example Summary Record**:
```json
{
  "id": "uuid",
  "sprintId": "uuid",
  "summaryDate": "2025-01-20",
  "done": "[User Auth] Completed JWT integration\n[Dashboard] Finished mobile layout\n[API] Reduced response time by 40%",
  "toDo": "[User Auth] Will add refresh token logic\n[Dashboard] Planning chart integration\n[API] Will optimize database queries",
  "blockers": "[Dashboard] Waiting for chart library approval\n[API] Database migration pending DBA review",
  "ragOverview": {
    "cardLevel": { "green": 5, "amber": 3, "red": 1 },
    "assigneeLevel": { "green": 2, "amber": 2, "red": 1 },
    "sprintLevel": "amber"
  },
  "fullData": {
    "byAssignee": [
      {
        "assignee": "John Doe",
        "snaps": [
          {
            "cardTitle": "User Authentication",
            "done": "Completed JWT integration and testing",
            "toDo": "Will add refresh token logic",
            "blockers": "",
            "rag": "green"
          }
        ]
      }
    ]
  },
  "createdAt": "2025-01-20T18:00:00Z"
}
```

**Response**: Complete summary object

**UI Update** (Summary View):
- Summary View tab becomes enabled
- RAG Overview displays with colored badges
- Done section displays line-by-line
- ToDo section displays line-by-line
- Blockers section displays line-by-line (highlighted in red)
- Detailed breakdown available in collapsible section
- "Download Summary" button becomes available

---

## MULTI-SLOT STANDUP SUPPORT

### Overview

Multi-slot standups allow sprints to have multiple standup meetings per day:
- **Slot 1**: Morning standup (9:00 AM)
- **Slot 2**: Afternoon standup (2:00 PM)
- **Slot 3**: EOD standup (5:00 PM)

**Configured in Sprint**: `dailyStandupCount` field (1-3)

### Slot Selection

**Location**: Create Snap Modal, slot dropdown

**UI**:
```html
<select>
  <option value="1">Slot 1 (Standup 1)</option>
  <option value="2">Slot 2 (Standup 2)</option>
  <option value="3">Slot 3 (Standup 3)</option>
</select>
```

**Business Rule BR-SNAP-003**: Slot number must be within 1 to `sprint.dailyStandupCount`

**Validation** (Lines 97-101 in snap.service.ts):
```typescript
const maxSlots = card.sprint.dailyStandupCount || 1;
if (slotNumber < 1 || slotNumber > maxSlots) {
  throw new BadRequestException(`Invalid slot number. Sprint has ${maxSlots} daily standup slot(s). Please select a slot between 1 and ${maxSlots}.`);
}
```

### Slot-Specific Locking

**Lock Levels**:
1. **Entire Day Lock**: `slotNumber = null` → All slots locked
2. **Slot-Specific Lock**: `slotNumber = 1` → Only Slot 1 locked

**Lock Check Logic** (Lines 726-750):
```typescript
async isDayLocked(sprintId: string, date: string, slotNumber?: number): Promise<boolean> {
  const targetDate = new Date(date);

  // Check if entire day is locked (slotNumber = null)
  const dayLock = await this.dailyLockRepository.findOne({
    where: { sprint: { id: sprintId }, date: targetDate, slotNumber: IsNull() },
  });

  if (dayLock && dayLock.isLocked) {
    return true; // Entire day is locked
  }

  // If checking specific slot, also check slot-level lock
  if (slotNumber !== undefined) {
    const slotLock = await this.dailyLockRepository.findOne({
      where: { sprint: { id: sprintId }, date: targetDate, slotNumber },
    });

    if (slotLock && slotLock.isLocked) {
      return true; // This specific slot is locked
    }
  }

  return false;
}
```

**Business Rule BR-SNAP-017**: Day lock supersedes slot locks

**Use Case**:
- Morning standup (Slot 1) can be locked at 10 AM
- Afternoon standup (Slot 2) remains editable until 3 PM
- EOD standup (Slot 3) remains editable until end of day
- At midnight, entire day locked automatically

### Slot Display

**Snap Card**:
- Shows slot number badge: "Slot 1", "Slot 2", "Slot 3"
- Color-coded by slot

**Daily Summary**:
- Aggregates across all slots
- Does not distinguish by slot in final summary

---

## RAG STATUS SYSTEM (Advanced)

### AI-Suggested RAG (parseSnapWithAI)

**Location**: Lines 757-800 in prompt, Lines 844-858 in parsing

**Criteria in Prompt**:
```
RAG STATUS:
- green: Good progress, no issues, on track
- amber: Minor delays, dependencies, or small issues
- red: Major blockers, stuck, significant problems
```

**AI Considers**:
1. **Blockers Presence**: Any blockers → likely AMBER or RED
2. **Blocker Severity**: Keywords like "critical", "blocked", "urgent" → RED
3. **Progress**: Done items present → likely GREEN
4. **Lack of Progress**: No done, only todo → AMBER
5. **Tone**: Negative language → AMBER/RED, Positive → GREEN

**Example Mappings**:
| Input | AI Suggested RAG | Reasoning |
|-------|------------------|-----------|
| "Completed all tasks, ready for review" | GREEN | Positive progress, no issues |
| "Working on feature, waiting for design" | AMBER | Dependency/blocker |
| "Stuck on bug for 3 days, blocked" | RED | Severe blocker, stuck |
| "Made good progress, minor styling issues" | GREEN | Overall positive despite minor issue |
| "No progress today" | AMBER | Lack of progress |

### User Override (finalRAG)

**Purpose**: SM can override AI suggestion based on context

**When to Override**:
- AI underestimates severity (suggest GREEN, but blocker is critical)
- AI overestimates severity (suggest RED, but blocker will resolve soon)
- Additional context not in snap text (offline discussion resolved issue)

**UI**:
- "Override RAG Status" dropdown
- Default: "Keep suggested"
- Options: Green, Amber, Red

**Backend Handling**:
```typescript
finalRAG: finalRAG || parsedData?.suggestedRAG || null
```

**Business Rule BR-SNAP-018**: finalRAG takes precedence over suggestedRAG for card RAG calculation

### Advanced RAG Calculation (calculateSystemRAG)

**Location**: Lines 962-998 in snap.service.ts

**This is an ADVANCED RAG algorithm (currently not used, but available)**

**Factors Considered**:
1. **Timeline Deviation** (Lines 1004-1032):
   - Compare card progress vs expected timeline
   - Formula: `((daysElapsed * 8 - ET) / ET) * 100`
   - > 30% deviation → RED
   - 1-30% deviation → AMBER
   - On schedule → GREEN

2. **Consecutive Days Without Done** (Lines 1037-1054):
   - Track days since last "Done" item
   - >= 2 days → RED
   - 1 day → AMBER
   - Recent done → GREEN

3. **Blocker Severity** (Lines 1059-1076):
   - Severe keywords: "blocked", "critical", "urgent", "severe", "major", "cannot proceed", "showstopper", "production down", "client escalation"
   - Severe blocker present → RED
   - Any blocker present → AMBER
   - No blockers → GREEN

**Algorithm** (Lines 974-997):
```typescript
// RED conditions:
if (consecutiveDaysWithoutDone >= 2) {
  return SnapRAG.RED; // No Done for 2+ days
}
if (timelineDeviation > 30) {
  return SnapRAG.RED; // Major delay (>30%)
}
if (hasBlockers && this.isSevereBlocker(snap.blockers)) {
  return SnapRAG.RED; // Severe blockers
}

// AMBER conditions:
if (timelineDeviation > 0 && timelineDeviation <= 30) {
  return SnapRAG.AMBER; // Minor delay (<30%)
}
if (hasBlockers) {
  return SnapRAG.AMBER; // Any blockers present
}
if (!hasDone) {
  return SnapRAG.AMBER; // No progress today
}

// GREEN: On track
return SnapRAG.GREEN;
```

**Business Rule BR-SNAP-019**: Advanced RAG combines multiple signals for comprehensive health assessment

**Note**: Currently, card RAG simply mirrors latest snap's finalRAG (Lines 940-951). Advanced calculation available for future enhancement.

---

## COMPLETE USER JOURNEY

### End-to-End Snap Creation Flow

**Step-by-Step Journey**:

**1. User Opens Daily Snaps Page**
- Navigate to `/snaps/:sprintId`
- Page loads today's date by default
- See all cards grouped by assignee

**2. User Sees Card List**
- Each assignee section shows their cards
- Cards display: title, description, ET, RAG status
- "No snap recorded for today" for cards without snaps

**3. User Selects Card**
- Click "Add Snap" button on desired card
- Create Snap Modal opens

**4. User Sees Past Context (if available)**
- Yesterday's snap shown in blue banner (Done/ToDo/Blockers/RAG)
- Older snaps available in collapsible section
- Helps maintain continuity

**5. User Enters Free-Form Text**
- Type natural language update in textarea
- Example: "Completed API integration. Working on UI next. Waiting for design approval."
- Select standup slot (if multi-slot enabled)

**6. User Clicks "Generate Snap"**
- Frontend sets loading state
- POST /api/snaps/parse called

**7. Frontend Sends Request to Backend**
```http
POST /api/snaps/parse
{
  "cardId": "uuid",
  "rawInput": "Completed API integration. Working on UI next. Waiting for design approval."
}
```

**8. Backend Validates Request**
- Extract cardId and rawInput
- Find card in database
- Validate card exists

**9. Backend Calls Groq API**
- Build AI prompt with context (card title + user input)
- Call Groq API with llama-3.3-70b-versatile model
- Request: OpenAI-compatible chat completions
- Headers: Authorization Bearer token
- Temperature: 0.3 (consistent output)
- Max tokens: 500

**10. Groq AI Processes Request**
- Analyze input text
- Understand task context (card title)
- Categorize sentences into Done/ToDo/Blockers
- Rephrase into professional standup language
- Assess overall status for RAG
- Return JSON response (typically <1 second)

**11. Groq Returns Parsed Response**
```json
{
  "done": "Completed API integration for user authentication and tested all endpoints",
  "toDo": "Working on UI development for login page and dashboard",
  "blockers": "Waiting for design approval from design team on color scheme",
  "suggestedRAG": "amber"
}
```

**12. Backend Receives Groq Response**
- Extract JSON from response content
- Handle edge cases (no JSON, malformed JSON)
- Map RAG string to enum (green/amber/red)
- If parsing fails → fallback to manualParse()

**13. Backend Returns ParsedSnapData**
```json
{
  "done": "Completed API integration for user authentication and tested all endpoints",
  "toDo": "Working on UI development for login page and dashboard",
  "blockers": "Waiting for design approval from design team on color scheme",
  "suggestedRAG": "amber"
}
```

**14. Frontend Receives Parsed Data**
- Loading spinner disappears
- Modal transitions to Step 2 (review mode)

**15. UI Updates with Parsed Snap**
- Success banner: "✓ Snap Generated! Review and edit below, then save."
- Original input shown in gray box
- Done field pre-filled (editable)
- ToDo field pre-filled (editable)
- Blockers field pre-filled (editable)
- Suggested RAG dropdown shows "Amber"
- Override RAG dropdown shows "Keep suggested"

**16. User Reviews Output**
- Read AI-generated sections
- Verify accuracy and completeness
- Make edits if needed (typo fixes, additional detail, rephrasing)

**17. User Optionally Overrides RAG**
- If user disagrees with AI's "Amber", can select "Red" or "Green"
- Example: Blocker will be resolved tomorrow → override to Green

**18. User Clicks "Save Snap"**
- Frontend sets loading state
- POST /api/snaps called

**19. Frontend Sends Create Request**
```http
POST /api/snaps
{
  "cardId": "uuid",
  "rawInput": "Completed API integration. Working on UI next. Waiting for design approval.",
  "slotNumber": 1,
  "done": "Completed API integration for user authentication and tested all endpoints",
  "toDo": "Working on UI development for login page and dashboard",
  "blockers": "Waiting for design approval from design team on color scheme",
  "suggestedRAG": "amber",
  "finalRAG": "green"  // User overrode to green
}
```

**20. Backend Validates Snap Creation**
- Validate card exists
- Validate card has ET
- Validate sprint is Active and not closed
- Validate slot number within range
- Validate day/slot not locked
- Validate snap date within sprint range

**21. Backend Creates Snap Entity**
- Create snap record with all fields
- snapDate = today
- isLocked = false
- createdBy = current user
- All parsed sections stored

**22. Backend Saves Snap to Database**
```sql
INSERT INTO snaps (...) VALUES (...)
```

**23. Backend Updates Card Status (if NOT_STARTED)**
- Check if card status = NOT_STARTED
- If yes, update to IN_PROGRESS
```sql
UPDATE cards SET status = 'in_progress' WHERE id = ? AND status = 'not_started'
```

**24. Backend Recalculates Card RAG**
- Get all snaps for card (ordered by date DESC)
- Filter to recent snaps (last 7 days)
- If no recent snaps → RAG = RED
- Else → RAG = latest snap's finalRAG
- Map SnapRAG (GREEN/AMBER/RED) to CardRAG (GREEN/AMBER/RED)
```sql
UPDATE cards SET ragStatus = ? WHERE id = ?
```

**25. Backend Returns Snap with Relations**
```json
{
  "id": "uuid",
  "rawInput": "...",
  "done": "...",
  "toDo": "...",
  "blockers": "...",
  "suggestedRAG": "amber",
  "finalRAG": "green",
  "snapDate": "2025-01-20",
  "slotNumber": 1,
  "isLocked": false,
  "card": { "id": "...", "title": "...", "status": "in_progress", "ragStatus": "green", ... },
  "createdBy": { "id": "...", "username": "...", ... },
  "createdAt": "2025-01-20T09:15:00Z",
  "updatedAt": "2025-01-20T09:15:00Z"
}
```

**26. Frontend Receives Success Response**
- Modal closes automatically
- Success callback triggered

**27. Parent Page Reloads Data**
- Calls loadDailyData()
- Fetches updated snaps list
- Fetches updated card (with new status and RAG)

**28. UI Reflects Changes**
- New snap appears in "Today's Snaps" section under card
- Snap displays with:
  - Done section (green border)
  - ToDo section (blue border)
  - Blockers section (red border)
  - RAG badge (green in this case)
  - Edit/Delete buttons (enabled since it's today's snap)
- Card RAG badge updates to green (if was different before)
- Card status badge updates to "In Progress" (if was "Not Started")
- Snap count increases on card

**29. Success Message Displayed**
- Toast notification: "Snap created successfully!" (implicit from modal close)
- User sees immediate feedback

**30. End of Journey**
- User can create another snap for a different card
- User can view/edit the snap just created
- User can lock the day when all standups complete
- User can generate daily summary

---

## API Endpoints Reference

### Snap Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| **POST** | `/api/snaps` | `CREATE_SNAP` | Create snap (M8-UC01) |
| **POST** | `/api/snaps/parse` | `CREATE_SNAP` | Parse text with AI (M8-UC01) |
| **GET** | `/api/snaps/:id` | `VIEW_SNAP` | Get snap by ID |
| **GET** | `/api/snaps/card/:cardId` | `VIEW_SNAP` | Get all snaps for card |
| **GET** | `/api/snaps/sprint/:sprintId/date/:date` | `VIEW_SNAP` | Get snaps for sprint/date |
| **PATCH** | `/api/snaps/:id` | `EDIT_OWN_SNAP` or `EDIT_ANY_SNAP` | Update snap (M8-UC02) |
| **DELETE** | `/api/snaps/:id` | `DELETE_OWN_SNAP` or `DELETE_ANY_SNAP` | Delete snap (M8-UC03) |
| **POST** | `/api/snaps/lock-daily` | `LOCK_DAILY_SNAPS` | Lock daily snaps (M8-UC04) |
| **GET** | `/api/snaps/summary/:sprintId/:date` | `VIEW_SNAP` | Get daily summary (M8-UC05) |
| **POST** | `/api/snaps/generate-summary` | `GENERATE_SUMMARY` | Generate summary (M8-UC05) |
| **GET** | `/api/snaps/is-locked/:sprintId/:date` | `VIEW_SNAP` | Check lock status |
| **GET** | `/api/snaps/summaries/project/:projectId` | `VIEW_SNAP` | Get summaries by project |

---

## Business Rules Summary

| Rule ID | Description | Location |
|---------|-------------|----------|
| **BR-SNAP-001** | Card must have ET before snaps can be created | Lines 82-85 |
| **BR-SNAP-002** | Cannot create snaps in non-Active or closed sprints | Lines 87-94 |
| **BR-SNAP-003** | Slot number must be within sprint's configured slots | Lines 97-101 |
| **BR-SNAP-004** | Cannot create snaps for locked days/slots | Lines 103-107 |
| **BR-SNAP-005** | Snap date must fall within sprint date range | Lines 109-116 |
| **BR-SNAP-006** | First snap for NOT_STARTED card auto-transitions to IN_PROGRESS | Lines 145-149 |
| **BR-SNAP-007** | Card RAG mirrors latest snap's final RAG | Lines 940-951 |
| **BR-SNAP-008** | Users can only edit their own snaps (unless EDIT_ANY_SNAP) | Lines 215-220 |
| **BR-SNAP-009** | Only today's snaps can be edited | Lines 222-228 |
| **BR-SNAP-010** | Cannot edit after daily lock | Lines 235-239 |
| **BR-SNAP-011** | Regenerate re-runs AI parsing, preserving finalRAG override | Lines 246-257 |
| **BR-SNAP-012** | Cannot lock snaps after sprint is closed | Lines 412-415 |
| **BR-SNAP-013** | Cannot lock same day twice | Lines 417-427 |
| **BR-SNAP-014** | Auto-lock runs for all Active sprints at end of day | Lines 456-495 |
| **BR-SNAP-015** | Assignee RAG is worst RAG among their snaps | Lines 559-574 |
| **BR-SNAP-016** | Sprint RAG based on majority color, worst-case for ties | Lines 576-589 |
| **BR-SNAP-017** | Day lock supersedes slot locks | Lines 726-750 |
| **BR-SNAP-018** | finalRAG takes precedence over suggestedRAG | Line 134 |
| **BR-SNAP-019** | Advanced RAG combines timeline, days without progress, blockers | Lines 974-997 |

---

## Error Handling

### Common Errors

| HTTP Status | Error Message | Cause |
|-------------|---------------|-------|
| **404** | Card not found | Invalid card ID |
| **404** | Sprint not found | Invalid sprint ID |
| **404** | Snap not found | Invalid snap ID |
| **400** | Card must have Estimated Time (ET) specified | Card missing ET |
| **400** | Cannot create snaps for cards in non-Active sprints | Sprint not Active |
| **400** | Cannot create snaps after sprint closure | Sprint is closed |
| **400** | Invalid slot number. Sprint has N slot(s)... | Slot number out of range |
| **400** | Cannot create snaps for locked slot N... | Day/slot is locked |
| **400** | Snap date must be within sprint date range | Date outside sprint range |
| **403** | You can only edit your own snaps | Not snap creator |
| **400** | Only today's snaps can be edited | Attempting to edit past snap |
| **400** | Cannot edit locked snaps | Snap is locked |
| **400** | Cannot edit snaps after slot N has been locked | Day is locked |
| **400** | Only today's snaps can be deleted | Attempting to delete past snap |
| **400** | Cannot delete locked snaps | Snap is locked |
| **400** | Cannot lock snaps for closed sprints | Sprint is closed |
| **400** | Daily snaps for this date are already locked | Day already locked |
| **404** | Daily summary not found for this date | Summary not generated |

---

## Performance Considerations

### AI API Call Optimization

**Groq Performance**:
- ⚡ Average response time: 500ms - 1.5s
- 🔥 Peak throughput: 100+ requests/second
- 💰 Free tier: 30 requests/minute
- 📊 Paid tier: Higher rate limits

**Optimization Techniques**:
1. **Two-Step Flow**: Parse first, review, then save (allows user to abort)
2. **Caching**: Could cache common phrases (future enhancement)
3. **Fallback**: Manual parsing if AI fails (no user disruption)
4. **Async Processing**: Non-blocking API calls

### Database Query Optimization

**Snaps by Sprint/Date Query**:
- Uses `createQueryBuilder` for efficient filtering
- `leftJoinAndSelect` for eager loading (avoids N+1)
- Indexed fields: `card_id`, `snapDate`, `slotNumber`
- Compound index: `(snapDate, card_id)` for fast date queries

**RAG Calculation**:
- Only updates `ragStatus` field (avoids full entity update)
- Filters to recent snaps (7 days) before processing
- No cascade saves, targeted updates only

### Caching Opportunities

**Potential Optimizations**:
- Cache daily summaries (invalidate on new snap)
- Cache lock status per day (invalidate on lock)
- Cache recent snaps per card (invalidate on create/update/delete)
- Redis for fast lock status checks

---

## Testing Scenarios

### Unit Tests

**Snap Service Tests**:
1. ✅ Create snap with AI parsing
2. ✅ Create snap with manual input (pre-parsed)
3. ✅ Reject snap creation for card without ET
4. ✅ Reject snap creation in closed sprint
5. ✅ Reject snap creation for invalid slot
6. ✅ Reject snap creation on locked day
7. ✅ Auto-transition card to IN_PROGRESS on first snap
8. ✅ Update card RAG after snap creation
9. ✅ Parse snap with AI successfully
10. ✅ Fallback to manual parsing on AI failure
11. ✅ Edit snap (valid)
12. ✅ Reject edit of past snap
13. ✅ Reject edit of locked snap
14. ✅ Edit snap with regenerate flag
15. ✅ Delete snap (valid)
16. ✅ Reject delete of past snap
17. ✅ Reject delete of locked snap
18. ✅ Lock daily snaps successfully
19. ✅ Reject duplicate lock
20. ✅ Auto-lock daily snaps (scheduled)
21. ✅ Generate daily summary
22. ✅ Calculate assignee-level RAG
23. ✅ Calculate sprint-level RAG

### Integration Tests

**End-to-End Flows**:
1. Create card → Create snap → Verify card status = IN_PROGRESS
2. Create snap → Verify card RAG updates
3. Create multiple snaps → Lock day → Verify all locked
4. Lock day → Generate summary → Verify aggregation
5. Create snap with blocker → Verify RAG = AMBER/RED
6. Edit snap → Change RAG → Verify card RAG updates
7. Delete snap → Verify card RAG recalculates
8. Multi-slot: Create snaps in Slot 1 and Slot 2 → Lock Slot 1 → Verify Slot 2 still editable
9. AI parsing: Various inputs → Verify correct categorization
10. Fallback parsing: Disconnect Groq → Verify manual parsing works

---

## Future Enhancements

### Planned Features

1. **Voice Input**:
   - Speech-to-text for snap creation
   - Mobile-friendly voice recording
   - Auto-transcribe and parse with AI

2. **Smart Templates**:
   - Pre-defined snap templates for common tasks
   - Auto-fill based on previous snaps
   - Contextual suggestions

3. **Snap Analytics**:
   - Frequency tracking per card
   - Average RAG trend over time
   - Blocker frequency analysis
   - Team member contribution metrics

4. **Advanced AI Features**:
   - Sentiment analysis
   - Blocker severity auto-classification
   - Action item extraction
   - Automatic follow-up reminder suggestions

5. **Collaboration Features**:
   - Comments on snaps
   - Tag team members in snaps
   - Snap reactions (👍, 🎉, ⚠️)
   - Threaded discussions

6. **Export & Reporting**:
   - PDF export of daily summaries
   - Weekly/monthly rollup reports
   - Custom report templates
   - Email digest of daily summaries

7. **Mobile Optimization**:
   - Native mobile app (React Native)
   - Push notifications for standup reminders
   - Offline snap creation with sync

8. **Integration Enhancements**:
   - Slack integration (post snaps to channel)
   - Microsoft Teams integration
   - Jira two-way sync
   - GitHub PR/Issue linking

9. **Improved RAG Logic**:
   - Machine learning model for RAG prediction
   - Historical pattern analysis
   - Velocity-based RAG adjustment
   - Team-specific RAG thresholds

10. **Accessibility**:
    - Screen reader optimization
    - Keyboard navigation shortcuts
    - High contrast mode
    - Text-to-speech for summaries

---

## Conclusion

The Snaps module is **THE SIGNATURE FEATURE** of StandupSnap, transforming daily standup updates from tedious structured forms into natural, AI-powered conversations. It provides:

- ✅ **Free-Form Input**: Natural language, no rigid forms
- ✅ **AI-Powered Parsing**: Groq API with llama-3.3-70b-versatile
- ✅ **Intelligent RAG**: AI-suggested status with human override
- ✅ **Daily Lock**: Immutable historical record
- ✅ **Multi-Slot Support**: Multiple standups per day
- ✅ **Automatic Summaries**: Aggregated team updates
- ✅ **Deep Integration**: Card status and RAG auto-update
- ✅ **Robust Error Handling**: Fallback parsing, validation at every step

This module represents the cutting edge of standup management, combining AI capabilities with practical engineering to create a seamless user experience. The comprehensive validation, error handling, and business rules ensure data integrity while the AI parsing removes friction from daily updates.

**File References**:
- Entities: `F:\StandupSnap\backend\src\entities\snap.entity.ts`, `daily-lock.entity.ts`, `daily-summary.entity.ts`
- Service: `F:\StandupSnap\backend\src\snap\snap.service.ts` (1268 lines)
- Controller: `F:\StandupSnap\backend\src\snap\snap.controller.ts`
- DTOs: `F:\StandupSnap\backend\src\snap\dto\create-snap.dto.ts`, `update-snap.dto.ts`, `lock-daily-snaps.dto.ts`, `override-rag.dto.ts`
- Frontend Page: `F:\StandupSnap\frontend\src\pages\snaps\DailySnapsPage.tsx`
- Frontend Modals: `F:\StandupSnap\frontend\src\components\snaps\CreateSnapModal.tsx`, `EditSnapModal.tsx`
- Frontend Components: `F:\StandupSnap\frontend\src\components\snaps\SnapCard.tsx`, `SnapsList.tsx`
