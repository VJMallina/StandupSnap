# Next Session Implementation - Phase 1: Invitation System

## Current Status

✅ **Completed:**
- Invitation entity created
- Invitation DTOs created (CreateInvitationDto, ValidateInvitationDto)
- Implementation plans documented
- Sprint feature fully implemented and pushed to GitHub

## Ready to Implement

### Backend Files Needed (6 files):

1. **backend/src/invitation/invitation.service.ts**
   - Token: 150 lines
   - Generate secure tokens with crypto.randomBytes
   - Create, validate, revoke invitations
   - Check email for pending invitations
   - Mark invitation as accepted

2. **backend/src/invitation/invitation.controller.ts**
   - Token: 80 lines
   - POST /invitations (SCRUM_MASTER only)
   - GET /invitations/validate/:token (public)
   - GET /invitations (SCRUM_MASTER only)
   - DELETE /invitations/:id (SCRUM_MASTER only)

3. **backend/src/invitation/invitation.module.ts**
   - Token: 20 lines
   - Import TypeORM, User, Project, Invitation
   - Export InvitationService

4. **backend/src/entities/user.entity.ts** (MODIFY)
   - Add: selectedProjectId column
   - Add: lastAccessedProjectId column

5. **backend/src/auth/auth.service.ts** (MODIFY)
   - In register(): Check for invitation by email
   - Enforce role matches invitation
   - Mark invitation as accepted
   - Auto-add to project if projectId exists

6. **backend/src/auth/dto/register.dto.ts** (MODIFY)
   - Add: invitationToken?: string

7. **backend/src/app.module.ts** (MODIFY)
   - Import InvitationModule

### Frontend Files Needed (4 files):

8. **frontend/src/types/invitation.ts**
   - Invitation interface
   - CreateInvitationRequest interface
   - InvitationStatus enum

9. **frontend/src/services/api/invitations.ts**
   - API service methods
   - create, validate, list, revoke

10. **frontend/src/pages/RegisterPage.tsx** (MODIFY)
    - Read token from URL query params
    - Validate token on mount
    - Pre-fill email
    - Lock role selection
    - Pass token in registration

11. **frontend/src/pages/projects/CreateProjectPage.tsx** (MODIFY)
    - Add team members section
    - Email + role selector
    - Send invitation button
    - List pending invitations

## Implementation Order

### Session Start:
1. Create Invitation Service (30-45 mins)
2. Create Invitation Controller (15-20 mins)
3. Create Invitation Module (5 mins)
4. Update User Entity (10 mins)
5. Update Auth Service (20-30 mins)
6. Update Register DTO (5 mins)
7. Update App Module (5 mins)

### Test Backend:
8. Test invitation creation
9. Test token validation
10. Test registration with invitation
11. Test role enforcement

### Frontend:
12. Create frontend types (10 mins)
13. Create API service (15 mins)
14. Update RegisterPage (30 mins)
15. Update CreateProjectPage (45 mins)

### Test End-to-End:
16. Full flow: Create invitation → Register → Verify added to project

## Quick Reference: Key Code Snippets

### Invitation Service - Token Generation
```typescript
private generateUniqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

### Auth Service - Invitation Check
```typescript
// In register() method
const invitation = await this.invitationService.getInvitationByEmail(email);

if (invitation) {
  if (roleName && roleName !== invitation.assignedRole) {
    throw new BadRequestException(
      `This email is invited as ${invitation.assignedRole}. Please register with that role.`
    );
  }

  // Use invited role if no role specified
  const roleToUse = roleName || invitation.assignedRole;

  // ... create user ...

  // Mark invitation as accepted
  await this.invitationService.markAsAccepted(invitation.id);

  // Add to project if exists
  if (invitation.project) {
    await this.projectService.addMember({
      projectId: invitation.project.id,
      userId: user.id,
      role: roleToUse,
    });
  }
}
```

### RegisterPage - Token Handling
```typescript
const [searchParams] = useSearchParams();
const invitationToken = searchParams.get('token');

useEffect(() => {
  if (invitationToken) {
    validateInvitationToken(invitationToken);
  }
}, [invitationToken]);
```

## Database Migration Required

When backend is deployed to Docker, TypeORM will auto-create:
- `invitations` table
- `selected_project_id` and `last_accessed_project_id` columns in `users` table

## Testing Plan

### Test Case 1: Normal Invitation Flow
1. SM creates invitation for po@example.com as PO
2. PO visits /register?token=abc123
3. PO sees email pre-filled, role locked to PO
4. PO registers successfully
5. PO is auto-added to project
6. Invitation marked as accepted

### Test Case 2: Role Enforcement
1. SM invites pmo@example.com as PMO
2. PMO visits registration with token
3. PMO tries to select PO role
4. System rejects: "You must register as PMO"

### Test Case 3: No Invitation
1. New user visits /register (no token)
2. All fields editable
3. Role selector works normally
4. Registration succeeds

## Estimated Completion Time

- Backend: 2-3 hours
- Frontend: 1.5-2 hours
- Testing: 30-45 mins
- **Total: 4-6 hours**

## Current Environment

Both services running:
- Backend: http://localhost:3000 (Docker)
- Frontend: http://localhost:5173 (Vite)

Sprint feature is fully deployed and working.

## Priority for Next Session

**HIGH PRIORITY:**
1. Complete Invitation System backend
2. Update Auth Service for role enforcement
3. Update RegisterPage for invitation handling

**MEDIUM PRIORITY:**
4. Update CreateProjectPage for invitations
5. End-to-end testing

**DEFERRED TO PHASE 2:**
- Project switcher
- Project-scoped dashboard
- Date validation

## Notes

- Email sending can be mocked (just create invitation record)
- Can add actual email service (SendGrid/AWS SES) later
- Invitations stored in DB for audit trail
- Token expiration set to 7 days (configurable)

## Commands for Next Session

```bash
# Start backend (if not running)
cd /mnt/c/Users/user/Desktop/StandupSnap
docker-compose up -d backend

# Start frontend (if not running)
cd frontend
npm run dev

# Copy new backend files to Docker (after creating them)
docker cp backend/src/invitation standupsnap-backend:/app/src/
docker cp backend/src/entities/user.entity.ts standupsnap-backend:/app/src/entities/
docker cp backend/src/auth/auth.service.ts standupsnap-backend:/app/src/auth/
docker cp backend/src/auth/dto/register.dto.ts standupsnap-backend:/app/src/auth/dto/
docker cp backend/src/app.module.ts standupsnap-backend:/app/src/

# Check backend logs
docker logs standupsnap-backend --tail 50
```

Ready to continue Phase 1 implementation in next session!
