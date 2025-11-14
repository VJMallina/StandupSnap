# Sprint Frontend Implementation Guide

## ✅ Completed

### Backend (100%)
- Sprint Service with timeline validation
- Sprint auto-generation logic
- Sprint Controller with RBAC guards
- Sprint Module registered in AppModule

### Frontend (50%)
- Sprint TypeScript types (`frontend/src/types/sprint.ts`)
- Sprint API service (`frontend/src/services/api/sprints.ts`)

## 📋 Remaining Tasks

### 1. Create SprintsListPage
**Location:** `frontend/src/pages/sprints/SprintsListPage.tsx`

**Features:**
- Display all sprints in a table/card view
- Filter by project
- Show sprint status, dates, duration
- Click to view details
- Button to create new sprint
- Button to delete sprint (with confirmation)

### 2. Create CreateSprintPage
**Location:** `frontend/src/pages/sprints/CreateSprintPage.tsx`

**Features:**
- Form to create single sprint:
  - Select project (dropdown)
  - Sprint name
  - Start date
  - Duration in weeks
  - Description (optional)
- OR Auto-generate sprints:
  - Select project
  - Specify sprint duration (weeks)
  - Click "Generate Sprints" button
  - Shows preview of generated sprints
  - Confirm to create all

### 3. Create SprintDetailsPage
**Location:** `frontend/src/pages/sprints/SprintDetailsPage.tsx`

**Features:**
- View sprint details
- Edit sprint (inline or modal)
- View associated project
- Timeline visualization
- Status management

### 4. Add Routes to App.tsx

```typescript
import SprintsListPage from './pages/sprints/SprintsListPage';
import CreateSprintPage from './pages/sprints/CreateSprintPage';
import SprintDetailsPage from './pages/sprints/SprintDetailsPage';

// Add these routes:
<Route path="/sprints" element={<SprintsListPage />} />
<Route path="/sprints/new" element={<CreateSprintPage />} />
<Route path="/sprints/:id" element={<SprintDetailsPage />} />
```

## 🔗 API Endpoints Available

```
GET    /api/sprints                    - Get all sprints
GET    /api/sprints?projectId=xxx      - Get sprints by project
GET    /api/sprints/:id                - Get sprint by ID
POST   /api/sprints                    - Create single sprint
POST   /api/sprints/generate           - Auto-generate sprints
PATCH  /api/sprints/:id                - Update sprint
DELETE /api/sprints/:id                - Delete sprint
```

## 🎯 Key Features Implemented

### Timeline Validation
- Sprints must be within project start/end dates
- Backend validates and returns clear error messages
- Frontend should display these validation errors

### Auto-Generation
- User selects project and sprint duration
- Backend creates multiple sprints automatically
- Names them "Sprint 1", "Sprint 2", etc.
- Ensures no gaps or overlaps
- Adjusts last sprint to fit project end date

## 📝 Next Steps

1. Copy page templates from Projects pages and adapt for Sprints
2. Test create sprint flow
3. Test auto-generation flow
4. Test timeline validation (try creating sprint outside project dates)
5. Connect dashboard sprint section to show real data

## 🔧 Testing Scenarios

1. Create a project (Jan 1 - Mar 31, 2024)
2. Generate sprints with 2-week duration → Should create ~6 sprints
3. Try to create sprint starting before project start → Should fail
4. Try to create sprint ending after project end → Should fail
5. Update project end date → Sprints remain valid or need manual adjustment

## 💡 Tips

- Use the projects pages as templates
- Reuse AppLayout component
- Use permissions checks for buttons (CREATE_SPRINT, EDIT_SPRINT, etc.)
- Show loading states during API calls
- Handle errors gracefully with user-friendly messages
