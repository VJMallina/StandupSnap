# StandupSnap

> A comprehensive agile project management platform with AI-powered daily standup tracking, sprint management, and project artifact management.

![Tech Stack](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Module Documentation](#module-documentation)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

StandupSnap is an enterprise-grade agile project management platform designed for Scrum Masters, Product Owners, and PMOs. It combines daily standup management with comprehensive project artifacts, enabling teams to track progress, manage risks, and maintain project documentation in one unified platform.

**Key Differentiators:**
- 🤖 AI-powered standup parsing and RAG status computation
- 📊 Advanced RAG (Red/Amber/Green) status tracking at card, sprint, and project levels
- 📝 Integrated Minutes of Meeting (MOM) with AI generation
- 🎯 Complete project artifacts management (RACI, RAID, Stakeholder Register, Change Management)
- 📈 Daily standup book with historical tracking and analytics
- 🔒 Role-based access control with 30+ granular permissions

## Key Features

### 🎯 Core Project Management
- **Multi-Project Management**: Create and manage multiple projects with team assignments
- **Sprint Planning & Tracking**: Complete sprint lifecycle management with closure workflows
- **Card Management**: Task/story tracking with priorities, status workflow, and RAG indicators
- **Team Management**: Multi-project team member assignments with role-based permissions

### 📊 Daily Standup Management
- **AI-Powered Snap Creation**: Natural language input parsed into Done/ToDo/Blockers
- **RAG Status Computation**: Intelligent status calculation based on progress, delays, and blockers
- **Daily Lock Mechanism**: Lock snaps daily to prevent retroactive changes
- **Standup Book**: Historical view of daily standups with team-wise summaries
- **Daily Summaries**: Auto-generated aggregated views of team progress

### 🎨 Project Artifacts
- **RACI Matrix**: Define Responsible, Accountable, Consulted, and Informed roles for deliverables
- **Risk Register**: Track risks with impact, likelihood, mitigation plans, and history
- **RAID Log**: Unified view of Risks, Assumptions, Issues, and Decisions
- **Stakeholder Register**: Manage stakeholders with Power-Interest Grid analysis
- **Change Management**: Track project changes with approval workflows and impact assessment
- **Minutes of Meeting**: AI-powered MOM generation from raw notes with export capabilities

### 🤖 AI Integration
- **Groq API**: Cloud-based LLM for standup parsing (llama-3.3-70b-versatile)
- **RAG Status AI**: Intelligent status computation considering timeline, blockers, and patterns
- **MOM AI Generation**: Automatically structure meeting notes into agenda, discussion, decisions, and action items

### 📈 Analytics & Reports
- **Dashboard**: Real-time project health overview with RAG summaries
- **Sprint Reports**: Detailed sprint performance analytics
- **Daily Summaries**: Team progress tracking with historical comparisons
- **RAG Trends**: Visual representation of project health over time
- **Team Performance**: Individual assignee performance tracking

### 🔐 Security & Authentication
- **JWT Authentication**: Access and refresh token management
- **Role-Based Access Control**: 3 primary roles (Scrum Master, Product Owner, PMO)
- **Granular Permissions**: 30+ permission levels for fine-grained access control
- **Password Reset**: Secure email-based password reset flow
- **Account Management**: Enable/disable accounts and session management

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js framework with TypeScript)
- **Database**: PostgreSQL 16+
- **ORM**: TypeORM with Entity-based modeling
- **Authentication**: JWT with refresh tokens (Passport.js)
- **Validation**: class-validator and class-transformer
- **Email**: Nodemailer with Handlebars templates
- **AI Integration**: Groq API (cloud LLM)
- **Document Processing**: pdf-parse, mammoth (DOCX), docx (generation)
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: React Router v7
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: React Context API
- **Charts**: Recharts for data visualization
- **Icons**: Heroicons
- **UI Components**: HeadlessUI for accessible components
- **Testing**: Playwright for E2E testing

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Deployment**: Fly.io ready with PostgreSQL database
- **Database Synchronization**: TypeORM sync (dev), migrations (prod)

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                        │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │Dashboard │ Sprints  │  Cards   │ Artifacts│  Standup Book│  │
│  └──────────┴──────────┴──────────┴──────────┴──────────────┘  │
│         │              Context API (Auth, Project Selection)     │
└─────────┼──────────────────────────────────────────────────────┘
          │ REST API (axios)
