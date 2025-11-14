# Project Team Management & Multi-Project Support - Implementation Plan

## Requirements Summary

1. **Project Team Management:**
   - Scrum Master can add PO and PMO to projects
   - Can invite users by email if they don't exist
   - Invited emails are locked to specific roles

2. **Multi-Project Support:**
   - Scrum Masters can manage multiple projects
   - Project switcher in UI
   - Project-specific dashboard views

3. **Date Validation:**
   - No back-dating for projects
   - No back-dating for sprints
   - All dates must be today or future

4. **Role-Based Views:**
   - PO and PMO see only their assigned projects
   - Dashboard filtered by selected/assigned project
   - Scrum Master sees all their projects

5. **Email-Role Binding:**
   - Email invited with specific role
   - User must register with that role
   - System prevents different role selection

## Database Schema Changes

### 1. Invitation Entity (CREATED)
```typescript
- id: uuid
- email: string
- assignedRole: RoleName (enum)
- status: InvitationStatus (pending/accepted/expired)
- token: string (nullable)
- expiresAt: timestamp (nullable)
- project_id: foreign key (nullable)
- createdAt, updatedAt
```

### 2. Project Member Entity (EXISTS - needs enhancement)
```typescript
- Current fields are sufficient
- Add createdBy field to track who added the member
```

### 3. User Entity Enhancement
```typescript
- Add: selectedProjectId (for multi-project switching)
- Add: lastAccessedProjectId
```

## Backend Implementation Steps

### Phase 1: Invitation System
1. ✅ Create Invitation entity
2. Create Invitation module (service, controller, DTOs)
3. Add endpoints:
   - POST /invitations (create invitation)
   - GET /invitations (list pending invitations)
   - GET /invitations/:token (validate invitation token)
   - DELETE /invitations/:id (revoke invitation)

### Phase 2: Auth System Updates
4. Modify registration to:
   - Check for pending invitation by email
   - Enforce role from invitation
   - Mark invitation as accepted
   - Auto-add user to project if invitation exists

### Phase 3: Project Member Management
5. Add project member endpoints:
   - POST /projects/:id/members (add existing user or send invitation)
   - GET /projects/:id/members (list all members)
   - DELETE /projects/:id/members/:memberId (remove member)

6. Add project switching:
   - PATCH /users/me/project (switch current project)
   - GET /users/me/projects (get all accessible projects)

### Phase 4: Date Validation
7. Add validation decorators:
   - @IsNotPastDate() for project startDate
   - @IsNotPastDate() for sprint startDate
   - Update DTOs for Project and Sprint

### Phase 5: Project-Scoped Data
8. Update existing endpoints to be project-aware:
   - Dashboard GET /dashboard/:projectId
   - Sprints already filtered by projectId
   - Standups will need projectId filtering

## Frontend Implementation Steps

### Phase 1: Project Switcher
1. Create ProjectSwitcher component (dropdown in AppLayout)
2. Add context for current project (ProjectContext)
3. Store selected project in localStorage
4. Update all API calls to include projectId

### Phase 2: Enhanced Project Creation
5. Update CreateProjectPage:
   - Add team members section
   - Email input for inviting PO/PMO
   - Role selector for each invitation
   - Show pending invitations
   - Validate no backdating

### Phase 3: Dashboard Redesign
6. Make Dashboard project-specific:
   - Show selected project name
   - Filter all data by project
   - Show project team members
   - Show project-specific sprints
   - Add "Switch Project" call-to-action

### Phase 4: Registration Flow
7. Update RegisterPage:
   - Check URL for invitation token
   - Pre-fill email if token exists
   - Lock role selection if invited
   - Show invitation details

### Phase 5: Date Validation UI
8. Add date pickers with min date = today
9. Show validation errors for backdating
10. Add helpful hints about date restrictions

## API Endpoints Summary

### Invitations
```
POST   /api/invitations              - Send invitation
GET    /api/invitations              - List invitations (admin)
GET    /api/invitations/:token       - Get invitation by token
DELETE /api/invitations/:id          - Revoke invitation
```

### Project Members
```
POST   /api/projects/:id/members     - Add member or send invite
GET    /api/projects/:id/members     - List project members
DELETE /api/projects/:id/members/:id - Remove member
```

### User Projects
```
GET    /api/users/me/projects        - Get my projects
PATCH  /api/users/me/project         - Switch project
```

## Security Considerations

1. **Role Enforcement:**
   - Check invitation at registration
   - Prevent role manipulation
   - Validate role matches invitation

2. **Project Access:**
   - Users only see projects they're assigned to
   - Scrum Masters see all their projects
   - PO/PMO see only their projects

3. **Invitation Security:**
   - Generate secure tokens
   - Set expiration (e.g., 7 days)
   - One-time use tokens
   - Revokable by Scrum Master

## UI/UX Flow

### Scrum Master Flow:
1. Create project
2. Add team members (existing or invite by email)
3. See all projects in switcher
4. Switch between projects
5. Dashboard shows selected project data

### PO/PMO Invited Flow:
1. Receive invitation email (future: with link)
2. Click registration link with token
3. Register with pre-assigned role
4. Auto-added to project
5. See only their project(s)

### Multi-Project Switching:
1. Click project switcher (top nav)
2. See list of accessible projects
3. Select project
4. Dashboard and all views update
5. Selection persisted in localStorage

## Testing Scenarios

1. **Invitation Flow:**
   - Scrum Master invites non-existent PO
   - PO registers with invitation token
   - System enforces correct role
   - PO auto-added to project

2. **Role Lock:**
   - User invited as PO
   - Tries to register as PMO
   - System rejects and enforces PO role

3. **Multi-Project:**
   - Scrum Master creates 3 projects
   - Switches between projects
   - Dashboard updates accordingly
   - Different team members per project

4. **Date Validation:**
   - Try creating project with past date → Rejected
   - Try creating sprint with past date → Rejected
   - Valid future dates → Accepted

5. **Access Control:**
   - PO can only see their project
   - PMO can only see their project
   - Scrum Master sees all their projects

## Migration Steps

1. Run database migration for Invitation entity
2. Add selectedProjectId to User entity
3. Deploy backend changes
4. Deploy frontend changes
5. Test invitation flow end-to-end

## Estimated Complexity

- Backend: 6-8 hours
- Frontend: 4-6 hours
- Testing: 2-3 hours
- Total: 12-17 hours

## Implementation Priority

1. High: Invitation system + role enforcement
2. High: Project switcher + project-scoped dashboard
3. Medium: Date validation
4. Medium: Enhanced project member UI
5. Low: Email sending (can mock initially)

## Notes

- Email sending can be mocked initially (just store invitation)
- Can add actual email service later (SendGrid, AWS SES, etc.)
- Consider adding notification system later
- May need to add project description/details page
