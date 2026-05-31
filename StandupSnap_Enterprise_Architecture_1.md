# StandupSnap — Enterprise Architecture Design Document
> Version: 1.0 | This document covers the complete approach to transforming StandupSnap into a multi-tenant enterprise SaaS application with a two-layer role and permission model.

---

## Table of Contents

1. [What Changes Fundamentally](#1-what-changes-fundamentally)
2. [Enterprise Data Model](#2-enterprise-data-model)
3. [Two-Layer Role Architecture](#3-two-layer-role-architecture)
4. [Permission Key Catalogue](#4-permission-key-catalogue)
5. [System Role → Permission Mapping](#5-system-role--permission-mapping)
6. [Self-Registration & Onboarding Flow](#6-self-registration--onboarding-flow)
7. [Invitation Flow](#7-invitation-flow)
8. [Permission Resolution Logic](#8-permission-resolution-logic)
9. [Data Scoping Rules](#9-data-scoping-rules)
10. [JWT Strategy](#10-jwt-strategy)
11. [Backend Changes](#11-backend-changes)
12. [Frontend Changes](#12-frontend-changes)
13. [Pages & Role Access Matrix](#13-pages--role-access-matrix)
14. [Dynamic Dashboard & Navigation](#14-dynamic-dashboard--navigation)
15. [Custom Role Design Rules](#15-custom-role-design-rules)
16. [New Pages to Build](#16-new-pages-to-build)
17. [Migration Strategy](#17-migration-strategy)
18. [Implementation Sequence](#18-implementation-sequence)
19. [Seed Checklist](#19-seed-checklist)

---

## 1. What Changes Fundamentally

### Current Model
```
Users → Roles (hardcoded: SCRUM_MASTER, PO, PMO)
```

### Target Model
```
Organization → Users → Org Role        (one per user, per org)
                    → Projects → Project Role  (one per project the user belongs to)
```

Every piece of data gets scoped to an `organizationId`. Nothing leaks across tenants. A user can be a `SCRUM_MASTER` on Project A and a `MEMBER` on Project B — simultaneously, within the same org.

### The Three Layers of Access Control

Every feature is controlled at three levels simultaneously. All three must agree for something to be accessible:

```
Layer 1 — Route Level      → Can this user visit this page?
Layer 2 — Component Level  → Can this user see/interact with this element?
Layer 3 — Data Level       → Can this user see this specific record?
```

UI hiding alone is not enough. A user who bypasses the UI and calls the API directly must still be blocked at Layer 3.

---

## 2. Enterprise Data Model

### 2.1 Organization

```
Organization
├── id                (UUID, PK)
├── name
├── slug              (unique — e.g. "infosys", "tcs")
├── domain            (e.g. "infosys.com" — for domain verification)
├── logoUrl
├── isActive
├── plan              (FREE | PRO | ENTERPRISE)
├── maxUsers
├── createdAt
└── relations: users, projects, roles
```

### 2.2 OrgUser (Org-Level Role Assignment)

Replaces the current User-Role mapping. Captures what role a user holds across the entire org.

```
OrgUser
├── id                (UUID, PK)
├── organizationId    (FK → Organization)
├── userId            (FK → User)
├── orgRoleId         (FK → OrgRole)
├── isActive
├── joinedAt
└── invitedBy         (FK → User)
```

### 2.3 OrgRole (Unified Role Table)

Used for both org-level and project-level role assignments. System roles have `organizationId = null` and are shared across all orgs.

```
OrgRole
├── id                (UUID, PK)
├── organizationId    (FK → Organization, nullable — null = system role)
├── name              (e.g. "Scrum Master", "Delivery Lead", "Client Observer")
├── isSystem          (bool — true = shipped with app, cannot be deleted)
├── isEditable        (bool — system roles are not editable)
├── permissions       (JSONB — array of permission key strings)
└── createdBy         (FK → User)
```

### 2.4 ProjectMember (Project-Level Role Assignment)

This entity already exists. Add two new columns:

```
ProjectMember
├── id                (UUID, PK)
├── organizationId    (FK → Organization)    ← NEW: tenant isolation
├── projectId         (FK → Project)
├── userId            (FK → User)
├── projectRoleId     (FK → OrgRole)         ← NEW: project-level role override
├── joinedAt
└── addedBy           (FK → User)
```

> `projectRoleId` references the same `OrgRole` table — no new table needed. Any system or custom role can serve as a project-level role.

### 2.5 OrgInvitation

```
OrgInvitation
├── id                (UUID, PK)
├── organizationId    (FK → Organization)
├── email
├── orgRoleId         (FK → OrgRole)
├── projectId         (FK → Project, nullable)      ← NEW: direct project invite
├── projectRoleId     (FK → OrgRole, nullable)      ← NEW: project role on invite
├── token             (unique hash)
├── expiresAt
├── acceptedAt
└── invitedBy         (FK → User)
```

When inviting directly to a project, the invitation carries which project they're joining and at what project role. On acceptance, both `OrgUser` and `ProjectMember` records are created in one transaction.

### 2.6 OrgDomainVerification

```
OrgDomainVerification
├── id                (UUID, PK)
├── organizationId    (FK → Organization)
├── domain
├── verificationToken
├── isVerified
└── verifiedAt
```

### 2.7 Existing Entities — Add organizationId

Every existing table gets an `organizationId` FK. All queries must filter by `organizationId` from the JWT context. This is the tenant isolation layer.

Entities to update: `Project`, `Sprint`, `Card`, `Snap`, `DailySnapLock`, `DailySummary`, `Risk`, `RiskHistory`, `RaciMatrix`, `RaciEntry`, `Stakeholder`, `Assumption`, `Issue`, `Decision`, `Change`, `StandaloneMom`, `TeamMember`

---

## 3. Two-Layer Role Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORGANISATION                             │
│                                                                 │
│   User ──── Org Role (one per user, per org)                   │
│             Controls: billing, user mgmt,                       │
│             role mgmt, cross-org visibility                     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │   PROJECT A          PROJECT B          PROJECT C       │  │
│   │   User = SM          User = MEMBER      User = PO       │  │
│   │   (override)         (default)          (override)      │  │
│   └─────────────────────────────────────────────────────────┘  │
│             Controls: sprints, cards, snaps,                    │
│             artifacts — all project-scoped actions             │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 1 — Org Role
- Assigned once when a user joins the org
- Governs org-wide actions: managing users, roles, billing, viewing all projects (PMO/Admin), audit logs
- Stored in `OrgUser.orgRoleId`

### Layer 2 — Project Role
- Assigned each time a user is added to a project
- Governs all project-scoped actions within that specific project
- Stored in `ProjectMember.projectRoleId`
- Defaults to `MEMBER` if not explicitly set — regardless of org role
- A user can have a different project role on every project they belong to

### Real-World Example

| User  | Org Role | Project Alpha    | Project Beta | Project Gamma       |
|-------|----------|------------------|--------------|---------------------|
| Vijay | MEMBER   | SCRUM_MASTER     | MEMBER       | VIEWER              |
| Priya | PMO      | PMO              | PRODUCT_OWNER| PMO                 |
| Ravi  | MEMBER   | MEMBER           | MEMBER       | — (not assigned)    |

### Default Project Role on Assignment

When a user is added to a project without an explicit role, they default to `MEMBER` — regardless of their org role. Access must always be explicitly elevated. `ORG_ADMIN` is the only exception — they have full access to all projects regardless of `ProjectMember` records.

---

## 4. Permission Key Catalogue

All permission keys follow the namespace pattern: `resource:action`

### 4.1 Project

| Permission Key | Description |
|---|---|
| `project:create` | Create a new project |
| `project:view` | View assigned projects |
| `project:view_all` | View all projects in the org |
| `project:edit` | Edit project name, description, dates |
| `project:delete` | Permanently delete a project |
| `project:archive` | Archive / unarchive a project |
| `project:assign_members` | Add or remove team members from a project |
| `project:set_member_role` | Set or change a member's project-level role |

### 4.2 Sprint

| Permission Key | Description |
|---|---|
| `sprint:create` | Create a sprint |
| `sprint:view` | View sprint details |
| `sprint:edit` | Edit sprint name, goal, dates |
| `sprint:delete` | Delete a sprint |
| `sprint:close` | Close / complete a sprint |

### 4.3 Card

| Permission Key | Description |
|---|---|
| `card:create` | Create a card within a sprint |
| `card:view` | View card details |
| `card:view_all` | View all cards (not just assigned ones) |
| `card:edit` | Edit own assigned card |
| `card:edit_any` | Edit any card regardless of assignee |
| `card:delete` | Delete a card |
| `card:assign` | Assign or reassign a card |
| `card:change_status` | Move card through status workflow |

### 4.4 Snap

| Permission Key | Description |
|---|---|
| `snap:create` | Submit a daily snap |
| `snap:view_own` | View own snaps |
| `snap:view_all` | View all team snaps |
| `snap:edit_own` | Edit own snaps (before daily lock) |
| `snap:edit_any` | Edit any team member's snap |
| `snap:delete_own` | Delete own snaps (before daily lock) |
| `snap:delete_any` | Delete any snap |
| `snap:lock_daily` | Lock all snaps for the day |
| `snap:override_rag` | Override AI-suggested RAG status |
| `snap:generate_summary` | Trigger AI daily summary generation |

### 4.5 Standup Book

| Permission Key | Description |
|---|---|
| `standup_book:view` | View the standup book calendar |
| `standup_book:export` | Export standup book to DOCX |

### 4.6 Artifact — RACI Matrix

| Permission Key | Description |
|---|---|
| `artifact:raci:view` | View RACI matrices |
| `artifact:raci:create` | Create a RACI matrix |
| `artifact:raci:edit` | Edit RACI entries |
| `artifact:raci:delete` | Delete a RACI matrix |

### 4.7 Artifact — Risk Register

| Permission Key | Description |
|---|---|
| `artifact:risk:view` | View risks |
| `artifact:risk:create` | Log a new risk |
| `artifact:risk:edit` | Edit risk details and mitigation |
| `artifact:risk:delete` | Delete a risk |
| `artifact:risk:archive` | Archive a closed risk |
| `artifact:risk:export` | Export risk register to CSV |

### 4.8 Artifact — RAID Log

| Permission Key | Description |
|---|---|
| `artifact:raid:view` | View the RAID log |
| `artifact:assumption:create` | Log a new assumption |
| `artifact:assumption:edit` | Edit an assumption |
| `artifact:assumption:delete` | Delete an assumption |
| `artifact:issue:create` | Log a new issue |
| `artifact:issue:edit` | Edit an issue |
| `artifact:issue:delete` | Delete an issue |
| `artifact:decision:create` | Log a new decision |
| `artifact:decision:edit` | Edit a decision |
| `artifact:decision:delete` | Delete a decision |

### 4.9 Artifact — Stakeholder Register

| Permission Key | Description |
|---|---|
| `artifact:stakeholder:view` | View stakeholders |
| `artifact:stakeholder:create` | Add a stakeholder |
| `artifact:stakeholder:edit` | Edit stakeholder details |
| `artifact:stakeholder:delete` | Delete a stakeholder |
| `artifact:stakeholder:archive` | Archive a stakeholder |

### 4.10 Artifact — Change Management

| Permission Key | Description |
|---|---|
| `artifact:change:view` | View change requests |
| `artifact:change:create` | Raise a change request |
| `artifact:change:edit` | Edit a change request |
| `artifact:change:delete` | Delete a change request |
| `artifact:change:approve` | Approve or reject a change request |
| `artifact:change:archive` | Archive an implemented change |
| `artifact:change:export` | Export change log to CSV |

### 4.11 Minutes of Meeting (MOM)

| Permission Key | Description |
|---|---|
| `mom:view` | View meeting minutes |
| `mom:create` | Create a MOM (manual or AI-generated) |
| `mom:edit` | Edit a MOM |
| `mom:delete` | Delete a MOM |
| `mom:export` | Export MOM to TXT or DOCX |

### 4.12 Reports & Dashboard

| Permission Key | Description |
|---|---|
| `report:view` | View project reports |
| `report:view_all` | View reports across all org projects |
| `dashboard:view_team` | See team-level dashboard widgets |
| `dashboard:view_org` | See org-level RAG and health widgets |

### 4.13 Org Administration

| Permission Key | Description |
|---|---|
| `user:invite` | Invite new users to the org |
| `user:deactivate` | Deactivate or reactivate a user |
| `user:view_all` | View all users in the org |
| `role:view` | View all system and custom roles |
| `role:create` | Create a custom role |
| `role:edit` | Edit a custom role's permissions |
| `role:delete` | Delete a custom role |
| `role:assign` | Assign a role to a user |
| `org:settings:view` | View org settings |
| `org:settings:edit` | Edit org name, logo, domain |
| `billing:view` | View billing and plan details |
| `billing:manage` | Upgrade, downgrade, manage billing |
| `audit:view` | View the org audit log |

---

## 5. System Role → Permission Mapping

### ORG_ADMIN
Gets every permission key. Bypasses project membership checks. No exceptions.

---

### PMO

**Project:** `project:view`, `project:view_all`, `project:edit`, `project:archive`, `project:assign_members`, `project:set_member_role`

**Sprint:** `sprint:create`, `sprint:view`, `sprint:edit`, `sprint:close`

**Card:** `card:create`, `card:view`, `card:view_all`, `card:edit`, `card:edit_any`, `card:assign`, `card:change_status`

**Snap:** `snap:view_all`, `snap:generate_summary`, `snap:override_rag`

**Standup Book:** `standup_book:view`, `standup_book:export`

**Artifacts:** `artifact:raci:view`, `artifact:raci:create`, `artifact:raci:edit`, `artifact:raci:delete`, `artifact:risk:view`, `artifact:risk:create`, `artifact:risk:edit`, `artifact:risk:archive`, `artifact:risk:export`, `artifact:raid:view`, `artifact:assumption:create`, `artifact:assumption:edit`, `artifact:issue:create`, `artifact:issue:edit`, `artifact:decision:create`, `artifact:decision:edit`, `artifact:stakeholder:view`, `artifact:stakeholder:create`, `artifact:stakeholder:edit`, `artifact:stakeholder:archive`, `artifact:change:view`, `artifact:change:create`, `artifact:change:edit`, `artifact:change:archive`, `artifact:change:export`

**MOM:** `mom:view`, `mom:create`, `mom:edit`, `mom:export`

**Reports:** `report:view`, `report:view_all`, `dashboard:view_team`, `dashboard:view_org`

---

### SCRUM_MASTER

**Project:** `project:view`, `project:assign_members`, `project:set_member_role`

**Sprint:** `sprint:create`, `sprint:view`, `sprint:edit`, `sprint:close`, `sprint:delete`

**Card:** `card:create`, `card:view`, `card:view_all`, `card:edit`, `card:edit_any`, `card:assign`, `card:change_status`, `card:delete`

**Snap:** `snap:create`, `snap:view_own`, `snap:view_all`, `snap:edit_own`, `snap:edit_any`, `snap:delete_own`, `snap:delete_any`, `snap:lock_daily`, `snap:override_rag`, `snap:generate_summary`

**Standup Book:** `standup_book:view`, `standup_book:export`

**Artifacts:** `artifact:raci:view`, `artifact:raci:create`, `artifact:raci:edit`, `artifact:risk:view`, `artifact:risk:create`, `artifact:risk:edit`, `artifact:risk:archive`, `artifact:risk:export`, `artifact:raid:view`, `artifact:assumption:create`, `artifact:assumption:edit`, `artifact:issue:create`, `artifact:issue:edit`, `artifact:stakeholder:view`, `artifact:change:view`, `artifact:change:create`

**MOM:** `mom:view`, `mom:create`, `mom:edit`, `mom:export`

**Reports:** `report:view`, `dashboard:view_team`

---

### PRODUCT_OWNER

**Project:** `project:view`

**Sprint:** `sprint:view`

**Card:** `card:create`, `card:view`, `card:view_all`, `card:edit`, `card:assign`, `card:change_status`

**Snap:** `snap:view_all`

**Standup Book:** `standup_book:view`

**Artifacts:** `artifact:raci:view`, `artifact:raci:create`, `artifact:raci:edit`, `artifact:risk:view`, `artifact:raid:view`, `artifact:decision:create`, `artifact:decision:edit`, `artifact:stakeholder:view`, `artifact:stakeholder:create`, `artifact:stakeholder:edit`, `artifact:stakeholder:archive`, `artifact:change:view`, `artifact:change:create`, `artifact:change:approve`, `artifact:change:export`

**MOM:** `mom:view`, `mom:create`, `mom:edit`, `mom:export`

**Reports:** `report:view`, `dashboard:view_team`

---

### MEMBER

**Project:** `project:view`

**Sprint:** `sprint:view`

**Card:** `card:view`, `card:change_status`
> Data scoped to assigned cards only — enforced at service layer

**Snap:** `snap:create`, `snap:view_own`, `snap:edit_own`, `snap:delete_own`

**Everything else:** No access

---

### VIEWER

**Project:** `project:view`

**Sprint:** `sprint:view`

**Card:** `card:view`
> Data scoped to assigned project's cards — read only

**Snap:** `snap:view_all` — read only, cannot create or edit

**Standup Book:** `standup_book:view`

**Reports:** `report:view`

**Everything else:** No access

---

## 6. Self-Registration & Onboarding Flow

```
User visits /register
        ↓
Step 1: Enter personal info (name, work email, password)
        ↓
Step 2: Enter org info (org name, org domain e.g. "infosys.com")
        ↓
System checks: is this domain already registered?
   ├── YES → "Your org already exists. Request an invite from your admin."
   └── NO  → Create org (status: PENDING)
            + Create user (status: PENDING)
            + Assign user as ORG_ADMIN
            + Send domain verification email
        ↓
Step 3: Verification email sent — user clicks link
        ↓
Domain marked verified → org status: ACTIVE → user status: ACTIVE
        ↓
ORG_ADMIN lands on Org Setup Wizard:
   ├── Upload org logo
   ├── Configure domain policy:
   │     Option A: Invite-only (default, more secure)
   │     Option B: Auto-join — anyone with @domain.com self-registers as MEMBER
   ├── Review pre-loaded system roles
   └── Optionally create custom roles
        ↓
Admin creates first project and starts inviting team members
```

---

## 7. Invitation Flow

### Org-Level Invite (user joins org, no project yet)

```
Admin goes to /org/users → Invite User
        ↓
Fills: email + org role
        ↓
OrgInvitation record created (projectId = null)
        ↓
Invitation email sent with unique token link
        ↓
User clicks link → lands on /invite/accept
        ↓
User sets password → OrgUser record created → redirects to dashboard
        ↓
User exists in org but is assigned to no projects yet
Admin assigns them to projects separately
```

### Project-Level Invite (user joins org AND a project simultaneously)

```
Admin goes to Project Detail → Add Member
        ↓
Fills: email (or select existing org user) + project role
        ↓
If new user: OrgInvitation created with projectId + projectRoleId
If existing org user: ProjectMember record created immediately
        ↓
New user clicks invitation link → sets password
        ↓
Both OrgUser AND ProjectMember records created in one transaction
        ↓
User lands on dashboard with project already visible
```

### Domain Auto-Join (if enabled by org admin)

```
User visits /register with @infosys.com email
        ↓
System detects domain matches a verified org with auto-join enabled
        ↓
Account created → OrgUser created with MEMBER role
        ↓
User lands on dashboard — no projects assigned yet
Admin assigns projects separately
```

---

## 8. Permission Resolution Logic

When a request arrives, the backend resolves permissions in this exact order:

```
Step 1: Extract userId + organizationId from JWT

Step 2: Is this an org-level action?
        (billing, users, roles, org settings, audit)
        → Use Org Role permissions from OrgUser
        → Stop here

Step 3: Is this a project-scoped action?
        (sprint, card, snap, artifact, MOM)

        → Does the user have project:view_all?
              YES (PMO / ORG_ADMIN) → Use Org Role permissions
              NO  → Continue to Step 4

Step 4: Does a ProjectMember record exist for this user + projectId?
        YES → Use Project Role permissions for this project
        NO  → Return empty permissions (no access to this project)

Step 5: ORG_ADMIN check (bypass)
        If org role is ORG_ADMIN → return ALL_PERMISSIONS regardless
```

### Pseudocode

```
function resolvePermissions(userId, orgId, projectId?) {

  orgMembership = OrgUser.find(userId, orgId)
  orgRole = OrgRole.find(orgMembership.orgRoleId)

  if orgRole.name == 'ORG_ADMIN':
    return ALL_PERMISSIONS

  if no projectId:
    return orgRole.permissions

  projectMembership = ProjectMember.find(userId, projectId, orgId)

  if no projectMembership:
    if orgRole.permissions.includes('project:view_all'):
      return orgRole.permissions
    return []

  projectRole = OrgRole.find(projectMembership.projectRoleId)
  return projectRole.permissions
}
```

---

## 9. Data Scoping Rules

Data scoping is enforced at the **service layer** on every query. UI hiding is cosmetic only — the backend always enforces independently.

### 9.1 Project Access

| Condition | What the user can access |
|---|---|
| Has `project:view_all` | All projects in the org |
| Has `project:view` only | Only projects with a `ProjectMember` record for this user |
| No project membership | Zero access to that project's data |

### 9.2 Resource Scoping Within a Project

| Resource | MEMBER | SCRUM_MASTER | PRODUCT_OWNER | PMO / ORG_ADMIN |
|---|---|---|---|---|
| Sprints | View only | Full manage | View only | Full manage |
| Cards | Own assigned only | All in project | All in project | All in org |
| Snaps | Own only | All in project | All in project (view) | All in org |
| Risks | No access | All in project | View only | All in org |
| Stakeholders | No access | View only | Full manage | All in org |
| Changes | No access | View + create | Approve + manage | All in org |
| MOM | No access | Full manage | Full manage | All in org |
| Reports | No access | Own project | Own project | All org projects |

### 9.3 Multi-Project Scoping

When a user belongs to multiple projects with different roles, scoping is resolved per project:

```
User: Vijay
  Project Alpha (SCRUM_MASTER) → sees all snaps, all cards, can lock daily
  Project Beta  (MEMBER)       → sees own snaps only, own cards only
  Project Gamma (VIEWER)       → read-only, no snap creation

GET /api/snaps?projectId=Alpha  → returns all project snaps
GET /api/snaps?projectId=Beta   → returns only Vijay's snaps
GET /api/snaps?projectId=Gamma  → returns all snaps, read-only context
GET /api/snaps (no filter)      → returns union, scoped per project rules
```

### 9.4 Org-Level Resource Scoping

| Resource | ORG_ADMIN | All Others |
|---|---|---|
| Users | All org users | No access |
| Roles | All org roles | No access (except role:view for some) |
| Billing | Full access | No access |
| Audit Log | Full access | No access |
| Org Settings | Full access | No access |

---

## 10. JWT Strategy

### What Goes in the JWT

Project-level permissions **cannot** be cached in the JWT because a user has a different role on each project. Caching all of them would make the token enormous and stale. Instead:

```typescript
// JWT Payload
{
  sub: userId,
  organizationId: orgId,
  orgSlug: 'infosys',
  orgRole: 'PMO',
  orgPermissions: ['project:view_all', 'report:view_all', ...],
  permissionsVersion: 3    // increment when role changes
}
```

**Org permissions** → in JWT (static per session, refreshed on role change)

**Project permissions** → resolved at request time from DB, cached in Redis keyed by `userId:projectId`

### Token Expiry

| Token | Expiry | Notes |
|---|---|---|
| Access Token | 15 minutes | Short-lived, carries org permissions |
| Refresh Token | 7 days | Rotated on every use |

### Handling Role Changes in Real Time

When an admin changes a user's org role or project role:

1. Increment `permissionsVersion` on the `User` record
2. On next API call, backend compares JWT version vs DB version
3. If mismatch → return `401` with code `TOKEN_STALE`
4. Frontend catches it → silently refreshes token → continues without logout
5. New token carries updated org permissions
6. Redis cache for project permissions is invalidated for that user

---

## 11. Backend Changes

### 11.1 Add organizationId to Every Entity

```typescript
// Middleware injects org context from JWT into every request
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const orgId = req.user?.organizationId;
    if (!orgId) throw new UnauthorizedException('No org context');
    req['orgId'] = orgId;
    next();
  }
}
```

Every service method appends `organizationId: req.orgId` to all queries. This is the tenant isolation boundary.

### 11.2 Replace Static Role Guards with Dynamic Permission Guards

```typescript
// BEFORE (static, brittle)
@Roles(Role.SCRUM_MASTER)

// AFTER (dynamic, permission-based)
@RequirePermission('snap:lock_daily')
@RequirePermission('sprint:close', { projectScoped: true })
```

The guard implementation resolves permissions using the logic in Section 8, optionally accepting a `projectId` from the request params.

### 11.3 Service-Layer Data Scoping Pattern

Each service method checks permissions and constructs the query accordingly:

```typescript
async getSnaps(userId, orgId, projectId, filters) {
  const permissions = await this.permissionService.resolve(userId, orgId, projectId);
  const canViewAll = permissions.includes('snap:view_all');

  return this.snapRepo.find({
    where: {
      organizationId: orgId,
      projectId,
      ...(canViewAll ? {} : { createdById: userId })
    }
  });
}
```

Same endpoint. Same query structure. The permission changes only the WHERE clause. Never scatter `if (role === X)` checks — always check permission keys.

### 11.4 PERMISSIONS Constant

Define all permission keys as a typed constant shared across guards, seeds, and tests:

```typescript
export const PERMISSIONS = {
  PROJECT_CREATE:            'project:create',
  PROJECT_VIEW:              'project:view',
  PROJECT_VIEW_ALL:          'project:view_all',
  PROJECT_EDIT:              'project:edit',
  PROJECT_DELETE:            'project:delete',
  PROJECT_ARCHIVE:           'project:archive',
  PROJECT_ASSIGN_MEMBERS:    'project:assign_members',
  PROJECT_SET_MEMBER_ROLE:   'project:set_member_role',
  SPRINT_CREATE:             'sprint:create',
  SPRINT_VIEW:               'sprint:view',
  SPRINT_EDIT:               'sprint:edit',
  SPRINT_DELETE:             'sprint:delete',
  SPRINT_CLOSE:              'sprint:close',
  CARD_CREATE:               'card:create',
  CARD_VIEW:                 'card:view',
  CARD_VIEW_ALL:             'card:view_all',
  CARD_EDIT:                 'card:edit',
  CARD_EDIT_ANY:             'card:edit_any',
  CARD_DELETE:               'card:delete',
  CARD_ASSIGN:               'card:assign',
  CARD_CHANGE_STATUS:        'card:change_status',
  SNAP_CREATE:               'snap:create',
  SNAP_VIEW_OWN:             'snap:view_own',
  SNAP_VIEW_ALL:             'snap:view_all',
  SNAP_EDIT_OWN:             'snap:edit_own',
  SNAP_EDIT_ANY:             'snap:edit_any',
  SNAP_DELETE_OWN:           'snap:delete_own',
  SNAP_DELETE_ANY:           'snap:delete_any',
  SNAP_LOCK_DAILY:           'snap:lock_daily',
  SNAP_OVERRIDE_RAG:         'snap:override_rag',
  SNAP_GENERATE_SUMMARY:     'snap:generate_summary',
  // ... all other keys from Section 4
  USER_INVITE:               'user:invite',
  USER_DEACTIVATE:           'user:deactivate',
  USER_VIEW_ALL:             'user:view_all',
  ROLE_VIEW:                 'role:view',
  ROLE_CREATE:               'role:create',
  ROLE_EDIT:                 'role:edit',
  ROLE_DELETE:               'role:delete',
  ROLE_ASSIGN:               'role:assign',
  ORG_SETTINGS_VIEW:         'org:settings:view',
  ORG_SETTINGS_EDIT:         'org:settings:edit',
  BILLING_VIEW:              'billing:view',
  BILLING_MANAGE:            'billing:manage',
  AUDIT_VIEW:                'audit:view',
} as const;
```

---

## 12. Frontend Changes

### 12.1 AuthContext Update

```typescript
interface AuthContextType {
  user: User | null;
  orgRole: string;
  orgPermissions: string[];
  can: (permission: string, projectId?: string) => boolean;
  canAny: (permissions: string[], projectId?: string) => boolean;
  canAll: (permissions: string[], projectId?: string) => boolean;
}
```

`can(permission, projectId?)` — when `projectId` is passed, the frontend fetches and caches the resolved project permissions from the backend. When not passed, it checks org permissions from the JWT.

### 12.2 The Can Component

Build once, use everywhere:

```typescript
interface CanProps {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  projectId?: string;
  fallback?: React.ReactNode;   // show something else if no access
  disabled?: boolean;           // render but disable instead of hide
  children: React.ReactNode;
}
```

Usage:

```tsx
// Hide if no permission
<Can permission="sprint:create" projectId={activeProjectId}>
  <button>New Sprint</button>
</Can>

// Disable instead of hide
<Can permission="snap:edit_any" projectId={activeProjectId} disabled>
  <input value={snap.rawText} />
</Can>

// Any of these permissions
<Can anyOf={["artifact:raci:manage", "artifact:risk:view"]} projectId={activeProjectId}>
  <ArtifactsNav />
</Can>
```

### 12.3 ProtectedRoute

```tsx
<ProtectedRoute permission="sprint:close" projectId={activeProjectId}>
  <SprintClosurePage />
</ProtectedRoute>
```

If access denied → redirect to `/unauthorized`.

### 12.4 Project Context

The active project selection context must expose `activeProjectId` globally so `Can` components and API calls always carry the correct project scope without prop-drilling.

---

## 13. Pages & Role Access Matrix

### Public Pages (No Auth)

| Page | Route |
|---|---|
| Login | `/login` |
| Register | `/register` |
| Forgot Password | `/forgot-password` |
| Reset Password | `/reset-password` |
| Accept Invitation | `/invite/accept` |
| Unauthorized | `/unauthorized` |

### Core Pages

| Page | Route | Min Permission |
|---|---|---|
| Dashboard | `/dashboard` | Always visible — content filtered |
| Projects List | `/projects` | `project:view` |
| Project Detail | `/projects/:id` | `project:view` |
| Project Members | `/projects/:id/members` | `project:view` |
| Sprints | `/sprints` | `sprint:view` |
| Sprint Detail | `/sprints/:id` | `sprint:view` |
| Cards | `/cards` | `card:view` |
| Card Detail | `/cards/:id` | `card:view` |
| Snaps | `/snaps` | `snap:create` OR `snap:view_all` |
| Standup Book | `/standup-book` | `standup_book:view` |
| Reports | `/reports` | `report:view` |

### Artifact Pages

| Page | Route | Min Permission |
|---|---|---|
| Artifacts Home | `/artifacts` | ANY `artifact:*:view` |
| RACI Matrix | `/artifacts/raci` | `artifact:raci:view` |
| Risk Register | `/artifacts/risks` | `artifact:risk:view` |
| RAID Log | `/artifacts/raid` | `artifact:raid:view` |
| Stakeholders | `/artifacts/stakeholders` | `artifact:stakeholder:view` |
| Change Management | `/artifacts/changes` | `artifact:change:view` |
| MOM List | `/mom` | `mom:view` |
| MOM Create | `/mom/create` | `mom:create` |
| MOM Detail | `/mom/:id` | `mom:view` |

### Personal Pages (All Roles)

| Page | Route |
|---|---|
| My Profile | `/profile` |
| My Work | `/my-work` |
| Notifications | `/notifications` |

### Org Admin Pages (New)

| Page | Route | Min Permission |
|---|---|---|
| Org Settings | `/org/settings` | `org:settings:view` |
| User Management | `/org/users` | `user:view_all` |
| Invite User | `/org/users/invite` | `user:invite` |
| Role Management | `/org/roles` | `role:view` |
| Role Builder | `/org/roles/create` | `role:create` |
| Role Edit | `/org/roles/:id` | `role:edit` |
| Billing | `/org/billing` | `billing:view` |
| Audit Log | `/org/audit` | `audit:view` |

### Action-Level Gates Within Pages

| Page | UI Element | Permission |
|---|---|---|
| Projects List | "New Project" button | `project:create` |
| Project Detail | "Edit Project" | `project:edit` |
| Project Detail | "Archive Project" | `project:archive` |
| Project Detail | "Add Member" | `project:assign_members` |
| Project Members | "Set Member Role" dropdown | `project:set_member_role` |
| Sprint Detail | "Close Sprint" | `sprint:close` |
| Sprint Detail | "Delete Sprint" | `sprint:delete` |
| Cards | "New Card" | `card:create` |
| Card Detail | "Reassign" | `card:assign` |
| Card Detail | "Edit Card" | `card:edit` OR `card:edit_any` |
| Snaps | "Submit Snap" | `snap:create` |
| Snaps | "Lock Today" | `snap:lock_daily` |
| Snaps | "Override RAG" | `snap:override_rag` |
| Snaps | "Generate Summary" | `snap:generate_summary` |
| Risk Register | "Add Risk" | `artifact:risk:create` |
| Risk Register | "Archive" | `artifact:risk:archive` |
| Risk Register | "Export CSV" | `artifact:risk:export` |
| Change Management | "Approve / Reject" | `artifact:change:approve` |
| Change Management | "Export" | `artifact:change:export` |
| MOM | "Generate with AI" | `mom:create` |
| MOM | "Export DOCX / TXT" | `mom:export` |
| Org Users | "Invite User" | `user:invite` |
| Org Users | "Deactivate" toggle | `user:deactivate` |
| Org Roles | "Create Role" | `role:create` |
| Org Roles | "Edit" on custom role | `role:edit` |
| Org Roles | "Assign Role" to user | `role:assign` |

---

## 14. Dynamic Dashboard & Navigation

### Dashboard Widget Registry

The dashboard is not a single page — it is a permission-filtered widget grid. Each widget is a self-contained component that declares the permission required to render it.

```typescript
// config/dashboardWidgets.ts
export const DASHBOARD_WIDGETS = [
  { id: 'rag_overview',        permission: 'dashboard:view_org',  size: 'large'  },
  { id: 'my_snaps_today',      permission: 'snap:create',         size: 'medium' },
  { id: 'sprint_burndown',     permission: 'sprint:view',         size: 'medium' },
  { id: 'team_blockers',       permission: 'snap:view_all',       size: 'small'  },
  { id: 'pending_approvals',   permission: 'artifact:change:approve', size: 'small' },
  { id: 'my_cards',            permission: 'card:view',           size: 'medium' },
];
```

The dashboard page filters this registry by the current user's resolved permissions for the active project, then renders only what passes.

### Dashboard Widgets Per Role

| Widget | ORG_ADMIN | PMO | Scrum Master | PO | Member | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Project RAG Overview | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Today's Snaps | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Sprint Burndown | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Team Blockers | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pending Approvals | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| My Cards | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |

### Sidebar Navigation

Nav items are defined in a config with a required permission per item. The sidebar filters the array at render time. A group (e.g. Artifacts) is only shown if at least one child passes the permission check.

```typescript
// config/navigation.ts
export const NAV_ITEMS = [
  { label: 'Dashboard',     path: '/dashboard',    permission: null },
  { label: 'Projects',      path: '/projects',     permission: 'project:view' },
  { label: 'Sprints',       path: '/sprints',      permission: 'sprint:view' },
  { label: 'Cards',         path: '/cards',        permission: 'card:view' },
  { label: 'Snaps',         path: '/snaps',        permission: 'snap:create' },
  { label: 'Standup Book',  path: '/standup-book', permission: 'standup_book:view' },
  {
    label: 'Artifacts', permission: null,
    children: [
      { label: 'RACI Matrix',   path: '/artifacts/raci',         permission: 'artifact:raci:view' },
      { label: 'Risk Register', path: '/artifacts/risks',        permission: 'artifact:risk:view' },
      { label: 'RAID Log',      path: '/artifacts/raid',         permission: 'artifact:raid:view' },
      { label: 'Stakeholders',  path: '/artifacts/stakeholders', permission: 'artifact:stakeholder:view' },
      { label: 'Changes',       path: '/artifacts/changes',      permission: 'artifact:change:view' },
    ]
  },
  { label: 'MOM',           path: '/mom',          permission: 'mom:view' },
  { label: 'Reports',       path: '/reports',      permission: 'report:view' },
  {
    label: 'Org Settings', permission: null,
    children: [
      { label: 'Users',   path: '/org/users',   permission: 'user:invite' },
      { label: 'Roles',   path: '/org/roles',   permission: 'role:view' },
      { label: 'Billing', path: '/org/billing', permission: 'billing:view' },
      { label: 'Audit',   path: '/org/audit',   permission: 'audit:view' },
    ]
  },
];
```

---

## 15. Custom Role Design Rules

When an ORG_ADMIN creates a custom role via the Role Builder UI, enforce these constraints:

1. **Cannot exceed ORG_ADMIN permissions** — a custom role can never carry more permissions than ORG_ADMIN
2. **Org admin permissions are locked** — `user:invite`, `role:create`, `role:edit`, `billing:manage`, `audit:view`, `org:settings:edit` cannot appear in custom roles
3. **Minimum permission** — every role must have at least `project:view`
4. **Clone from system role** — allow cloning any system role as a starting point
5. **Cannot delete system roles** — only custom roles can be deleted
6. **Role name must be unique** within the org
7. **Dual use** — custom roles can be assigned at org level or project level
8. **`project:set_member_role` is restricted** — only roles with this permission can change another member's project role; available to SCRUM_MASTER and above by default

---

## 16. New Pages to Build

### 16.1 Org Settings (`/org/settings`)
- Org profile: name, logo, domain, plan
- Domain verification status + re-verify option
- Domain policy toggle: invite-only vs auto-join
- Danger zone: deactivate org

### 16.2 User Management (`/org/users`)
- Table of all org users: name, email, org role, status, joined date
- Invite User button → modal with email + org role + optional project + project role
- Pending invitations tab with resend / revoke actions
- Deactivate / reactivate toggle per user

### 16.3 Role Management (`/org/roles`)
- System roles list (view-only with permission details expandable)
- Custom roles list (editable, deletable)
- Role Builder: checkbox grid of permissions grouped by module
- Clone system role as starting point
- Preview: what would a user with this role see?

### 16.4 Project Members (`/projects/:id/members`)
- Table of members assigned to this project
- Their project role (editable if you have `project:set_member_role`)
- Add existing org user to project with role picker
- Remove member from project
- Shows org role alongside project role for context

### 16.5 My Work (`/my-work`)
- Personal view: all cards assigned to this user across all projects
- Grouped by project, with project role shown
- "My snaps this week" summary
- Active blockers

### 16.6 Updated Registration (`/register`)
- Step 1: Personal info (name, work email, password)
- Step 2: Org info (org name, domain)
- Step 3: Confirmation — verification email sent

### 16.7 Accept Invitation (`/invite/accept`)
- Shows inviter name, org name, assigned role, project (if applicable)
- Set password form
- On submit: creates account, joins org, joins project if applicable

---

## 17. Migration Strategy

For all existing data before go-live:

| Step | Action |
|---|---|
| 1 | Create a default org `"StandupSnap Internal"` |
| 2 | Create `OrgUser` records for all existing users, mapping their current role to the equivalent system role |
| 3 | Add `organizationId` to all existing records pointing to the default org |
| 4 | Add `projectRoleId` to all existing `ProjectMember` records — use the user's org role as the best approximation |
| 5 | Add `organizationId` to all existing `ProjectMember` records pointing to the default org |
| 6 | Seed all 6 system roles into `OrgRole` with `organizationId = null` and `isSystem = true` |
| 7 | Run as a single atomic migration script with rollback capability |
| 8 | After migration, ORG_ADMIN reviews and adjusts project roles where the approximation is incorrect |

---

## 18. Implementation Sequence

| Phase | What to Build | Estimated Effort |
|---|---|---|
| 1 | DB schema — `Organization`, `OrgRole`, `OrgUser`, `OrgInvitation`, `OrgDomainVerification` tables | 3–4 days |
| 2 | Add `organizationId` to all existing entities + `projectRoleId` + `organizationId` to `ProjectMember` | 2 days |
| 3 | `PERMISSIONS` constant + seed all 6 system roles with permission arrays | 1 day |
| 4 | Migration script for existing data (Steps 1–7 from Section 17) | 2 days |
| 5 | Dynamic permission guard — replaces all static role guards, handles project context | 2–3 days |
| 6 | Update all service methods with tenant isolation + data scoping per permission | 3–4 days |
| 7 | JWT update — org permissions in payload + `permissionsVersion` | 1 day |
| 8 | Redis cache for project permission resolution | 1–2 days |
| 9 | Registration flow + domain verification (backend + frontend) | 2 days |
| 10 | Invitation flow — org invite + project invite + accept page (backend + frontend) | 2–3 days |
| 11 | `AuthContext` update — `can(permission, projectId?)` + project permission cache | 1–2 days |
| 12 | `<Can>` component + `ProtectedRoute` — replace all `role === X` checks in UI | 2 days |
| 13 | Nav config + sidebar filter logic | 1 day |
| 14 | Dashboard widget registry + filter logic | 1–2 days |
| 15 | Org Admin Panel UI — settings, user management, role management | 4–5 days |
| 16 | Role Builder UI — permission palette, clone, preview | 3 days |
| 17 | Project Members page — project role management UI | 2 days |
| 18 | My Work page | 1–2 days |
| 19 | End-to-end testing + permission audit across all pages | 3–4 days |

**Total estimated effort: 7–9 weeks of focused development**

> Phases 1–4 must be completed before any other phase begins. Phases 5–8 (backend) should be completed before Phases 11–14 (frontend) since the frontend reflects what the backend enforces.

---

## 19. Seed Checklist

- [ ] All 6 system roles seeded in `OrgRole` with `isSystem: true`, `organizationId: null`
- [ ] All permission keys defined in `PERMISSIONS` constant (backend)
- [ ] Permission arrays assigned to each system role in DB seed
- [ ] `Organization` table created and seeded with default org for existing data
- [ ] `OrgUser` table created with `orgRoleId` FK
- [ ] `OrgRole` table created with `permissions` JSONB column
- [ ] `OrgInvitation` table created with `projectId` + `projectRoleId` nullable columns
- [ ] `OrgDomainVerification` table created
- [ ] `ProjectMember.projectRoleId` column added (FK → OrgRole)
- [ ] `ProjectMember.organizationId` column added (FK → Organization)
- [ ] All existing entities updated with `organizationId` FK
- [ ] All existing users migrated to default org with mapped system roles in `OrgUser`
- [ ] All existing `ProjectMember` records updated with `projectRoleId` (org role approximation)
- [ ] `permissionsVersion` counter column added to `User` table
- [ ] JWT payload updated to carry `orgRole`, `orgPermissions[]`, `permissionsVersion`
- [ ] Dynamic permission guard replaces all static role guards
- [ ] All service methods enforce `organizationId` on every query
- [ ] All service methods resolve project role when `projectId` is present
- [ ] Redis cache wired up for project permission resolution
- [ ] Frontend `AuthContext` updated — `can(permission, projectId?)` signature
- [ ] `<Can>` component built — supports `permission`, `anyOf`, `allOf`, `disabled`, `fallback`
- [ ] `ProtectedRoute` updated to accept `projectId`
- [ ] Nav config built and filtered at render time
- [ ] Dashboard widget registry built and filtered at render time
- [ ] "Assign Member" UI includes project role picker (defaults to MEMBER)
- [ ] Project Members page built with role change capability
- [ ] Role Builder UI enforces all constraints from Section 15
- [ ] Invitation flow handles both org-only and project-specific invites
- [ ] Domain verification flow fully working end-to-end
- [ ] All `role === X` checks removed from frontend — replaced with `can()` calls