┌─────────┼──────────────────────────────────────────────────────┐
│         │           Backend (NestJS)                            │
│  ┌──────▼───────┬──────────┬──────────┬───────────┬─────────┐ │
│  │ Auth Module  │ Projects │ Sprints  │ Artifacts │  Snaps  │ │
│  └──────┬───────┴──────────┴──────────┴───────────┴─────────┘ │
│         │ Guards (JWT, Roles, Permissions)                      │
│         │                                                        │
│  ┌──────▼─────────────────────────────────────────────────┐   │
│  │              TypeORM (ORM Layer)                        │   │
│  └──────┬─────────────────────────────────────────────────┘   │
└─────────┼──────────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────┐
│                    PostgreSQL Database                          │
│  ┌─────────┬─────────┬─────────┬──────────┬──────────────┐    │
│  │ Users   │Projects │ Sprints │  Cards   │    Snaps     │    │
│  │ Roles   │Teams    │ Snaps   │Artifacts │ Stakeholders │    │
│  └─────────┴─────────┴─────────┴──────────┴──────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
backend/
├── src/
│   ├── auth/               # Authentication & authorization
│   ├── users/              # User management
│   ├── project/            # Project CRUD
│   ├── sprint/             # Sprint management
│   ├── card/               # Card/task management
│   ├── snap/               # Daily standup snaps
│   ├── standup/            # Standup generation (legacy)
│   ├── standup-book/       # Daily standup book
│   ├── team-member/        # Team member management
│   ├── assignee/           # Assignee tracking
│   ├── dashboard/          # Dashboard aggregations
│   ├── invitation/         # Email invitations
│   ├── artifacts/          # RACI, RAID, Stakeholders, Changes
│   ├── standalone-mom/     # Minutes of Meeting
│   ├── mail/               # Email service
│   ├── entities/           # TypeORM entities
│   └── database/           # Database seeders
│
frontend/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/              # Route-level page components
│   ├── context/            # React context providers
│   ├── services/           # API service layer
│   ├── types/              # TypeScript type definitions
│   └── hooks/              # Custom React hooks
```

## Getting Started

### Prerequisites

- **Node.js**: 18+ and npm
- **PostgreSQL**: 16+ (or use Docker)
- **Groq API Key**: Get from [Groq Console](https://console.groq.com/)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/VJMallina/StandupSnap.git
cd StandupSnap
```

2. **Set up Backend**
```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_USER=postgres
# DATABASE_PASSWORD=your_password
# DATABASE_NAME=standupsnap
# JWT_SECRET=your_jwt_secret_here
# JWT_REFRESH_SECRET=your_refresh_secret_here
# GROQ_API_KEY=your_groq_api_key_here
# GROQ_MODEL=llama-3.3-70b-versatile
# FRONTEND_URL=http://localhost:5173

# Start backend
npm run start:dev
```

3. **Set up Frontend**
```bash
cd frontend
npm install

# Create .env file
cp .env.example .env

# Configure environment variable
# VITE_API_URL=http://localhost:3000/api

# Start frontend
npm run dev
```

4. **Using Docker** (Alternative)
```bash
# Start both backend and database
docker-compose up -d

# Frontend runs locally
cd frontend && npm run dev
```

### Default Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **API Documentation**: http://localhost:3000/api/docs

### First Steps

1. Register a new account at `/register`
2. Create your first project
3. Add team members
4. Create a sprint
5. Add cards to the sprint
6. Start creating daily snaps!

## Module Documentation

### 1. Authentication & Authorization

**Location**: `backend/src/auth/`, `frontend/src/context/AuthContext.tsx`

**Features**:
- User registration with validation
- Login with username/email and password
- JWT access tokens (15min expiry) and refresh tokens (7 days)
- Password reset via email with tokens
- Role-based access control (RBAC)
- Permission-based guards for fine-grained access

**Roles**:
- `SCRUM_MASTER`: Primary role for managing daily standups
- `PRODUCT_OWNER`: Project stakeholder with oversight
- `PMO`: Project Management Office with cross-project visibility

**Key Permissions** (30+ total):
- Project: create, edit, delete, view, archive
- Sprint: create, edit, delete, view, close
- Card: create, edit, delete, view
- Snap: create, edit own/any, delete own/any, lock daily, generate summary
- Team: add members, remove members, edit members
- Artifacts: manage RACI, risks, stakeholders, changes

