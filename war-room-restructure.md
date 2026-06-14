# War Room Restructure Plan

## Problem

The current War Room flow gates incident creation behind project membership. `DeclareIncidentModal` requires a `projectId` prop and is only opened from `ProjectDetailsPage`. Users who don't have access to a specific project cannot raise an incident against it — even if they're the ones who spotted the outage.

Incidents are org-level emergencies, not project deliverables. Anyone in the org should be able to raise one.

## Current State

| Layer | Status |
|---|---|
| Backend API (`POST /incidents`) | Already org-scoped — `organizationId` comes from JWT, not a URL param |
| Backend `GET /incidents` | Already org-level list — `projectId` is an optional query filter |
| `DeclareIncidentModal` | `projectId` is a **required** prop — modal only used from `ProjectDetailsPage` |
| `WarRoomListPage` | No "Declare Incident" button at all |

The backend needs minimal change. Work is mostly frontend + making `projectId` optional end-to-end.

---

## Steps

### Step 1 — Backend: Make `projectId` nullable

**Files:**
- `backend/src/entities/incident.entity.ts`
- `backend/src/incident/dto/declare-incident.dto.ts`

**Changes:**

`incident.entity.ts` — change `projectId` column:
```typescript
// Before
@Column({ type: 'uuid' })
projectId: string;

// After
@Column({ type: 'uuid', nullable: true })
projectId: string | null;
```

`declare-incident.dto.ts` — make `projectId` optional:
```typescript
// Before
@IsUUID()
projectId: string;

// After
@IsUUID()
@IsOptional()
projectId?: string;
```

`incident.service.ts` — update `declare()` to handle nullable `projectId`:
```typescript
const incident = incidentRepo.create({
  organizationId: orgId,
  projectId: dto.projectId || null,   // was: dto.projectId
  ...
});
```

Also update `pushToRaid()` — it references `incident.projectId` to create Issue/Risk. Guard this:
```typescript
if (!incident.projectId) throw new BadRequestException('Incident must be linked to a project before pushing to RAID');
```

---

### Step 2 — Frontend: Update `DeclareIncidentModal`

**File:** `frontend/src/pages/war-room/components/DeclareIncidentModal.tsx`

**Changes:**

1. Make `projectId` an optional prop:
```typescript
interface Props {
  projectId?: string;   // was: projectId: string (required)
  onClose: () => void;
}
```

2. Add a `Project` interface and fetch projects on mount:
```typescript
interface Project { id: string; name: string; key?: string; }

// In component:
const [projects, setProjects] = useState<Project[]>([]);
const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');

useEffect(() => {
  fetch(`${API_URL}/projects`, { headers: authHeaders() })
    .then(r => r.json())
    .then(setProjects)
    .catch(() => {});
}, []);
```

3. Replace the hardcoded `projectId` in the POST body with `selectedProjectId`:
```typescript
body: JSON.stringify({
  title: title.trim(),
  description: description.trim() || undefined,
  severity,
  projectId: selectedProjectId || undefined,   // optional
}),
```

