# StandupSnap - How It Works Documentation Index

## Overview
This directory contains comprehensive, step-by-step documentation for every module in the StandupSnap application. Each document explains the complete user journey, data flows, API endpoints, database operations, business logic, validations, and error handling.

**Last Updated**: 2025-12-30
**Application Version**: 1.0
**Documentation Coverage**: 19 Modules + Index

---

## Document Structure

Each module documentation follows this structure:
1. **Overview**: Purpose, key features, user roles
2. **Screens & Pages**: Every screen with complete details
3. **User Actions**: Step-by-step flows with API calls
4. **Data Flow Diagrams**: Visual representations
5. **Complete User Journeys**: End-to-end workflows
6. **Database Schema**: Tables, relationships, queries
7. **API Endpoints Summary**: All endpoints with permissions
8. **Permissions & RBAC**: Role-based access details
9. **Integration Points**: How modules interact
10. **Common Issues & Solutions**: Troubleshooting guide

---

## Core Modules (9 modules)

### [01. Authentication & Authorization](./01-authentication-authorization.md)
**Status**: Complete ✅
- **Screens**: Login, Register, Forgot Password, Reset Password, Profile
- **Key Features**: JWT authentication, RBAC with 3 roles (SM/PO/PMO), 30+ granular permissions
- **User Journeys**: Registration via invitation, password reset, token refresh
- **Database Tables**: `users`, `roles`, `user_roles`, `refresh_tokens`, `invitations`
- **Security**: bcrypt password hashing, JWT access/refresh tokens, email-based password reset

**Quick Links**:
- Login Flow: Page 1-7
- Registration Flow: Page 8-12
- Permission System: Page 25-27

---

### [02. Projects](./02-projects.md)
**Status**: Complete ✅
- **Screens**: Projects List, Create Project, Project Details, Edit Project
- **Key Features**: Project lifecycle management, PO/PMO assignment, team composition, archival
- **User Journeys**: Create project with team, archive old project
- **Database Tables**: `projects`, `project_members`, `project_team_members`
- **Integrations**: Sprints, Cards, Team Members, Dashboard

**Quick Links**:
- Create Project Flow: Page 8-15
- Team Assignment: Page 16-20
- Archive Project: Page 23-24

---

### [03. Sprints](./03-sprints.md)
**Status**: To Be Created
- **Screens**: Sprints List, Create Sprint, Sprint Details, Close Sprint
- **Key Features**: Sprint lifecycle, status workflow (UPCOMING → ACTIVE → COMPLETED → CLOSED), auto-generation, multi-slot standup config
- **User Journeys**: Manual sprint creation, auto-generate sprint cycles, close sprint with card transitions
- **Database Tables**: `sprints`, `daily_standup_slots`
- **Business Logic**: No overlapping sprints, sprint date validation against project dates, daily standup slot configuration

**Planned Coverage**:
- Sprint Status Workflow
- Auto-Generation Algorithm
- Daily Standup Slot Management
- Sprint Closure Process

---

### [04. Cards (Task Management)](./04-cards.md)
**Status**: To Be Created
- **Screens**: Cards List, Create Card, Card Details, Edit Card
- **Key Features**: Status workflow (NOT_STARTED → IN_PROGRESS → COMPLETED → CLOSED), priority levels, RAG status, assignee tracking
- **User Journeys**: Create card, auto-transition on first snap, mark completed
- **Database Tables**: `cards`, `card_rag_history`
- **Business Logic**: Estimated Time (ET) required for RAG calculation, auto status transitions, external ID for Jira integration

**Planned Coverage**:
- Card Status Transitions
- RAG Status Calculation
- Assignee Assignment
- Priority Management

---

### [05. Snaps (Daily Standups)](./05-snaps-daily-standups.md)
**Status**: To Be Created ⭐ **COMPLEX MODULE**
- **Screens**: Daily Snaps Page, Create Snap Modal, Edit Snap Modal, Snap Card
- **Key Features**: AI-powered parsing (Groq API), RAG calculation, daily lock mechanism, multi-slot support
- **User Journeys**: Create snap with AI parsing, override AI suggestions, lock daily snaps
- **Database Tables**: `snaps`, `daily_snap_lock`, `daily_summary`, `card_rag_history`
- **AI Integration**: Groq API (llama-3.3-70b-versatile) for parsing raw text into Done/ToDo/Blockers