### 2. Project Management

**Location**: `backend/src/project/`, `frontend/src/pages/projects/`

**Features**:
- Create projects with name, description, start/end dates
- Assign Product Owner and PMO to projects
- Add team members with designations
- Archive/activate projects
- Multi-project support with project selection context

**Entities**: `Project`, `TeamMember`, `ProjectMember`

### 3. Sprint Management

**Location**: `backend/src/sprint/`, `frontend/src/pages/sprints/`

**Features**:
- Create sprints with goal, start/end dates
- Sprint status workflow: `PLANNING` → `ACTIVE` → `COMPLETED`
- Sprint closure prevents further snap creation
- No overlapping sprints per project
- Sprint-level RAG status aggregation

**Entities**: `Sprint`

### 4. Card Management

**Location**: `backend/src/card/`, `frontend/src/pages/cards/`

**Features**:
- Create cards with title, description, priority, estimated time
- Assign cards to team members
- Link cards to sprints
- Status workflow: `NOT_STARTED` → `IN_PROGRESS` → `COMPLETED` → `CLOSED`
- Priority levels: LOW, MEDIUM, HIGH, CRITICAL
- External ID field for integration with Jira/other tools
- RAG status based on latest snap

**Entities**: `Card`, `CardRAGHistory`

### 5. Snap Management (Daily Standups)

**Location**: `backend/src/snap/`, `frontend/src/pages/SnapsPage.tsx`

**Features**:
- Free-form text input for daily updates
- AI parsing into Done, ToDo, Blockers
- AI-suggested RAG status (overridable)
- Daily lock mechanism to freeze snapshots
- Edit/delete only today's snaps before lock
- Auto-transition card to IN_PROGRESS on first snap

**RAG Computation Logic**:
- **RED**: 2+ days without progress, >30% timeline delay, severe blockers
- **AMBER**: Minor delays (<30%), any blockers, no progress today
- **GREEN**: On track, consistent progress, no blockers

**Entities**: `Snap`, `DailySnapLock`

### 6. Standup Book

**Location**: `backend/src/standup-book/`, `frontend/src/pages/StandupBookPage.tsx`

**Features**:
- Calendar view of daily standups
- Day-wise standup summaries
- Team member grouping
- Export to Word (DOCX) format
- Historical tracking and comparison
- Snap count indicators

**Entities**: `DailySummary`, `DailyLock`

### 7. Artifacts Module

#### 7.1 RACI Matrix

**Location**: `backend/src/artifacts/raci-matrix.*`, `frontend/src/pages/ArtifactsPage.tsx`

**Features**:
- Define roles: Responsible, Accountable, Consulted, Informed
- Map team members to deliverables
- Multiple matrices per project
- Export capabilities

**Entities**: `RaciMatrix`, `RaciEntry`

#### 7.2 Risk Register

**Location**: `backend/src/artifacts/risk.*`, `frontend/src/pages/RisksPage.tsx`

**Features**:
- Track risks with category, description, impact, likelihood
- Risk severity calculation (impact × likelihood)
- Mitigation strategies and owners
- Risk status: IDENTIFIED, ASSESSED, MITIGATING, RESOLVED, ACCEPTED
- Risk history tracking for audit trail
- Archive closed risks

**Entities**: `Risk`, `RiskHistory`

#### 7.3 RAID Log

**Location**: `frontend/src/pages/RAIDLogPage.tsx`

**Features**:
- Unified view of Risks, Assumptions, Issues, Decisions
- Quick navigation to detailed views
- Status indicators for each category
- Summary statistics

**Sub-modules**:
- **Assumptions**: Track project assumptions with validation status
- **Issues**: Log and track project issues with priority and resolution
- **Decisions**: Document key decisions with context and outcomes

**Entities**: `Assumption`, `Issue`, `Decision`

#### 7.4 Stakeholder Register

**Location**: `backend/src/artifacts/stakeholder.*`, `frontend/src/pages/StakeholderRegisterPage.tsx`

**Features**:
- Stakeholder information tracking
- Power-Interest Grid classification
- Engagement strategies
- Communication planning
- Power levels: HIGH, MEDIUM, LOW
- Interest levels: HIGH, MEDIUM, LOW
- Quadrant analysis: Key Players, Keep Satisfied, Keep Informed, Monitor

**Entities**: `Stakeholder`

#### 7.5 Change Management

