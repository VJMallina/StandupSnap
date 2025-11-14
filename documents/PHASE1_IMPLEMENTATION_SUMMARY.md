# Phase 1: Invitation System + Role Enforcement - Implementation Summary

## Status: Ready to Implement

This document outlines the exact files and changes needed for Phase 1 of the Project Team Management feature.

## Estimated Time: 4-6 hours

## Files to Create/Modify

### Backend (11 files)

#### New Files to Create:
1. `backend/src/entities/invitation.entity.ts` ✅ CREATED
2. `backend/src/invitation/dto/create-invitation.dto.ts`
3. `backend/src/invitation/dto/validate-invitation.dto.ts`
4. `backend/src/invitation/invitation.service.ts`
5. `backend/src/invitation/invitation.controller.ts`
6. `backend/src/invitation/invitation.module.ts`
7. `backend/src/common/decorators/is-not-past-date.decorator.ts`

#### Files to Modify:
8. `backend/src/entities/user.entity.ts` - Add selectedProjectId
9. `backend/src/auth/auth.service.ts` - Add invitation check at registration
10. `backend/src/auth/dto/register.dto.ts` - Add invitationToken field
11. `backend/src/app.module.ts` - Import InvitationModule

### Frontend (6 files)

#### New Files to Create:
12. `frontend/src/types/invitation.ts`
13. `frontend/src/services/api/invitations.ts`
14. `frontend/src/context/ProjectContext.tsx`
15. `frontend/src/hooks/useInvitation.ts`

#### Files to Modify:
16. `frontend/src/pages/RegisterPage.tsx` - Handle invitation token from URL
17. `frontend/src/pages/projects/CreateProjectPage.tsx` - Add team member invitations

## Detailed Implementation Steps

### Step 1: Create Invitation DTOs

**File:** `backend/src/invitation/dto/create-invitation.dto.ts`
```typescript
import { IsEmail, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { RoleName } from '../../entities/role.entity';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsEnum(RoleName)
  assignedRole: RoleName;

  @IsUUID()
  @IsOptional()
  projectId?: string;
}
```

**File:** `backend/src/invitation/dto/validate-invitation.dto.ts`
```typescript
import { IsString } from 'class-validator';

export class ValidateInvitationDto {
  @IsString()
  token: string;
}
```

### Step 2: Create Invitation Service

**File:** `backend/src/invitation/invitation.service.ts`

Key Methods:
- `createInvitation(dto)` - Create invitation with unique token
- `validateToken(token)` - Check if token is valid
- `getInvitationByEmail(email)` - Find pending invitation
- `markAsAccepted(id)` - Mark invitation as accepted
- `revokeInvitation(id)` - Delete/expire invitation
- `generateUniqueToken()` - Create secure token

### Step 3: Create Invitation Controller

**File:** `backend/src/invitation/invitation.controller.ts`

Endpoints:
- `POST /invitations` - Create invitation (SCRUM_MASTER only)
- `GET /invitations/validate/:token` - Validate token (public)
- `GET /invitations` - List invitations (SCRUM_MASTER only)
- `DELETE /invitations/:id` - Revoke invitation (SCRUM_MASTER only)

### Step 4: Create Invitation Module

**File:** `backend/src/invitation/invitation.module.ts`

Imports: TypeORM (Invitation, User, Project), Exports: InvitationService

### Step 5: Update User Entity

**File:** `backend/src/entities/user.entity.ts`

Add fields:
```typescript
@Column({ type: 'uuid', nullable: true })
selectedProjectId: string;

@Column({ type: 'uuid', nullable: true })
lastAccessedProjectId: string;
```

### Step 6: Update Auth Service

**File:** `backend/src/auth/auth.service.ts`

In `register()` method:
1. Check for pending invitation by email
2. If invitation exists:
   - Verify role matches invitation.assignedRole
   - If mismatch, throw error
   - Mark invitation as accepted
   - Auto-add user to project if projectId exists
3. If no invitation, proceed as normal

### Step 7: Update Register DTO

**File:** `backend/src/auth/dto/register.dto.ts`

Add field:
```typescript
@IsString()
@IsOptional()
invitationToken?: string;
```

### Step 8: Create Date Validation Decorator

