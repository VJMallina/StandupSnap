# Role-Based Access Control (RBAC) Implementation Guide

## Overview
This document outlines the 3-role system implementation for StandupSnap with comprehensive permissions.

## ✅ Completed: Backend Changes

### 1. Role Entity (`backend/src/entities/role.entity.ts`)
**Three Roles Defined:**
- **Scrum Master**: Full access to all features
- **Product Owner**: Full access except role management
- **PMO**: View-only access

**Permission System (18 Permissions):**
```typescript
enum Permission {
  // Projects
  CREATE_PROJECT, EDIT_PROJECT, DELETE_PROJECT, VIEW_PROJECT,

  // Sprints
  CREATE_SPRINT, EDIT_SPRINT, DELETE_SPRINT, VIEW_SPRINT,

  // Team Members
  ADD_TEAM_MEMBER, REMOVE_TEAM_MEMBER, VIEW_TEAM_MEMBER,

  // Standups
  CREATE_STANDUP, EDIT_OWN_STANDUP, EDIT_ANY_STANDUP,
  DELETE_OWN_STANDUP, DELETE_ANY_STANDUP, VIEW_STANDUP,

  // Admin
  SEND_INVITE, MANAGE_ROLES
}
```

### 2. Database Seeder (`backend/src/database/seeders/role.seeder.ts`)
- Auto-creates 3 roles on server startup
- Assigns permissions based on role
- Updates existing roles if schema changes

### 3. User Entity (`backend/src/entities/user.entity.ts`)
- Removed old `userRole` enum column
- Uses many-to-many relationship with roles
- Supports multiple roles per user (future-proof)

### 4. Auth Service (`backend/src/auth/auth.service.ts`)
- New users get **Scrum Master** role by default
- JWT tokens include role names
- Auth responses include user roles

### 5. Updated Tests
- Fixed auth.service.spec.ts to use new role system
- All tests now use proper Role objects with permissions

## 🔧 Pending: Backend Implementation

### 1. RBAC Guards & Decorators
**Location:** `backend/src/auth/guards/` and `backend/src/auth/decorators/`

**Files to Create:**
```typescript
// guards/permissions.guard.ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<Permission[]>('permissions', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    return this.hasPermissions(user, requiredPermissions);
  }
}

// guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<RoleName[]>('roles', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    return this.hasRoles(user, requiredRoles);
  }
}

// decorators/permissions.decorator.ts
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata('permissions', permissions);

// decorators/roles.decorator.ts
export const RequireRoles = (...roles: RoleName[]) =>
  SetMetadata('roles', roles);
```

### 2. Projects Module
**Location:** `backend/src/projects/`

**Features:**
- CREATE: Scrum Master, Product Owner
- EDIT: Scrum Master, Product Owner
- DELETE: Scrum Master only
- VIEW: All roles

**Endpoints:**
```typescript
@Controller('projects')
export class ProjectsController {
  @Post()
  @RequirePermissions(Permission.CREATE_PROJECT)
  create(@Body() dto: CreateProjectDto) { }

  @Get()
  @RequirePermissions(Permission.VIEW_PROJECT)
  findAll() { }

  @Patch(':id')
  @RequirePermissions(Permission.EDIT_PROJECT)
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) { }

  @Delete(':id')
  @RequirePermissions(Permission.DELETE_PROJECT)
  delete(@Param('id') id: string) { }
}
```

### 3. Sprints Module
**Location:** `backend/src/sprints/`

**Features:**
- Similar structure to Projects
- Belongs to a project
- Date range validation
- Status tracking (planning, active, completed)

### 4. Team Management
**Location:** `backend/src/team-members/`

**Features:**
- Add members to projects (Scrum Master/PO)
- Remove members (Scrum Master/PO)
- Assign roles to project members
- View team members (all roles)

### 5. Enhanced Standup Module
**Updates to:** `backend/src/standup/`

**New Features:**
- Save standups to database
- Link standup to project/sprint/user
- Daily standup history
- Individual user pages
- Edit/delete permissions

## 📱 Frontend Sync Required

### 1. Update Auth Context
**Location:** `frontend/src/context/AuthContext.tsx`

**Changes Needed:**
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];  // Changed from single role to array
}

// Add permission checking helpers
const hasPermission = (permission: string) => {
  // Check if user's roles include the permission
};

const hasRole = (role: string) => {
  return user?.roles.includes(role);
};
```

### 2. Create Role Constants
**Location:** `frontend/src/constants/roles.ts`

```typescript
export enum RoleName {
  SCRUM_MASTER = 'scrum_master',
  PRODUCT_OWNER = 'product_owner',
  PMO = 'pmo',
}

export enum Permission {
  CREATE_PROJECT = 'create_project',
  EDIT_PROJECT = 'edit_project',
  // ... (copy all from backend)
}

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.SCRUM_MASTER]: [ /* all permissions */ ],
  [RoleName.PRODUCT_OWNER]: [ /* all except MANAGE_ROLES */ ],
  [RoleName.PMO]: [ /* view permissions only */ ],
};
```

### 3. Create Permission Hook
**Location:** `frontend/src/hooks/usePermissions.ts`

```typescript
export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;

    return user.roles.some(roleName => {
      const permissions = ROLE_PERMISSIONS[roleName as RoleName];
      return permissions?.includes(permission);
    });
  };

  const hasRole = (role: RoleName): boolean => {
    return user?.roles.includes(role) ?? false;
  };

  return { hasPermission, hasRole, userRoles: user?.roles ?? [] };
};
```

### 4. Create Protected Components
**Location:** `frontend/src/components/`

```typescript
// ProtectedButton.tsx
export const ProtectedButton = ({
  permission,
  children,
  ...props
}: { permission: Permission } & ButtonProps) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) return null;

  return <button {...props}>{children}</button>;
};