**Location**: `backend/src/artifacts/change.*`, `frontend/src/pages/ChangesPage.tsx`

**Features**:
- Track project changes with approval workflow
- Change types: MINOR, MAJOR, EMERGENCY, STANDARD
- Priority levels: LOW, MEDIUM, HIGH, CRITICAL
- Status workflow: DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → IN_PROGRESS → IMPLEMENTED → CLOSED
- Impact assessment and rollback planning
- Testing requirements documentation
- Affected systems tracking
- Requestor and approver assignment
- Archive implemented changes
- CSV export

**Entities**: `Change`

### 8. Minutes of Meeting (MOM)

**Location**: `backend/src/standalone-mom/`, `frontend/src/pages/StandaloneMom*.tsx`

**Features**:
- Create standalone meeting minutes
- AI-powered generation from raw notes (Groq API)
- Upload .txt, .pdf, .docx files for AI parsing
- Structured format: Agenda, Discussion Summary, Decisions, Action Items
- Export to TXT and DOCX formats
- Project association
- Meeting date tracking

**Entities**: `StandaloneMom`

### 9. Dashboard & Reports

**Location**: `backend/src/dashboard/`, `frontend/src/pages/DashboardPage.tsx`, `ReportsPage.tsx`

**Features**:
- Real-time project health overview
- RAG status distribution across projects
- Recent activity feed
- Sprint progress tracking
- Team member workload view
- Historical trend analysis
- Sprint burndown charts
- Daily progress reports

### 10. Team & Assignee Management

**Location**: `backend/src/team-member/`, `backend/src/assignee/`

**Features**:
- Add team members to projects
- Track designations and contact information
- Assignee performance tracking
- Workload distribution analysis
- Historical snap tracking per assignee

**Entities**: `TeamMember`, `User`

## API Documentation

### Authentication Endpoints

```
POST   /api/auth/register           # Register new user
POST   /api/auth/login              # Login
POST   /api/auth/logout             # Logout
POST   /api/auth/refresh            # Refresh access token
POST   /api/auth/forgot-password    # Request password reset
POST   /api/auth/reset-password     # Reset password with token
GET    /api/auth/me                 # Get current user
```

### Project Endpoints

```
GET    /api/projects                # List all projects
POST   /api/projects                # Create project
GET    /api/projects/:id            # Get project details
PUT    /api/projects/:id            # Update project
DELETE /api/projects/:id            # Delete project
PUT    /api/projects/:id/archive    # Archive project
```

### Sprint Endpoints

```
GET    /api/sprints                 # List sprints (filtered by project)
POST   /api/sprints                 # Create sprint
GET    /api/sprints/:id             # Get sprint details
PUT    /api/sprints/:id             # Update sprint
DELETE /api/sprints/:id             # Delete sprint
PUT    /api/sprints/:id/close       # Close sprint
```

### Card Endpoints

```
GET    /api/cards                   # List cards (filtered)
POST   /api/cards                   # Create card
GET    /api/cards/:id               # Get card details
PUT    /api/cards/:id               # Update card
DELETE /api/cards/:id               # Delete card
```

### Snap Endpoints

```
GET    /api/snaps                   # List snaps (filtered)
POST   /api/snaps                   # Create snap
PUT    /api/snaps/:id               # Update snap
DELETE /api/snaps/:id               # Delete snap
POST   /api/snaps/parse             # Parse raw text with AI
POST   /api/snaps/lock              # Lock daily snaps
GET    /api/snaps/daily-summary     # Get daily summary
```

### Artifacts Endpoints

```
# RACI Matrix
GET    /api/raci-matrices/project/:projectId
POST   /api/raci-matrices
GET    /api/raci-matrices/:id
PUT    /api/raci-matrices/:id
DELETE /api/raci-matrices/:id

# Risks
GET    /api/artifacts/risks/project/:projectId
POST   /api/artifacts/risks
GET    /api/artifacts/risks/:id
PUT    /api/artifacts/risks/:id
PUT    /api/artifacts/risks/:id/archive
GET    /api/artifacts/risks/:id/history
GET    /api/artifacts/risks/project/:projectId/export

# Stakeholders
GET    /api/artifacts/stakeholders/project/:projectId
POST   /api/artifacts/stakeholders
GET    /api/artifacts/stakeholders/:id
PUT    /api/artifacts/stakeholders/:id
PUT    /api/artifacts/stakeholders/:id/archive

# Changes
GET    /api/changes/project/:projectId
POST   /api/changes
GET    /api/changes/:id
PUT    /api/changes/:id
PUT    /api/changes/:id/archive
GET    /api/changes/project/:projectId/export

# RAID (Assumptions, Issues, Decisions - similar patterns)
```

