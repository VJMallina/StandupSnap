# Role-Based Access Control (RBAC) Testing Documentation

This document describes the comprehensive test suite for the StandupSnap RBAC system, covering both backend and frontend components.

## Test Coverage Overview

### Backend Tests

#### 1. **PermissionsGuard Unit Tests** (`backend/src/auth/guards/permissions.guard.spec.ts`)
Tests the NestJS guard that enforces permission-based access control.

**Coverage:**
- Returns true when no permissions are required
- Returns false when user is not authenticated
- Returns false when user has no roles
- Returns true when user has required permissions
- Returns true when user has at least one of multiple required permissions
- Returns false when user lacks all required permissions
- Handles edge cases (null permissions, non-array permissions, etc.)
- Correctly aggregates permissions from multiple roles

**Run with:**
```bash
cd backend
npm test -- permissions.guard.spec.ts
```

#### 2. **RolesGuard Unit Tests** (`backend/src/auth/guards/roles.guard.spec.ts`)
Tests the NestJS guard that enforces role-based access control.

**Coverage:**
- Returns true when no roles are required
- Returns false when user is not authenticated
- Returns false when user has no roles
- Returns true when user has required role
- Returns true when user has at least one of multiple required roles
- Returns false when user lacks all required roles
- Handles multiple roles correctly

**Run with:**
```bash
cd backend
npm test -- roles.guard.spec.ts
```

#### 3. **AuthService Unit Tests** (`backend/src/auth/auth.service.spec.ts`)
Tests authentication service including role assignment during registration.

**Coverage:**
- User registration with role assignment
- User login with role information retrieval
- Token generation and validation
- Profile retrieval with roles
- Error handling for invalid credentials
- Duplicate email handling

**Run with:**
```bash
cd backend
npm test -- auth.service.spec.ts
```

#### 4. **AuthController Integration Tests** (`backend/src/auth/auth.controller.integration.spec.ts`)
End-to-end tests for the authentication API with RBAC.

**Coverage:**
- POST /auth/register - Registration with default role assignment
- POST /auth/login - Login returning user with roles and permissions
- GET /auth/profile - Profile retrieval with role information
- POST /auth/refresh - Token refresh
- POST /auth/logout - Logout
- Role consistency throughout auth lifecycle
- Role metadata verification

**Run with:**
```bash
cd backend
npm test -- auth.controller.integration.spec.ts
```

**Prerequisites:**
- Database must be running (docker-compose up postgres)
- All migrations must be applied
- Roles must be seeded

### Frontend Tests

#### 1. **RBAC E2E Tests** (`frontend/e2e/rbac.spec.ts`)
Comprehensive Playwright tests for role-based UI behavior.

**Test Suites:**

##### Role Display
- Displays user role badge on dashboard
- Displays multiple roles if user has them
- Shows correct role labels (Scrum Master, Product Owner, PMO)

##### Permission-Based UI Elements
- Shows quick action buttons for users with create permissions
- Shows view-only message for PMO users
- Hides action buttons when user lacks permissions

##### Protected Button Component
- Renders button when user has permission
- Does not render button when user lacks permission
- Respects fallback content

##### Role Badge Styling
- Displays role badge with correct styling
- Shows role text clearly

##### Dashboard Integration
- Loads dashboard with role-specific content
- Maintains role information after page refresh
- Clears role information after logout

##### Quick Actions
- Shows "Create Project" action for authorized users
- Shows "Create Sprint" action for authorized users
- Shows "Invite Team" action for authorized users

**Run with:**
```bash
cd frontend
npm run test:e2e -- rbac.spec.ts
```

**Run with UI mode:**
```bash
cd frontend
npm run test:e2e:ui -- rbac.spec.ts
```

#### 2. **Existing Auth Tests** (`frontend/e2e/auth.spec.ts`)
- User registration flow
- User login flow
- Authentication persistence
- Logout functionality

#### 3. **Existing Protected Routes Tests** (`frontend/e2e/protected-routes.spec.ts`)
- Route protection for unauthenticated users
- Access control for authenticated users

## Running All Tests

### Backend Tests

Run all backend tests:
```bash
cd backend
npm test
```

Run tests with coverage:
```bash
cd backend
npm test -- --coverage
```

Run tests in watch mode:
```bash
cd backend
npm test -- --watch
```

Run specific test file:
```bash
cd backend
npm test -- <test-file-name>
```

### Frontend Tests

Run all E2E tests:
```bash
cd frontend
npm run test:e2e
```

