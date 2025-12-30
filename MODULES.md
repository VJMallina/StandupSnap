# StandupSnap - Application Modules

## Overview
StandupSnap is a comprehensive enterprise-grade agile project management platform with AI-powered insights, extensive artifact management, and advanced scheduling capabilities.

---

## BACKEND MODULES (20+ modules)

### Core Features

#### 1. Authentication & Authorization (`auth/`)
- **Purpose**: User authentication and role-based access control
- **Features**:
  - User registration, login, logout
  - JWT token management (access + refresh tokens)
  - Password reset via email
  - Role-based access control (RBAC) with 3 roles: Scrum Master, Product Owner, PMO
  - 30+ granular permissions for fine-grained access
  - Guards: JWT, Roles, Permissions

#### 2. User Management (`users/`)
- **Purpose**: User profile and account management
- **Features**:
  - User CRUD operations
  - Profile management
  - Account activation/deactivation
  - User settings

#### 3. Project Management (`project/`)
- **Purpose**: Core project lifecycle management
- **Features**:
  - Create/edit/delete/archive projects
  - Assign Product Owner and PMO
  - Multi-project support
  - Project context switching
  - Start/end date management

#### 4. Sprint Management (`sprint/`)
- **Purpose**: Sprint lifecycle and tracking
- **Features**:
  - Create sprints with goals and dates
  - Sprint status workflow: PLANNING → ACTIVE → COMPLETED
  - Sprint closure mechanism
  - No overlapping sprints validation
  - Auto-generation of sprint cycles
  - Daily standup slot configuration

#### 5. Card Management (`card/`)
- **Purpose**: Task/story tracking within sprints
- **Features**:
  - Card CRUD with title, description, priority, estimated time
  - Status workflow: NOT_STARTED → IN_PROGRESS → COMPLETED → CLOSED
  - Priority levels: LOW, MEDIUM, HIGH, CRITICAL
  - External ID for Jira integration
  - Assignee assignment
  - Auto-status transitions
  - RAG status tracking

#### 6. Snap Management (`snap/`) ⭐ CORE MODULE
- **Purpose**: Daily standup updates with AI parsing
- **Features**:
  - Free-form text input for daily updates
  - AI parsing using Groq API (llama-3.3-70b-versatile)
  - Parses into Done/ToDo/Blockers
  - AI-suggested RAG status (overridable)
  - Daily lock mechanism to freeze snapshots
  - Edit/delete only today's snaps (before lock)
  - Auto-transition card to IN_PROGRESS
  - Multi-slot standup support
  - RAG computation logic considering timeline, blockers, progress

#### 7. Standup Book (`standup-book/`)
- **Purpose**: Historical standup tracking and reporting
- **Features**:
  - Calendar view of daily standups
  - Day-wise summaries grouped by team member
  - Export to Word (DOCX) format
  - Historical tracking and comparison
  - Snap count indicators
  - Read-only historical record

#### 8. Team Member Management (`team-member/`)
- **Purpose**: Team roster and assignment management
- **Features**:
  - Add team members with designation, email, phone
  - Multi-project assignments
  - Team member pool management
  - Workload tracking

#### 9. Assignee Tracking (`assignee/`)
- **Purpose**: Individual performance and workload analytics
- **Features**:
  - Assignee performance tracking
  - Workload distribution analysis
  - Historical snap tracking per assignee
  - Individual dashboards

#### 10. Dashboard (`dashboard/`)
- **Purpose**: Real-time project health overview
- **Features**:
  - RAG status distribution
  - Recent activity feed
  - Sprint progress tracking
  - Team workload view
  - Quick actions

#### 11. Invitation System (`invitation/`)
- **Purpose**: Email-based team invitations
- **Features**:
  - Send email invitations
  - Assign roles on invitation
  - Track invitation status: PENDING, ACCEPTED, EXPIRED
  - Invitation expiry handling

#### 12. Email Service (`mail/`)
- **Purpose**: Email notifications and templates
- **Features**:
  - Password reset emails
  - Invitation emails
  - Handlebars templates
  - SMTP configuration

#### 13. Standup Generator (`standup/`)
- **Purpose**: Legacy standup generation (superseded by Snap)
- **Features**:
  - Generate simple standup summaries
  - Uses Ollama for local AI processing

---

### Artifacts Module ⭐ COMPREHENSIVE

A mega-module containing multiple sub-features:

#### 14. RACI Matrix (`raci-matrix.*`)
- Define Responsible, Accountable, Consulted, Informed roles
- Map team members to deliverables
- Multiple matrices per project
- Export capabilities