**Planned Coverage**:
- AI Parsing Algorithm (parseSnapWithAI)
- RAG Calculation Logic (calculateSystemRAG)
- Multi-Slot Standup Handling
- Daily Lock Mechanism
- Timeline Deviation Calculation
- Blocker Severity Detection

---

### [06. Standup Book](./06-standup-book.md)
**Status**: To Be Created
- **Screens**: Calendar View, Day Details, Export to DOCX
- **Key Features**: Historical standup tracking, calendar navigation, MOM generation, export to Word
- **User Journeys**: Navigate standup history, view day details, generate MOM, export to DOCX
- **Database Tables**: `daily_summary`, `mom`, `daily_lock`
- **Export**: DOCX generation using docx library

**Planned Coverage**:
- Calendar View Generation
- Day Details Grouping (by slot, by assignee)
- MOM Creation and Export
- DOCX Export Format

---

### [07. Team & Assignees](./07-team-assignees.md)
**Status**: To Be Created
- **Screens**: Team Members List, Create Team Member, Assignee Details
- **Key Features**: Team member pool management, project assignment, assignee performance tracking
- **User Journeys**: Create team member, assign to projects, view assignee workload
- **Database Tables**: `team_members`, `project_team_members`
- **Analytics**: Individual assignee dashboards, workload distribution, snap history

**Planned Coverage**:
- Team Member Management
- Project Assignment Logic
- Assignee Performance Metrics
- Workload Analytics

---

### [08. Dashboard](./08-dashboard.md)
**Status**: Complete ✅
- **Screens**: Dashboard (main view)
- **Key Features**: Project health overview, RAG distribution, recent activity feed, sprint progress
- **User Journeys**: View dashboard metrics, select project context, drill down to details
- **Database Tables**: Aggregates from multiple tables
- **Widgets**: Project health, RAG distribution chart, activity feed, sprint progress, team workload

**Quick Links**:
- Dashboard Widgets: Page 1-15
- RAG Distribution: Page 16-20
- Activity Feed: Page 21-25

---

### [09. Reports](./09-reports.md)
**Status**: Complete ✅
- **Screens**: Reports page with daily standup summaries
- **Key Features**: Daily summary reports, RAG overview (card/assignee/sprint levels), multi-level filtering, TXT/DOCX export
- **User Journeys**: View daily summaries, filter by sprint and date range, export reports
- **Database Tables**: `daily_summaries` with JSONB data structures
- **Export Formats**: Plain text (TXT), Word document (DOCX) with professional formatting
- **RAG Levels**: Card-level, Assignee-level (worst-case), Sprint-level (majority-based)

**Quick Links**:
- Daily Summary Structure: Page 5-10
- Export Formats: Page 28-35
- RAG Calculation: Page 12-15

---

## Artifacts Modules (10 modules)

### [10. RACI Matrix](./10-raci-matrix.md)
**Status**: To Be Created
- **Screens**: RACI Matrix List, Create Matrix, Edit Matrix, View Matrix
- **Key Features**: RACI role assignment (Responsible, Accountable, Consulted, Informed), deliverable mapping
- **User Journeys**: Create RACI matrix, assign roles, export to Excel
- **Database Tables**: `raci_matrix`, `raci_entry`
- **Export**: Excel/CSV export

**Planned Coverage**:
- RACI Matrix Creation
- Role Assignment Logic
- Export Functionality

---

### [10. Risk Register](./10-risk-register.md)
**Status**: To Be Created
- **Screens**: Risks List, Create Risk, Risk Details, Archive Risk
- **Key Features**: Risk tracking, impact/likelihood scoring, severity calculation, status workflow, mitigation strategies
- **User Journeys**: Identify risk, assess severity, define mitigation, track to closure
- **Database Tables**: `risks`, `risk_history`
- **Status Workflow**: IDENTIFIED → ASSESSED → MITIGATING → RESOLVED/ACCEPTED
- **Severity**: Auto-calculated from Impact × Likelihood

**Planned Coverage**:
- Risk Severity Calculation
- Status Workflow Transitions
- Mitigation Strategy Tracking
- Risk History Logging

---