Run E2E tests in UI mode:
```bash
cd frontend
npm run test:e2e:ui
```

Run E2E tests in headed mode (see browser):
```bash
cd frontend
npm run test:e2e:headed
```

Run specific test file:
```bash
cd frontend
npm run test:e2e -- <test-file-name>
```

Debug tests:
```bash
cd frontend
npm run test:e2e:debug
```

## Test Environment Setup

### Backend Test Environment

1. **Database Setup**
```bash
docker-compose up -d postgres
```

2. **Environment Variables**
Ensure `.env` file has test database configuration:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=standupsnap
JWT_SECRET=your-secret-key-here
```

3. **Run Migrations and Seed**
```bash
cd backend
npm run build
npm start
# Wait for seeder to run, then stop
```

### Frontend Test Environment

1. **Backend Must Be Running**
```bash
# Option 1: Docker
docker-compose up -d backend

# Option 2: Local
cd backend
npm run start:dev
```

2. **Frontend Dev Server** (for UI testing)
```bash
cd frontend
npm run dev
```

3. **Playwright Setup**
```bash
cd frontend
npx playwright install
```

## Test Data

### Default Roles and Permissions

**Scrum Master** (All 19 permissions):
- create_project, edit_project, delete_project, view_project
- create_sprint, edit_sprint, delete_sprint, view_sprint
- add_team_member, remove_team_member, view_team_member
- create_standup, edit_own_standup, edit_any_standup
- delete_own_standup, delete_any_standup, view_standup
- send_invite, manage_roles

**Product Owner** (18 permissions - all except manage_roles):
- Same as Scrum Master except `manage_roles`

**PMO** (4 view-only permissions):
- view_project, view_sprint, view_team_member, view_standup

## CI/CD Integration

### GitHub Actions Example

```yaml
name: RBAC Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: standupsnap
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install backend dependencies
        run: cd backend && npm install

      - name: Run backend tests
        run: cd backend && npm test
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: postgres
          DATABASE_PASSWORD: postgres
          DATABASE_NAME: standupsnap

  frontend-e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: standupsnap
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../frontend && npm install

      - name: Install Playwright
        run: cd frontend && npx playwright install --with-deps

      - name: Start backend
        run: cd backend && npm run start:dev &
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: postgres
          DATABASE_PASSWORD: postgres
          DATABASE_NAME: standupsnap

      - name: Wait for backend
        run: |
          timeout 60 sh -c 'until curl -f http://localhost:3000/api/health; do sleep 1; done'

      - name: Run E2E tests
        run: cd frontend && npm run test:e2e
```

## Troubleshooting

### Backend Tests Failing

1. **Database Connection Issues**
   - Ensure PostgreSQL is running: `docker ps`
   - Check environment variables
   - Verify database migrations: `npm run migration:run`

2. **Role Seeding Issues**
   - Manually seed roles: Run backend once to execute seeder
   - Check roles exist: `docker exec standupsnap-postgres psql -U postgres -d standupsnap -c "SELECT * FROM roles;"`

### Frontend E2E Tests Failing

1. **Backend Not Running**
   - Start backend: `cd backend && npm run start:dev`
   - Verify backend health: `curl http://localhost:3000/api/health`

2. **Browser Issues**
   - Reinstall browsers: `cd frontend && npx playwright install`
   - Try headed mode: `npm run test:e2e:headed`

3. **Timing Issues**
   - Increase timeout in playwright.config.ts
   - Add explicit waits in tests

## Test Metrics

### Expected Coverage

- **Backend Unit Tests**: >80% code coverage
  - AuthService: 100%
  - Guards: 100%
  - Controllers: >90%

- **E2E Tests**: All critical user paths
  - Registration with role assignment
  - Login with role retrieval
  - Permission-based UI rendering
  - Role-based route protection

### Performance Benchmarks

- Unit tests should complete in <10 seconds
- Integration tests should complete in <30 seconds
- E2E tests should complete in <2 minutes

## Best Practices

1. **Test Isolation**
   - Each test should be independent
   - Use unique emails for E2E tests
   - Clean up test data after each test

2. **Test Naming**
   - Use descriptive test names
   - Follow pattern: "should [expected behavior] when [condition]"

3. **Assertions**
   - Test both positive and negative cases
   - Verify error messages
   - Check edge cases

4. **Maintenance**
   - Update tests when requirements change
   - Keep test data synchronized with seeders
   - Document complex test scenarios

## Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