#### 15. Risk Register (`risk.*`)
- Track risks with impact, likelihood, severity
- Risk status: IDENTIFIED, ASSESSED, MITIGATING, RESOLVED, ACCEPTED
- Mitigation strategies and owners
- Risk history tracking
- Archive closed risks

#### 16. Assumption Management (`assumption.*`)
- Track project assumptions
- Validation status
- Impact assessment

#### 17. Issue Tracking (`issue.*`)
- Log and track project issues
- Priority and resolution tracking
- Status workflow

#### 18. Decision Log (`decision.*`)
- Document key decisions
- Context and outcomes
- Decision history

#### 19. Stakeholder Register (`stakeholder.*`)
- Stakeholder information tracking
- Power-Interest Grid classification (HIGH/MEDIUM/LOW)
- Quadrant analysis: Key Players, Keep Satisfied, Keep Informed, Monitor
- Engagement strategies
- Communication planning

#### 20. Change Management (`change.*`)
- Track project changes with approval workflow
- Change types: MINOR, MAJOR, EMERGENCY, STANDARD
- Status: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → IN_PROGRESS → IMPLEMENTED → CLOSED
- Impact assessment and rollback planning
- Testing requirements
- CSV export

#### 21. Schedule Builder (`schedule.*, auto-schedule.*, critical-path.*, calendar.*`) ⭐ ADVANCED
- **Purpose**: MS Project-like Gantt chart functionality
- **Features**:
  - Work Breakdown Structure (WBS) with hierarchical tasks
  - Task dependencies (FS/SS/FF/SF) with lag
  - Critical Path Method (CPM) calculations
  - Auto-scheduling based on dependencies
  - Working days calendar with holidays
  - Gantt chart visualization with drag-and-drop
  - Resource assignment to tasks
  - Milestones support
  - Progress tracking
  - Slack/float calculations

#### 22. Artifact Templates & Instances (`artifact-templates.*, artifact-instances.*`)
- **Purpose**: Form Builder for dynamic document templates
- **Features**:
  - Create configurable document templates
  - Drag-and-drop form components
  - Field types: text, dropdown, date, numeric, tags, etc.
  - Save and reuse templates
  - Generate document instances from templates
  - Version control

---

### Additional Modules

#### 23. Resource Management (`resource/`) ⭐ COMPREHENSIVE
- **Purpose**: Resource capacity planning and tracking
- **Features**:
  - Resource CRUD (name, role, skills, availability)
  - Weekly availability and workload allocation
  - Auto-calculated Load% = (Workload ÷ Availability) × 100
  - RAG status: Green (<80%), Amber (80-100%), Red (>100%)
  - Monthly/Weekly/Daily heatmap visualizations
  - GitHub-style daily heatmap
  - Bubble view for load visualization
  - Thermal load bars
  - Drill-down navigation (Month → Week → Day)
  - Export heatmaps (PDF, Excel)
  - Filter by role, name, load%, status
  - Resource notes and constraints
  - Over/under utilization alerts
  - Archive resources

#### 24. Scrum Rooms (`scrum-rooms/`)
- **Purpose**: Interactive collaborative boards for Agile ceremonies
- **Features**:
  - Planning Poker (estimation with configurable decks)
  - Retrospective boards (columns, voting)
  - Sprint Planning sandbox
  - Backlog Refinement
  - Standalone MOM room
  - Independent of sprint/card structure
  - Exportable session results

#### 25. Standalone MOM (`standalone-mom/`)
- **Purpose**: Minutes of Meeting generation
- **Features**:
  - Create standalone meeting minutes
  - AI-powered generation from raw notes
  - Upload .txt, .pdf, .docx for AI parsing
  - Structured format: Agenda, Discussion, Decisions, Action Items
  - Export to TXT and DOCX
  - Project association
  - Meeting date tracking

#### 26. Database Management (`database/`)
- **Purpose**: Database seeders and initial data
- **Features**:
  - Seed roles and permissions
  - Initial user creation
  - Sample data generation

#### 27. Entities (`entities/`)
- **Purpose**: TypeORM entity definitions
- **Key Entities**: User, Project, Sprint, Card, Snap, TeamMember, Risk, Stakeholder, Change, Resource, Schedule, ScheduleTask, TaskDependency, ScrumRoom, StandaloneMom, ArtifactTemplate, ArtifactInstance, and more

#### 28. Scripts (`scripts/`)
- **Purpose**: Maintenance and migration scripts
- **Scripts**:
  - Cleanup test data
  - Fix user projects
  - Fix artifact columns
  - Seed artifact templates