### [11. Assumptions, Issues & Decisions (AID)](./11-assumptions-issues-decisions.md)
**Status**: To Be Created
- **Screens**: AID Logs (unified view), Create/Edit for each type
- **Key Features**: Track assumptions, issues, decisions; validation status, impact assessment
- **User Journeys**: Log assumption, track issue to resolution, document decision
- **Database Tables**: `assumptions`, `issues`, `decisions`

**Planned Coverage**:
- Assumptions Management
- Issue Tracking Workflow
- Decision Log with Context

---

### [12. Stakeholder Register & Power-Interest Grid](./12-stakeholders-power-interest.md)
**Status**: To Be Created
- **Screens**: Stakeholder List, Power-Interest Grid, Create Stakeholder, Stakeholder Details
- **Key Features**: Stakeholder tracking, power/interest classification, quadrant analysis, engagement strategies
- **User Journeys**: Add stakeholder, classify in grid, define engagement strategy
- **Database Tables**: `stakeholders`
- **Grid Quadrants**: Key Players (High/High), Keep Satisfied (High/Low), Keep Informed (Low/High), Monitor (Low/Low)

**Planned Coverage**:
- Power-Interest Grid Logic
- Quadrant Classification
- Engagement Strategy Templates

---

### [13. Change Management](./13-change-management.md)
**Status**: To Be Created
- **Screens**: Changes List, Create Change Request, Change Workflow, Approve/Reject
- **Key Features**: Change workflow, approval process, impact assessment, rollback planning, CSV export
- **User Journeys**: Submit change request, route for approval, implement change, track to closure
- **Database Tables**: `changes`
- **Status Workflow**: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → IN_PROGRESS → IMPLEMENTED → CLOSED
- **Change Types**: MINOR, MAJOR, EMERGENCY, STANDARD

**Planned Coverage**:
- Change Request Workflow
- Approval Process Logic
- Impact Assessment
- Rollback Planning

---

### [14. Schedule Builder (Gantt Chart)](./14-schedule-builder.md)
**Status**: To Be Created ⭐ **HIGHLY COMPLEX MODULE**
- **Screens**: Gantt Chart View, Task List Panel, Create Task, Task Dependencies, Calendar Config
- **Key Features**: MS Project-like functionality, WBS hierarchy, task dependencies (FS/SS/FF/SF), CPM calculations, auto-scheduling
- **User Journeys**: Create WBS, define dependencies, auto-schedule tasks, calculate critical path
- **Database Tables**: `schedules`, `schedule_tasks`, `task_dependencies`, `working_calendar`, `calendar_exceptions`
- **Algorithms**: Critical Path Method (CPM), auto-scheduling, slack/float calculation

**Planned Coverage**:
- Work Breakdown Structure (WBS)
- Task Dependency Types (Finish-to-Start, etc.)
- Critical Path Method (CPM) Algorithm
- Auto-Scheduling Engine
- Working Calendar Management
- Gantt Chart Rendering

---

### [15. Resource Tracker (Capacity Planning)](./15-resource-tracker.md)
**Status**: To Be Created ⭐ **COMPLEX MODULE**
- **Screens**: Resource List, Heatmap View (Month/Week/Day), Create Resource, Workload Assignment
- **Key Features**: Capacity planning, heatmap visualizations, load calculation, RAG status by utilization
- **User Journeys**: Add resource, assign workload, view heatmap, drill down to day level
- **Database Tables**: `resources`, `resource_workload`
- **Visualizations**: Monthly heatmap, weekly drill-down, daily bubble view, GitHub-style heatmap
- **Load Calculation**: Load% = (Workload ÷ Availability) × 100
- **RAG Status**: Green (<80%), Amber (80-100%), Red (>100%)

**Planned Coverage**:
- Load Calculation Algorithm
- Heatmap Generation (Month/Week/Day)
- RAG Status by Utilization
- Drill-Down Navigation
- Overallocation Alerts

---

## Additional Modules (Priority 3)

### [16. Scrum Rooms (Interactive Ceremonies)](./16-scrum-rooms.md)
**Status**: To Be Created
- **Screens**: Scrum Rooms List, Planning Poker Room, Retrospective Room, Sprint Planning Room, Refinement Room
- **Key Features**: Interactive boards, Planning Poker estimation, Retrospective voting, real-time collaboration
- **User Journeys**: Create poker room, conduct retrospective, export results
- **Database Tables**: `scrum_rooms`, `scrum_room_cards`, `scrum_room_votes`