### Complete API documentation available at: `http://localhost:3000/api/docs` (Swagger UI)

## Database Schema

### Core Entities

```
User
├── id (UUID, PK)
├── username (unique)
├── email (unique)
├── password (hashed)
├── firstName, lastName
├── isActive
├── resetPasswordToken
└── roles (many-to-many with Role)

Project
├── id (UUID, PK)
├── name
├── description
├── startDate, endDate
├── isActive
├── productOwnerId (FK to User)
├── pmoId (FK to User)
└── relations: sprints, teamMembers, cards, artifacts

Sprint
├── id (UUID, PK)
├── projectId (FK)
├── name, goal
├── startDate, endDate
├── status (PLANNING, ACTIVE, COMPLETED)
├── isClosed
└── relations: cards, snaps

Card
├── id (UUID, PK)
├── sprintId (FK)
├── projectId (FK)
├── title, description
├── externalId (for Jira integration)
├── priority (LOW, MEDIUM, HIGH, CRITICAL)
├── status (NOT_STARTED, IN_PROGRESS, COMPLETED, CLOSED)
├── estimatedTime
├── ragStatus (RED, AMBER, GREEN)
├── assigneeId (FK to TeamMember)
└── relations: snaps, ragHistory

Snap
├── id (UUID, PK)
├── cardId (FK)
├── rawText
├── done, toDo, blockers (AI parsed)
├── suggestedRag (AI)
├── finalRag (user override)
├── snapDate
├── isLocked
└── relations: card, creator

TeamMember
├── id (UUID, PK)
├── fullName, email
├── designation, phone
└── relations: projects (many-to-many)

Risk
├── id (UUID, PK)
├── projectId (FK)
├── title, description
├── category, riskType
├── impact, likelihood, riskScore
├── status, mitigationStrategy
├── ownerId (FK to TeamMember)
└── relations: history

Stakeholder
├── id (UUID, PK)
├── projectId (FK)
├── stakeholderName, role
├── powerLevel, interestLevel
├── quadrant (auto-computed)
└── engagementStrategy

Change
├── id (UUID, PK)
├── projectId (FK)
├── title, description
├── changeType, priority, status
├── impactAssessment
├── rollbackPlan
├── requestorId, approverId (FK to TeamMember)
└── implementationDate, approvedDate
```

## Deployment

### Using Docker

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Deploy to Fly.io

1. **Install Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login to Fly.io**
```bash
fly auth login
```

3. **Create Fly app and database**
```bash
# Backend
cd backend
fly launch
fly postgres create

# Attach database
fly postgres attach <database-name>

# Deploy
fly deploy
```

4. **Set environment variables**
```bash
fly secrets set JWT_SECRET=your_secret
fly secrets set JWT_REFRESH_SECRET=your_refresh_secret
fly secrets set GROQ_API_KEY=your_groq_api_key
```

5. **Frontend deployment** (Vercel/Netlify)
```bash
cd frontend
npm run build

# Deploy dist/ folder to Vercel or Netlify
```

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=standupsnap

# Alternative: Use DATABASE_URL for cloud deployments
# DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters

# AI Integration
GROQ_API_KEY=your_groq_api_key_from_console
GROQ_MODEL=llama-3.3-70b-versatile

# Email (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@standupsnap.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Server
PORT=3000
NODE_ENV=development
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api
```

## Development

### Backend Development

```bash
cd backend

# Development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run tests
npm test

# Generate TypeORM migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run
```

### Frontend Development

```bash
cd frontend

# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui
```

## Testing

### E2E Testing (Playwright)

```bash
cd frontend

# Run tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in headed mode
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

**Test Files**: `frontend/e2e/*.spec.ts`

### Backend Testing