---

## FRONTEND MODULES (45+ pages)

### Authentication Pages
- **LoginPage**: User login
- **RegisterPage**: User registration
- **ForgotPasswordPage**: Password reset request
- **ResetPasswordPage**: Password reset form
- **UnauthorizedPage**: Access denied page

### Core Pages
- **DashboardPage**: Main dashboard with project health overview
- **ProfilePage**: User profile management

### Project Management
- **ProjectsListPage**: List all projects
- **CreateProjectPage**: Create new project
- **EditProjectPage**: Edit project details
- **ProjectDetailsPage**: View project details
- **TeamManagementPage**: Manage project team members
- **TeamPage**: Team overview

### Sprint Management
- **SprintsListPage**: List sprints
- **CreateSprintPage**: Create sprint
- **SprintDetailsPage**: View sprint details

### Card Management
- **CardsListPage**: List cards
- **CardDetailsPage**: View card details
- **CardsPage**: Card management overview

### Snap Management
- **SnapsPage**: Daily snaps overview
- **DailySnapsPage**: Daily snap creation/editing
- **StandupBookPage**: Historical standup book
- **StandupBookDayDetailsPage**: Daily standup details
- **StandupsPage**: Standup management

### Assignee Management
- **AssigneeListPage**: List assignees
- **AssigneeDetailsPage**: Assignee performance details

### Artifacts
- **ArtifactsHubPage**: Artifacts landing page
- **ArtifactsPage**: RACI Matrix management
- **RAIDLogPage**: Unified RAID view
- **RisksPage**: Risk register
- **AssumptionsPage**: Assumptions tracking
- **IssuesPage**: Issues log
- **DecisionsPage**: Decision log
- **StakeholderRegisterPage**: Stakeholder management
- **PowerInterestGridPage**: Power-Interest analysis
- **ChangesPage**: Change management
- **ResourceTrackerPage**: Resource capacity planning
- **ScheduleBuilderPage**: Gantt chart scheduler
- **DocumentTemplatesPage**: Form builder templates
- **DocumentDetailPage**: Template/instance details

### Scrum Rooms
- **ScrumRoomsPage**: List scrum rooms
- **ScrumRoomDetailPage**: Room details

### Meeting Minutes
- **StandaloneMomListPage**: List MOMs
- **StandaloneMomFormPage**: Create/edit MOM
- **StandaloneMomDetailPage**: View MOM details

### Reports
- **ReportsPage**: Reports and analytics

---

## Frontend Components & Infrastructure

### Components (`components/`)
- **artifacts/**: Artifact-specific components
- **risks/**: Risk management UI
- **stakeholders/**: Stakeholder components
- **schedule/**: Schedule builder components (GanttChart, TaskListPanel, TaskFormModal, etc.)
- Reusable UI components throughout

### Services (`services/api/`)
- API service layer with axios
- Endpoints for all backend modules
- Type-safe API calls

### Context (`context/`)
- **AuthContext**: Authentication state management
- **ProjectSelectionContext**: Project selection state

### Types (`types/`)
- TypeScript type definitions
- Interfaces for all entities
- Enums matching backend

### Hooks (`hooks/`)
- Custom React hooks
- Reusable logic

---

## KEY TECHNICAL FEATURES

### AI Integration
1. **Groq API** (llama-3.3-70b-versatile): Snap parsing, RAG suggestions, MOM generation
2. **Ollama** (local): Simple standup generation (legacy)

### RAG System
- **Card-level**: Based on latest snap
- **Sprint-level**: Majority rule with worst-case tie-breaker
- **Project-level**: Aggregated sprint RAG
- **Computation factors**: Timeline deviation, consecutive days without progress, blocker severity

### Security
- JWT authentication with refresh tokens
- 3 roles: Scrum Master, Product Owner, PMO
- 30+ granular permissions
- Guards at controller level

### Export Capabilities
- Word (DOCX): Standup book, MOMs
- PDF: Reports, heatmaps
- Excel: Resources, changes, risks
- CSV: Various artifacts

---

## MODULE COUNT SUMMARY

- **Backend Modules**: 28 modules
- **Frontend Pages**: 45+ pages
- **Artifacts Sub-modules**: 9 major artifact types
- **Total Features**: 100+ distinct use cases

---

## Technology Stack

### Backend
- NestJS (Node.js framework)
- TypeORM
- PostgreSQL
- JWT Authentication
- Groq AI API
- Ollama (local AI)

### Frontend
- React
- TypeScript
- Axios
- Context API for state management

---

**Generated**: 2025-12-30
