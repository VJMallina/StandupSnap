# Sprint Implementation Guide

## Status
✅ Dashboard Enhanced - Shows Projects, Sprints, Teams, Standups sections
✅ DTOs Created - create-sprint.dto.ts, update-sprint.dto.ts, generate-sprints.dto.ts
⏳ Sprint Service - Needs implementation
⏳ Sprint Controller - Needs implementation
⏳ Sprint Module - Needs implementation
⏳ Frontend Pages - Needs implementation

## Key Requirements Implemented

### Dashboard Changes
- Home screen after login shows dashboard
- Quick Actions section with Create Project, Create Sprint, Invite Team buttons
- Sections for: Projects (top 5), Active Sprints, Team Members, Recent Standups
- Empty states with appropriate messages when no data exists
- "View All" buttons to navigate to detailed pages

### Sprint Features to Implement

#### 1. Timeline Validation
- Sprints must be within project start/end dates
- Sprint duration defined in weeks (1, 2, 3, 4 weeks typical)
- Auto-calculate end date based on start date + duration
- When project timeline changes, validate and adjust sprint timelines

#### 2. Sprint Generation
- User specifies sprint duration (e.g., 2 weeks)
- System generates sprints from project start to end date
- Names sprints automatically: "Sprint 1", "Sprint 2", etc.
- Ensures no gaps or overlaps

#### 3. Team Member Management
- Add team members to projects
- Specify role (Developer, Tester, Designer, etc.)
- Set active date range for member on project
- View all project members

## Backend Files Created

### DTOs
1. **backend/src/sprint/dto/create-sprint.dto.ts**
   - projectId (UUID, required)
   - name (string, required)
   - description (string, optional)
   - startDate (date, required)
   - durationWeeks (number, required, min: 1)
   - status (string, optional)

2. **backend/src/sprint/dto/update-sprint.dto.ts**
   - Extends PartialType of CreateSprintDto
   - All fields optional

3. **backend/src/sprint/dto/generate-sprints.dto.ts**
   - projectId (UUID, required)
   - sprintDurationWeeks (number, required, min: 1)

## Files Still Needed

### Backend
1. **backend/src/sprint/sprint.service.ts** - Business logic with timeline validation
2. **backend/src/sprint/sprint.controller.ts** - REST API endpoints
3. **backend/src/sprint/sprint.module.ts** - Module configuration
4. Update **backend/src/app.module.ts** to import SprintModule

### Frontend
1. **frontend/src/types/sprint.ts** - TypeScript interfaces
2. **frontend/src/services/api/sprints.ts** - API service
3. **frontend/src/pages/sprints/SprintsListPage.tsx** - List all sprints
4. **frontend/src/pages/sprints/CreateSprintPage.tsx** - Create sprint form
5. **frontend/src/pages/sprints/SprintDetailsPage.tsx** - View sprint details
6. Update **frontend/src/App.tsx** with sprint routes

## Sprint Service Key Methods

```typescript
// Core CRUD
create(createSprintDto)
findAll(projectId?)
findOne(id)
update(id, updateSprintDto)
remove(id)

// Timeline Management
validateSprintTimeline(startDate, durationWeeks, projectId)
adjustSprintsForProjectChange(projectId, newStartDate, newEndDate)

// Sprint Generation
generateSprints(projectId, durationWeeks)
```

## API Endpoints Needed

```
POST   /api/sprints                    - Create sprint
GET    /api/sprints?projectId=xxx      - Get all sprints (optionally filtered by project)
GET    /api/sprints/:id                - Get sprint by ID
PATCH  /api/sprints/:id                - Update sprint
DELETE /api/sprints/:id                - Delete sprint
POST   /api/sprints/generate           - Generate sprints for project
```

## Timeline Validation Logic

```typescript
1. Check project exists
2. Get project start and end dates
3. Calculate sprint end date: startDate + (durationWeeks * 7 days)
4. Validate: sprint.startDate >= project.startDate
5. Validate: sprint.endDate <= project.endDate
6. If invalid, throw BadRequestException with helpful message
```

## Project Timeline Change Handler

```typescript
When project dates change:
1. Find all sprints for project
2. For each sprint:
   - If sprint.startDate < newProjectStartDate: adjust or delete
   - If sprint.endDate > newProjectEndDate: adjust or delete
3. Recalculate sprint dates to fit new timeline
4. Save updated sprints
```

## Next Steps

1. Implement Sprint Service with timeline validation
2. Create Sprint Controller with RBAC guards
3. Create Sprint Module and register in AppModule
4. Test backend endpoints
5. Create frontend types and API service
6. Build sprint pages
7. Test complete flow: create project → generate sprints → view/edit sprints
8. Test project timeline change affecting sprints

## Testing Scenarios

1. Create project (Jan 1 - Mar 31)
2. Generate sprints with 2-week duration → Should create 6 sprints
3. Try to create sprint starting before project start → Should fail
4. Try to create sprint ending after project end → Should fail
5. Update project end date to Feb 28 → Sprints should adjust/truncate
6. Add team members to project
7. View team members on project details page