// RoleBasedRoute.tsx
export const RoleBasedRoute = ({
  requiredPermission,
  children
}: { requiredPermission: Permission }) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};
```

### 5. Update Dashboard
**Location:** `frontend/src/pages/DashboardPage.tsx`

**Show/Hide Based on Role:**
```typescript
const DashboardPage = () => {
  const { hasPermission, hasRole } = usePermissions();

  return (
    <div>
      {hasPermission(Permission.CREATE_PROJECT) && (
        <button>Create Project</button>
      )}

      {hasPermission(Permission.ADD_TEAM_MEMBER) && (
        <button>Invite Team Member</button>
      )}

      {hasRole(RoleName.PMO) && (
        <div>PMO Dashboard View (Read-Only)</div>
      )}
    </div>
  );
};
```

### 6. Create Projects Pages
**New Files:**
- `frontend/src/pages/ProjectsPage.tsx` - List all projects
- `frontend/src/pages/ProjectDetailPage.tsx` - View/edit project
- `frontend/src/pages/CreateProjectPage.tsx` - Create new project

### 7. Create Team Management Page
**Location:** `frontend/src/pages/TeamMembersPage.tsx`

**Features:**
- List team members
- Add/remove buttons (conditional on permission)
- Send invites
- View member standups

## 🔄 Integration Checklist

### Backend Tasks
- [ ] Create RBAC guards and decorators
- [ ] Implement Projects module with CRUD
- [ ] Implement Sprints module with CRUD
- [ ] Implement Team Members module
- [ ] Update Standup module to save to database
- [ ] Add project/sprint associations to standups
- [ ] Create individual user standup pages
- [ ] Add role management endpoints (assign/remove roles)
- [ ] Test all permission checks

### Frontend Tasks
- [ ] Update Auth context for multiple roles
- [ ] Create role & permission constants
- [ ] Create usePermissions hook
- [ ] Create ProtectedButton component
- [ ] Create RoleBasedRoute component
- [ ] Update Dashboard with role-based UI
- [ ] Create Projects pages (list, detail, create)
- [ ] Create Sprints pages
- [ ] Create Team Management page
- [ ] Add unauthorized page
- [ ] Update navigation based on permissions
- [ ] Add role badges/indicators in UI

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Returns user with roles
- `POST /api/auth/login` - Returns user with roles
- `GET /api/auth/me` - Returns current user with roles

### Projects (To Be Created)
- `GET /api/projects` - List projects (all roles)
- `POST /api/projects` - Create project (SM, PO)
- `GET /api/projects/:id` - Get project (all roles)
- `PATCH /api/projects/:id` - Update project (SM, PO)
- `DELETE /api/projects/:id` - Delete project (SM only)

### Sprints (To Be Created)
- `GET /api/projects/:projectId/sprints` - List sprints
- `POST /api/projects/:projectId/sprints` - Create sprint (SM, PO)
- `PATCH /api/sprints/:id` - Update sprint (SM, PO)
- `DELETE /api/sprints/:id` - Delete sprint (SM only)

### Team Members (To Be Created)
- `GET /api/projects/:projectId/members` - List members
- `POST /api/projects/:projectId/members` - Add member (SM, PO)
- `DELETE /api/projects/:projectId/members/:userId` - Remove member (SM, PO)
- `POST /api/projects/:projectId/invites` - Send invite (SM, PO)

### Standups (To Be Enhanced)
- `POST /api/standup/generate` - Generate AI standup
- `POST /api/standup` - Save standup
- `GET /api/standup` - List user's standups
- `GET /api/standup/:id` - Get specific standup
- `PATCH /api/standup/:id` - Update own standup
- `DELETE /api/standup/:id` - Delete own standup

## Next Steps

1. **Restart Backend**: The current compilation is stuck. Restart it to apply all changes.
2. **Test Role Seeding**: Verify 3 roles are created in database
3. **Implement RBAC Guards**: Start with permissions guard
4. **Create Projects Module**: First major feature with RBAC
5. **Sync Frontend**: Update auth context and create hooks
6. **Build UI Components**: Protected buttons and routes
7. **Create Project Pages**: Full project management UI
8. **Add Team Management**: Invite and manage team members

## Database Schema

### Existing Tables
- `users` - User accounts
- `roles` - 3 roles with permissions
- `user_roles` - Many-to-many join table
- `projects` - Project information
- `sprints` - Sprint information
- `project_members` - Team members in projects
- `standup_updates` - Daily standup records
- `refresh_tokens` - JWT refresh tokens

### Relationships
- User ←→ Roles (Many-to-Many)
- User → Standup Updates (One-to-Many)
- User → Project Members (One-to-Many)
- Project → Sprints (One-to-Many)
- Project → Project Members (One-to-Many)
- Sprint → Standup Updates (One-to-Many)

## Testing Strategy

1. **Unit Tests**: Test permission checking logic
2. **Integration Tests**: Test RBAC guards with mock users
3. **E2E Tests**: Test role-based UI rendering
4. **Manual Testing**: Verify each role can/cannot access features

## Security Considerations

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens with expiration
- ✅ Refresh token rotation
- ✅ Role-based permissions
- 🔧 TODO: Rate limiting on invite endpoints
- 🔧 TODO: Audit logging for sensitive operations
- 🔧 TODO: Email verification for invited users