**File:** `backend/src/common/decorators/is-not-past-date.decorator.ts`

Custom validator that ensures date is not in the past.

### Step 9: Update App Module

**File:** `backend/src/app.module.ts`

Import InvitationModule.

### Step 10: Create Frontend Types

**File:** `frontend/src/types/invitation.ts`

Interfaces for Invitation, CreateInvitationRequest, etc.

### Step 11: Create Invitation API Service

**File:** `frontend/src/services/api/invitations.ts`

API methods matching backend endpoints.

### Step 12: Update Register Page

**File:** `frontend/src/pages/RegisterPage.tsx`

1. Extract `token` from URL query params
2. If token exists, validate it via API
3. Pre-fill email from invitation
4. Lock role selection to invitation.assignedRole
5. Pass token in registration request

### Step 13: Update Create Project Page

**File:** `frontend/src/pages/projects/CreateProjectPage.tsx`

Add section for inviting team members:
- Email input
- Role selector (PO or PMO)
- Send invitation button
- List of pending invitations

## Testing Checklist

### Backend Tests:
- [ ] Create invitation with valid email and role
- [ ] Validate invitation token
- [ ] Register with valid invitation token
- [ ] Register with invitation enforces correct role
- [ ] Register with wrong role throws error
- [ ] Mark invitation as accepted after registration
- [ ] Auto-add user to project if invitation has projectId
- [ ] Revoke invitation successfully

### Frontend Tests:
- [ ] Registration page reads token from URL
- [ ] Email is pre-filled from invitation
- [ ] Role selector is locked when using invitation
- [ ] Error shown if trying wrong role
- [ ] Project creation page can send invitations
- [ ] Invitation list shows pending invitations

### Integration Tests:
- [ ] End-to-end: SM invites PO → PO registers → PO added to project
- [ ] End-to-end: Invited as PMO, tries to register as PO → Error
- [ ] End-to-end: Register without invitation → Works normally

## Database Migration

Need to run migration to create `invitations` table and update `users` table.

SQL (auto-generated by TypeORM):
```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR NOT NULL,
  assigned_role VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending',
  token VARCHAR,
  expires_at TIMESTAMP,
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN selected_project_id UUID,
  ADD COLUMN last_accessed_project_id UUID;

CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
```

## Security Considerations

1. **Token Generation:** Use crypto.randomBytes for secure tokens
2. **Expiration:** Set 7-day expiration on invitations
3. **One-time Use:** Mark as accepted, don't delete (audit trail)
4. **Email Validation:** Ensure email format is valid
5. **Role Restriction:** Strictly enforce role from invitation
6. **RBAC:** Only SCRUM_MASTER can create invitations

## API Example Flow

### 1. Scrum Master invites PO
```bash
POST /api/invitations
{
  "email": "po@example.com",
  "assignedRole": "product_owner",
  "projectId": "project-uuid"
}

Response:
{
  "id": "inv-uuid",
  "email": "po@example.com",
  "assignedRole": "product_owner",
  "status": "pending",
  "token": "abc123xyz",
  "project": { ... }
}
```

### 2. PO clicks registration link with token
```
https://app.com/register?token=abc123xyz
```

### 3. Frontend validates token
```bash
GET /api/invitations/validate/abc123xyz

Response:
{
  "email": "po@example.com",
  "assignedRole": "product_owner",
  "projectName": "Project Alpha"
}
```

### 4. PO registers
```bash
POST /api/auth/register
{
  "email": "po@example.com",
  "password": "secure123",
  "firstName": "John",
  "lastName": "Doe",
  "roleName": "product_owner",
  "invitationToken": "abc123xyz"
}

Response:
{
  "user": { ... },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}

// Backend automatically:
// - Marks invitation as accepted
// - Adds user to project as member
```

## Next Steps After Phase 1

Once Phase 1 is complete, we'll move to:

**Phase 2:** Project Switcher + Project-Scoped Dashboard
- Add project switcher dropdown
- Create ProjectContext for current project
- Filter dashboard by selected project
- Update all views to be project-aware

**Phase 3:** Date Validation
- Apply @IsNotPastDate() to all DTOs
- Frontend date pickers with min date
- Validation error messages

Would you like me to implement Phase 1 now?
