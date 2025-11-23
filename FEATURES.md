# StandupSnap - Features Documentation

## Overview
StandupSnap is a comprehensive standup management application for agile teams. It enables Scrum Masters, Product Owners, and PMOs to track daily standups, manage sprints, monitor project health with RAG (Red/Amber/Green) status indicators, and generate AI-powered summaries.

---

## 1. Authentication & Authorization

### 1.1 User Authentication
- **Register**: Create new accounts with username, email, password, and name
- **Login**: Authenticate with username/email and password
- **Logout**: End session and invalidate tokens
- **Forgot Password**: Request password reset email
- **Reset Password**: Set new password via token link
- **JWT Tokens**: Access and refresh token management
- **Token Refresh**: Automatic token renewal

### 1.2 Role-Based Access Control (RBAC)
**Roles:**
- `SCRUM_MASTER` - Primary user role for managing standups
- `PRODUCT_OWNER` - Project stakeholder role
- `PMO` - Project Management Office role

**Permissions (30+ granular permissions):**
- Project: create, edit, delete, view
- Sprint: create, edit, delete, view
- Team Member: add, edit, remove, view
- Standup: create, edit own/any, delete own/any, view
- Card: create, edit, delete, view
- Snap: create, edit own/any, delete own/any, view, lock daily, generate summary
- Invite: send, manage roles

**Files:** `backend/src/auth/`, `backend/src/entities/role.entity.ts`

---

## 2. Core Entities

### 2.1 User
- UUID-based identification
- Username, email, password, name
- Active status flag
- Password reset tokens
- Many-to-many relationship with Roles

### 2.2 Project
- Name, description
- Start/end dates
- Active/archived status
- Product Owner and PMO assignments
- Team members and sprints

### 2.3 Sprint
- Name, goal
- Start/end dates
- Status: `PLANNING`, `ACTIVE`, `COMPLETED`
- Closure flag
- Cards collection