**Planned Coverage**:
- Planning Poker Logic
- Retrospective Board Types
- Sprint Planning Sandbox
- Export Session Results

---

### [17. Standalone MOM (Meeting Minutes)](./17-standalone-mom.md)
**Status**: To Be Created
- **Screens**: MOM List, Create MOM, MOM Details, Upload File for AI Parsing
- **Key Features**: AI-powered MOM generation, file upload (.txt, .pdf, .docx), structured format, export to TXT/DOCX
- **User Journeys**: Create MOM manually, upload file for AI parsing, export to DOCX
- **Database Tables**: `standalone_mom`
- **AI Integration**: Groq API for parsing uploaded documents

**Planned Coverage**:
- AI Parsing of Uploaded Documents
- Structured MOM Format (Agenda, Discussion, Decisions, Action Items)
- Export to TXT and DOCX

---

### [18. Form Builder (Artifact Templates)](./18-form-builder.md)
**Status**: To Be Created
- **Screens**: Templates List, Template Builder (drag-and-drop), Create Instance, Instance Details
- **Key Features**: Dynamic form creation, field types (text, date, dropdown, numeric, tags), version control
- **User Journeys**: Create template, define fields, generate instance, fill and submit
- **Database Tables**: `artifact_templates`, `artifact_instances`, `artifact_versions`
- **Field Types**: Text, Number, Date, Dropdown, Multi-select, Tags, File Upload

**Planned Coverage**:
- Template Creation Logic
- Field Type Implementations
- Instance Generation from Template
- Version Control Mechanism

---

## Documentation Status

| Module | File | Status | Complexity | Pages |
|--------|------|--------|------------|-------|
| 01. Authentication | 01-authentication-authorization.md | ✅ Complete | Medium | 35 |
| 02. Projects | 02-projects.md | ✅ Complete | Medium | 30 |
| 03. Sprints | 03-sprints.md | ⏳ Planned | Medium | ~25 |
| 04. Cards | 04-cards.md | ⏳ Planned | Medium | ~25 |
| 05. Snaps | 05-snaps-daily-standups.md | ⏳ Planned | **High** | ~45 |
| 06. Standup Book | 06-standup-book.md | ⏳ Planned | Medium | ~25 |
| 07. Team & Assignees | 07-team-assignees.md | ⏳ Planned | Low | ~20 |
| 08. Dashboard | 08-dashboard.md | ⏳ Planned | Medium | ~20 |
| 09. RACI Matrix | 09-raci-matrix.md | ⏳ Planned | Low | ~20 |
| 10. Risk Register | 10-risk-register.md | ⏳ Planned | Medium | ~25 |
| 11. AID Logs | 11-assumptions-issues-decisions.md | ⏳ Planned | Low | ~25 |
| 12. Stakeholders | 12-stakeholders-power-interest.md | ⏳ Planned | Medium | ~25 |
| 13. Change Management | 13-change-management.md | ⏳ Planned | Medium | ~30 |
| 14. Schedule Builder | 14-schedule-builder.md | ⏳ Planned | **Very High** | ~50 |
| 15. Resource Tracker | 15-resource-tracker.md | ⏳ Planned | **High** | ~40 |
| 16. Scrum Rooms | 16-scrum-rooms.md | ⏳ Planned | Medium | ~30 |
| 17. Standalone MOM | 17-standalone-mom.md | ⏳ Planned | Medium | ~20 |
| 18. Form Builder | 18-form-builder.md | ⏳ Planned | Medium | ~25 |

**Total Estimated Pages**: ~515 pages of comprehensive documentation

---

## How to Use This Documentation

### For Developers
1. Start with **Authentication** to understand the security model
2. Read **Projects** and **Sprints** to grasp the core workflow
3. Deep-dive into **Snaps** for the AI parsing logic
4. Reference API Endpoints sections for implementation

### For Product Managers
1. Focus on "User Journeys" sections
2. Review "Business Rules" to understand constraints
3. Use "Common Issues & Solutions" for troubleshooting

### For QA/Testers
1. Use "User Actions" sections as test cases
2. Reference "Validations" for test scenarios
3. Check "Edge Cases" for negative testing