4. Add "Affected Project" field in the form (between Description and Severity, or after Description):
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Affected Project <span className="text-gray-400 font-normal">(optional)</span>
  </label>
  <select
    value={selectedProjectId}
    onChange={e => setSelectedProjectId(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
  >
    <option value="">— No specific project —</option>
    {projects.map(p => (
      <option key={p.id} value={p.id}>{p.key ? `[${p.key}] ` : ''}{p.name}</option>
    ))}
  </select>
</div>
```

---

### Step 3 — Frontend: Add "Declare Incident" to `WarRoomListPage`

**File:** `frontend/src/pages/war-room/WarRoomListPage.tsx`

**Changes:**

1. Import `DeclareIncidentModal`.

2. Add state:
```typescript
const [declaring, setDeclaring] = useState(false);
```

3. Add button next to the status filter dropdown:
```tsx
<button
  onClick={() => setDeclaring(true)}
  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
>
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
  Declare Incident
</button>
```

4. Render modal at bottom of component:
```tsx
{declaring && (
  <DeclareIncidentModal onClose={() => setDeclaring(false)} />
)}
```

Note: No `projectId` prop — user will select project inside the modal (or leave it blank for org-wide incidents).

---

### Step 4 — Frontend: Add Incident Numbers (`INC-001`)

**Files:**
- `backend/src/entities/incident.entity.ts`
- `backend/src/incident/incident.service.ts`
- `frontend/src/pages/war-room/WarRoomListPage.tsx`
- `frontend/src/pages/war-room/WarRoomPage.tsx`

**Backend changes:**

Add `incidentNumber` column to `Incident` entity:
```typescript
@Column({ type: 'int', nullable: true })
incidentNumber: number | null;
```

In `declare()`, compute `MAX(incidentNumber) + 1` per org (same pattern as card `cardNumber`):
```typescript
const maxResult = await incidentRepo
  .createQueryBuilder('inc')
  .select('MAX(inc.incidentNumber)', 'max')
  .where('inc.organizationId = :orgId', { orgId })
  .getRawOne();
const incidentNumber = ((maxResult?.max as number | null) ?? 0) + 1;
```

`externalId` would be `INC-${String(incidentNumber).padStart(3, '0')}` — e.g. `INC-001`.

Add `externalId` column:
```typescript
@Column({ type: 'varchar', length: 20, nullable: true })
externalId: string | null;
```

**Frontend changes:**

Display `INC-001` badge on `WarRoomListPage` (in `IncidentRow`) and `WarRoomPage` header — similar to the card `externalId` badge (monospace font, primary color prefix, gray number).

---

### Step 5 — Incident → Card Conversion

**Files:**
- `backend/src/entities/card.entity.ts` — add `sourceIncidentId` column
- `backend/src/card/card.service.ts` — accept `sourceIncidentId` in `CreateCardDto`
- `backend/src/card/dto/create-card.dto.ts` — add optional `sourceIncidentId`
- `frontend/src/pages/war-room/WarRoomPage.tsx` — add "Create Card from Incident" button
- New modal: `frontend/src/pages/war-room/components/CreateCardFromIncidentModal.tsx`

**Backend changes:**

`card.entity.ts`:
```typescript
@Column({ type: 'uuid', nullable: true })
sourceIncidentId: string | null;
```

`create-card.dto.ts`:
```typescript
@IsUUID()
@IsOptional()
sourceIncidentId?: string;
```

**Frontend — New modal `CreateCardFromIncidentModal`:**

Props:
```typescript
interface Props {
  incident: Incident;
  onClose: () => void;
  onCreated: () => void;
}
```

Pre-fills from incident:
- `title` → incident title
- `description` → `"Raised from incident ${incident.externalId || incident.id}: ${incident.title}"`
- `projectId` → `incident.projectId` (if set), else user picks from dropdown
- `type` → `'task'`
- `priority` → mapped from severity: `P1→critical`, `P2→high`, `P3→medium`, `P4→low`

On submit: `POST /cards` with `sourceIncidentId: incident.id`.

After creation, show a success toast: "Card **PA-12** created from this incident."

**Frontend — Button in `WarRoomPage`:**

Add "Create Card" button in the incident header actions area (next to "Resolve" and "Push to RAID"). Only show when `incident.projectId` is set or user can choose a project. The button opens `CreateCardFromIncidentModal`.

The incident detail page should also show any linked cards:
```typescript
// On incident detail, show:
// "Cards raised from this incident: PA-12, PX-5"
// Each links to /cards/:id
```

To support this, add a `GET /incidents/:id/cards` endpoint, or simply query cards by `sourceIncidentId` on the frontend via `GET /cards?sourceIncidentId=...`.

---

## Execution Order

```
Step 1  →  Step 2  →  Step 3  →  Step 4  →  Step 5
Backend     Modal       List        INC-001     Card link
nullable    optional    button      numbering   conversion
projectId   projectId   added
```

Steps 1–3 unblock the core access problem. Steps 4–5 are enhancements that build on top.