### 2.4 Card (Task/Story)
- Title, description
- External ID (Jira integration ready)
- Priority: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- Status: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`
- Estimated Time (ET) in hours
- RAG Status: `RED`, `AMBER`, `GREEN`
- Assignee (TeamMember)
- Snaps history

### 2.5 Snap (Daily Update)
- Raw input from user
- AI-parsed fields: Done, ToDo, Blockers
- Suggested RAG (AI), Final RAG (user override)
- Snap date and lock status
- Creator reference

### 2.6 Team Member
- Full name, email
- Designation/role
- Phone number
- Multi-project assignment

**Files:** `backend/src/entities/`

---

## 3. Project Management

### 3.1 Project CRUD
- Create projects with name, description, dates
- Assign Product Owner and PMO
- Edit project details
- Archive/activate projects
- View project list and details

### 3.2 Team Management
- Add team members to projects
- Assign designations
- Remove members
- View team roster

### 3.3 Invitation System
- Send email invitations
- Assign roles on invitation
- Track invitation status: `PENDING`, `ACCEPTED`, `EXPIRED`
- Invitation expiry handling

**Files:** `backend/src/project/`, `backend/src/team-member/`, `backend/src/invitation/`

---

## 4. Sprint Management

### 4.1 Sprint Lifecycle
- Create sprints with dates and goals
- Sprint status transitions
- Close sprints
- View sprint progress

### 4.2 Sprint Constraints
- No overlapping sprints per project
- Date validation
- Active sprint restrictions

**Files:** `backend/src/sprint/`

---

## 5. Card Management

### 5.1 Card CRUD
- Create cards with title, description, priority
- Mandatory Estimated Time (ET)
- Assign to team members
- Link to sprints
- External ID for tool integration

### 5.2 Card Status Workflow
```
NOT_STARTED -> IN_PROGRESS -> COMPLETED -> CLOSED
```
- Auto-transition to IN_PROGRESS on first snap
- Manual status updates

### 5.3 Card Filtering
- Filter by project, sprint, assignee
- Filter by status, priority, RAG

**Files:** `backend/src/card/`

---

## 6. Snaps (Daily Standups) - Core Feature

### 6.1 Create Snap (M8-UC01)
- User enters free-form update text
- AI parses into Done/ToDo/Blockers
- AI suggests RAG status
- User can override AI suggestions
- Auto-transitions card to IN_PROGRESS

### 6.2 Edit Snap (M8-UC02)
- Only today's snaps editable
- Only before daily lock
- Can regenerate AI parsing
- Owner-only editing (unless permission)

### 6.3 Delete Snap (M8-UC03)
- Only today's snaps deletable
- Only before daily lock
- Owner-only deletion

### 6.4 Lock Daily Snaps (M8-UC04)
- Locks all snaps for a date
- Prevents further edits/deletes
- Triggers summary generation
- Manual or auto-lock (scheduler)

### 6.5 Daily Summary (M8-UC05)
- Aggregates all snaps for a date
- Groups by team member
- Calculates RAG overview:
  - Card level (per snap)
  - Assignee level (worst case)
  - Sprint level (majority rule)

**Files:** `backend/src/snap/`

---

## 7. AI-Powered Features

### 7.1 Standup Parser (Ollama)
- Converts free-form text to structured standup
- Uses local Ollama with qwen2.5:7b model
- Parses: Yesterday, Today, Blockers
- Used for simple standup generation

### 7.2 Snap Parser (Groq API)
- Uses Groq cloud API (llama-3.3-70b-versatile)
- Parses: Done, ToDo, Blockers
- Suggests RAG status
- Professional rephrasing
- Fallback to manual parsing

### 7.3 RAG Status Computation (M9-UC01)
AI considers:
- Timeline deviation (% delay)
- Consecutive days without Done
- Blocker severity
- Progress patterns

**RAG Logic:**
- **RED**: 2+ days without Done, >30% delay, severe blockers
- **AMBER**: Minor delay (<30%), any blockers, no progress today
- **GREEN**: On track, no issues

**Files:** `backend/src/standup/standup.service.ts`, `backend/src/snap/snap.service.ts`

---

## 8. RAG Status Management

### 8.1 RAG Override (M9-UC02)
- SM can override AI suggestions
- Only for today's snaps
- Before daily lock

### 8.2 RAG Aggregation

**Card Level:** Based on latest snap's final RAG

**Sprint Level (M9-UC05):**
- Aggregates all card RAGs
- Worst-case logic: Red > Amber > Green

**Project Level (M9-UC06):**
- Aggregates all sprint RAGs
- Provides breakdown by sprint

### 8.3 RAG History (M9-UC07)
- Tracks RAG changes over time
- Records overrides with user
- Locked on daily snap lock

---

## 9. Dashboard & Reports

### 9.1 Dashboard
- Overview of active projects
- RAG status summary
- Recent activity
- Quick actions

### 9.2 Reports
- Sprint reports
- Daily summaries
- RAG trends
- Team performance

**Files:** `backend/src/dashboard/`, `frontend/src/pages/ReportsPage.tsx`

---

## 10. Frontend Pages

### 10.1 Authentication
- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset request
- `/reset-password` - New password form

### 10.2 Protected Routes
- `/` - Dashboard
- `/projects` - Project list
- `/projects/new` - Create project
- `/projects/:id` - Project details
- `/projects/:id/edit` - Edit project
- `/projects/:projectId/team` - Team management
- `/sprints` - Sprint list
- `/sprints/new` - Create sprint
- `/sprints/:id` - Sprint details
- `/cards` - Card list
- `/cards/:id` - Card details
- `/snaps` - Daily snaps
- `/standups` - Standup management
- `/team` - Team overview
- `/assignees` - Assignee list
- `/assignees/:id` - Assignee details
- `/reports` - Reports
- `/profile` - User profile

**Files:** `frontend/src/App.tsx`, `frontend/src/pages/`

---

## 11. Email Notifications

### 11.1 Mail Service
- Password reset emails
- Invitation emails
- SMTP configuration

**Files:** `backend/src/mail/`

---

## 12. Technical Stack

### Backend
- **Framework:** NestJS
- **Database:** PostgreSQL (TypeORM)
- **Auth:** JWT with refresh tokens
- **AI:** Groq API (cloud), Ollama (local)

### Frontend
- **Framework:** React with TypeScript
- **Routing:** React Router
- **State:** Context API
- **Styling:** Tailwind CSS

### Infrastructure
- **Deployment:** Fly.io ready
- **Database sync:** TypeORM synchronize (dev mode)

---

## 13. API Endpoints Summary

| Module | Endpoints |
|--------|-----------|
| Auth | POST /auth/register, login, logout, refresh, forgot-password, reset-password |
| Projects | GET/POST/PUT/DELETE /projects |
| Sprints | GET/POST/PUT/DELETE /sprints |
| Cards | GET/POST/PUT/DELETE /cards |
| Snaps | GET/POST/PUT/DELETE /snaps, POST /snaps/lock, /snaps/parse |
| Team | GET/POST/PUT/DELETE /team-members |
| Users | GET/PUT /users |
| Dashboard | GET /dashboard |
| Invitations | GET/POST /invitations |
| Standup | POST /standup/generate |
| Assignees | GET /assignees |

---

## 14. Security Features

- Password hashing (bcrypt)
- JWT token authentication
- Refresh token rotation
- Role-based guards
- Permission-based guards
- Input validation (DTOs)
- Account enable/disable

---

## 15. Business Rules

1. Cards must have Estimated Time (ET) to create snaps
2. Snaps can only be created for cards in ACTIVE sprints
3. Only today's snaps can be edited/deleted
4. Locked snaps cannot be modified
5. Daily lock triggers summary generation
6. Card auto-transitions to IN_PROGRESS on first snap
7. RAG aggregates up: Card -> Sprint -> Project
8. Worst-case logic for RAG aggregation

---

## Status: Production Ready

The application has been deployed to Fly.io with both local and cloud functionality working. All core features for standup management, sprint tracking, and RAG status monitoring are complete.