### For DevOps/Infrastructure
1. Review "Database Schema" sections
2. Check "Integration Points" for service dependencies
3. Reference security best practices in Authentication module

---

## Key Concepts & Terminology

### RAG Status
**Red/Amber/Green** traffic light system for health indicators:
- **Red**: Critical issues, blocked, behind schedule
- **Amber**: At risk, needs attention, minor blockers
- **Green**: On track, progressing well, no issues

### Snap
A daily standup update for a specific card. Contains:
- Raw text input (free-form)
- Parsed structured data (Done/ToDo/Blockers)
- Suggested RAG status (AI-generated)
- Final RAG status (can be overridden by SM)

### Sprint Status Workflow
```
UPCOMING → ACTIVE → COMPLETED → CLOSED
```

### Card Status Workflow
```
NOT_STARTED → IN_PROGRESS → COMPLETED → CLOSED
```

### Roles
- **Scrum Master (SM)**: Full access to all features
- **Product Owner (PO)**: High access, cannot delete projects/sprints
- **PMO**: Read-only access for oversight

### Permissions
30+ granular permissions controlling specific actions (e.g., `CREATE_PROJECT`, `LOCK_DAILY_SNAPS`, `EDIT_ANY_SNAP`)

---

## Cross-Module Data Flows

### Daily Standup Flow
```
User creates Snap → AI parses text → Calculates RAG →
Updates Card RAG → Aggregates to Sprint RAG →
Aggregates to Project RAG → Reflects in Dashboard
```

### Sprint Closure Flow
```
SM closes Sprint → All cards in Sprint transition to CLOSED →
Final RAG status frozen → Historical data preserved →
Standup Book archived → New sprint can begin
```

### Team Assignment Flow
```
Create Team Member (global pool) → Assign to Project →
Member available for Card assignment → Track workload in Resource Tracker
```

---

## Technical Architecture

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (access + refresh tokens)
- **AI**: Groq API (llama-3.3-70b-versatile), Ollama (local)
- **Email**: Nodemailer with Handlebars templates
- **File Generation**: docx library, ExcelJS, PDFKit

### Frontend
- **Framework**: React with TypeScript
- **State Management**: Context API
- **HTTP Client**: Axios with interceptors
- **UI Components**: Tailwind CSS, Headless UI
- **Charts**: Chart.js, Recharts
- **Date Handling**: date-fns

### Database Design Principles
- **UUIDs** for all primary keys
- **Soft deletes** where applicable (isArchived, isActive flags)
- **Eager loading** for frequently accessed relations
- **Cascading deletes** for parent-child relationships
- **Audit trails** (createdAt, updatedAt timestamps)

---

## File Locations

### Backend (NestJS)
```
F:\StandupSnap\backend\src\
├── auth/                 # Authentication & authorization
├── project/              # Project management
├── sprint/               # Sprint lifecycle
├── card/                 # Card (task) management
├── snap/                 # Daily snaps (core module)
├── standup-book/         # Historical standup tracking
├── team-member/          # Team member management
├── assignee/             # Assignee analytics
├── dashboard/            # Dashboard aggregations
├── artifacts/            # All artifact modules (RACI, Risk, etc.)
├── resource/             # Resource capacity planning
├── scrum-rooms/          # Interactive scrum ceremonies
├── standalone-mom/       # Meeting minutes
├── entities/             # TypeORM entity definitions
└── database/             # Seeders and migrations
```

### Frontend (React)
```
F:\StandupSnap\frontend\src\
├── pages/                # All page components
│   ├── projects/
│   ├── sprints/
│   ├── cards/
│   ├── snaps/
│   └── ...
├── components/           # Reusable UI components
├── services/api/         # API client functions
├── context/              # React context providers
├── types/                # TypeScript type definitions
└── hooks/                # Custom React hooks
```

---

## Contributing to Documentation

When adding new features or modifying existing modules:

1. **Update the relevant module documentation**
2. **Follow the established structure**:
   - Screens & Pages
   - User Actions (with complete flow)
   - API calls with request/response examples
   - Database queries
   - Validations and error handling
3. **Add new user journeys** if workflow changes
4. **Update the index** (this file) with new sections
5. **Include diagrams** where helpful (ASCII art acceptable)
6. **Keep examples realistic** (use actual field names, URLs)