```bash
cd backend

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Project Structure Details

### Backend Key Directories

```
backend/src/
├── auth/                   # JWT authentication, guards, strategies
│   ├── guards/            # JWT, roles, permissions guards
│   ├── strategies/        # Passport JWT strategies
│   └── decorators/        # Custom decorators for permissions
├── entities/              # TypeORM entity definitions
├── database/              # Database seeders and initial data
├── mail/                  # Email service with templates
├── artifacts/             # All artifact modules (RACI, RAID, etc.)
├── standup-book/          # Daily standup book functionality
└── standalone-mom/        # Minutes of Meeting module
```

### Frontend Key Directories

```
frontend/src/
├── components/
│   ├── artifacts/         # Artifact-specific components
│   ├── risks/             # Risk management components
│   ├── stakeholders/      # Stakeholder components
│   └── ...                # Other reusable components
├── pages/                 # Route-level page components
├── context/
│   ├── AuthContext.tsx    # Authentication state
│   └── ProjectSelectionContext.tsx  # Project selection state
├── services/
│   └── api/               # API service layer (axios)
└── types/                 # TypeScript type definitions
```

## Business Rules & Workflows

### Snap Creation Workflow

1. User selects a card in an active sprint
2. User enters free-form update text
3. System calls Groq AI to parse into Done/ToDo/Blockers
4. AI suggests RAG status based on content and history
5. User can override AI suggestions
6. Card auto-transitions to IN_PROGRESS if it was NOT_STARTED
7. Snap is saved with both AI and final RAG values

### Daily Lock Workflow

1. At end of day (manual or scheduled), Scrum Master locks snaps
2. System prevents further edits/deletes to locked snaps
3. Daily summary is generated aggregating all snaps
4. RAG history is frozen for all cards
5. Standup book entry is created

### RAG Aggregation Rules

**Card Level**: Uses the finalRag from the latest snap

**Sprint Level**:
- Count cards by RAG status
- Use majority rule (most common status)
- Tie-breaker: RED > AMBER > GREEN (worst case)

**Project Level**:
- Aggregate sprint RAG statuses
- Use worst-case logic
- Provides breakdown by sprint

### Change Management Workflow

1. Create change request in DRAFT status
2. Submit for approval → PENDING_APPROVAL
3. Approver reviews → APPROVED or REJECTED
4. If approved → IN_PROGRESS (implementation)
5. After implementation → IMPLEMENTED
6. After verification → CLOSED
7. Closed changes can be archived

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart db

# Check connection string
echo $DATABASE_URL
```

**2. Groq API Errors**
```bash
# Verify API key
curl -H "Authorization: Bearer $GROQ_API_KEY" \
  https://api.groq.com/openai/v1/models

# Check model availability
# Use llama-3.3-70b-versatile or llama3-8b-8192
```

**3. Frontend Can't Connect to Backend**
```bash
# Check CORS settings in backend main.ts
# Ensure FRONTEND_URL is set correctly
# Verify API_URL in frontend .env
```

**4. TypeORM Sync Issues**
```bash
# Drop and recreate database (dev only)
npm run migration:revert
npm run migration:run

# Or use synchronize: true in development
```

## Performance Optimization

### Backend
- Enable database connection pooling
- Use select specific fields instead of full entities
- Implement caching for frequently accessed data
- Use database indexes on foreign keys and query fields

### Frontend
- Code splitting with React.lazy()
- Memoize expensive computations
- Use virtual scrolling for large lists
- Optimize bundle size with tree shaking

## Security Best Practices

1. **Never commit secrets**: Use environment variables
2. **Rotate JWT secrets regularly**: Update in production
3. **Use HTTPS in production**: Enable SSL certificates
4. **Validate all inputs**: Use DTOs with class-validator
5. **Rate limiting**: Implement API rate limiting
6. **SQL Injection protection**: TypeORM parameterized queries
7. **XSS protection**: Sanitize user inputs
8. **CORS configuration**: Whitelist allowed origins

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Use TypeScript for type safety
- Follow ESLint rules
- Write unit tests for business logic
- Document complex functions
- Use meaningful variable names
- Keep functions small and focused

## Roadmap

### Planned Features

- [ ] Slack/Teams webhook integration
- [ ] Jira bidirectional sync
- [ ] Advanced analytics dashboard
- [ ] Custom report templates
- [ ] Mobile app (React Native)
- [ ] Real-time collaboration features
- [ ] AI-powered insights and recommendations
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Calendar integration
- [ ] Notification system

## License

MIT License - see LICENSE file for details

## Author

**Ravi Sandeep** ([@VJMallina](https://github.com/VJMallina))

---

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation in `/documents` folder
- Review API documentation at `/api/docs`

**Built with ❤️ for agile teams worldwide**