---

## Quick Reference

### Most Complex Modules (Require Deep Understanding)
1. **Snaps** - AI parsing, RAG calculation, locking mechanism
2. **Schedule Builder** - CPM algorithm, auto-scheduling, dependencies
3. **Resource Tracker** - Load calculations, heatmap generation, drill-downs

### Most Frequently Used Modules
1. **Authentication** - Every user interaction
2. **Projects** - Foundation for all work
3. **Snaps** - Daily usage in standups
4. **Dashboard** - Default landing page

### Critical Business Logic
- **RAG Calculation**: See Snaps module
- **Sprint Status Transitions**: See Sprints module
- **Permissions Enforcement**: See Authentication module
- **Critical Path Method**: See Schedule Builder module

---

## Support & Contact

For questions about this documentation:
1. Check the specific module documentation first
2. Review "Common Issues & Solutions" sections
3. Search for the specific API endpoint or feature
4. Refer to the source code files listed in each section

**Documentation Maintainer**: Development Team
**Last Review Date**: 2025-12-30
**Next Planned Update**: When new features are added

---

## Appendix: Complete API Endpoint Map

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Authenticate
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get profile

### Projects
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `PATCH /api/projects/:id/archive` - Archive project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/team` - Get team
- `POST /api/projects/:id/team` - Add team members
- `DELETE /api/projects/:id/team/:memberId` - Remove member

### Sprints
- `GET /api/sprints?projectId=` - List sprints
- `GET /api/sprints/:id` - Get sprint
- `POST /api/sprints` - Create sprint
- `POST /api/sprints/generate` - Auto-generate sprints
- `PATCH /api/sprints/:id` - Update sprint
- `POST /api/sprints/:id/close` - Close sprint
- `DELETE /api/sprints/:id` - Delete sprint

### Cards
- `GET /api/cards?projectId=&sprintId=` - List cards
- `GET /api/cards/:id` - Get card
- `POST /api/cards` - Create card
- `PATCH /api/cards/:id` - Update card
- `POST /api/cards/:id/complete` - Mark completed
- `DELETE /api/cards/:id` - Delete card

### Snaps
- `GET /api/snaps/card/:cardId` - Get snaps for card
- `GET /api/snaps/sprint/:sprintId/date/:date` - Get snaps for day
- `POST /api/snaps` - Create snap
- `POST /api/snaps/parse` - Parse only (no save)
- `PATCH /api/snaps/:id` - Update snap
- `DELETE /api/snaps/:id` - Delete snap
- `POST /api/snaps/lock-daily` - Lock daily snaps
- `GET /api/snaps/summary/:sprintId/:date` - Get summary

### Standup Book
- `GET /api/standup-book/sprint-days/:sprintId` - Get all days
- `GET /api/standup-book/snaps/:sprintId?date=` - Get snaps for day
- `POST /api/standup-book/lock-day` - Lock day
- `POST /api/standup-book/mom` - Create MOM
- `GET /api/standup-book/mom/:sprintId?date=` - Get MOM

### Dashboard
- `GET /api/dashboard?projectId=` - Get dashboard data
- `GET /api/dashboard/projects` - Get user's projects

### Artifacts (Risks, Stakeholders, Changes, etc.)
- `GET /api/artifacts/risks/project/:projectId` - List risks
- `POST /api/artifacts/risks` - Create risk
- `PATCH /api/artifacts/risks/:id` - Update risk
- (Similar patterns for assumptions, issues, decisions, stakeholders, changes)

### Resources
- `GET /api/resources/project/:projectId` - List resources
- `POST /api/resources` - Create resource
- `GET /api/resources/:id/heatmap` - Get heatmap data

### Schedule
- `GET /api/artifacts/schedules/project/:projectId` - Get schedule
- `POST /api/artifacts/schedules` - Create schedule
- `POST /api/artifacts/schedules/:id/tasks` - Add task
- `POST /api/artifacts/schedules/:id/auto-schedule` - Auto-schedule

### Scrum Rooms
- `GET /api/scrum-rooms/project/:projectId` - List rooms
- `POST /api/scrum-rooms` - Create room
- `GET /api/scrum-rooms/:id` - Get room details

---

**End of Index**
