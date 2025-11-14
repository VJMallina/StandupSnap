# StandupSnap Test Documentation

This document describes the testing strategy and how to run tests for the StandupSnap authentication module.

## Test Structure

### Backend Unit Tests (Jest)
Location: `backend/src/auth/*.spec.ts`

#### AuthService Tests (`auth.service.spec.ts`)
Tests the core authentication logic:
- ✅ User registration with password hashing
- ✅ User login with JWT generation
- ✅ Password validation
- ✅ Refresh token generation and validation
- ✅ Token revocation on logout
- ✅ User profile retrieval
- ✅ Duplicate email detection
- ✅ Invalid credentials handling
- ✅ Expired token handling

#### AuthController Tests (`auth.controller.spec.ts`)
Tests the API endpoints:
- ✅ POST /api/auth/register
- ✅ POST /api/auth/login
- ✅ POST /api/auth/refresh
- ✅ POST /api/auth/logout
- ✅ GET /api/auth/me

### Frontend E2E Tests (Playwright)
Location: `frontend/e2e/*.spec.ts`

#### Authentication Tests (`auth.spec.ts`)
Tests the complete authentication flow:
- ✅ Redirect to login when not authenticated
- ✅ Login form validation
- ✅ User registration
- ✅ Duplicate email registration prevention
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Logout functionality
- ✅ Authentication persistence on page refresh
- ✅ Form validation (required fields, password length)
- ✅ Loading states during API calls

#### Protected Routes Tests (`protected-routes.spec.ts`)
Tests route access control:
- ✅ Dashboard requires authentication
- ✅ Login/register accessible without auth
- ✅ Authenticated users can access dashboard
- ✅ Unknown routes redirect appropriately

## Running Tests

### Backend Unit Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test auth.service.spec.ts
```

### Frontend E2E Tests

**Prerequisites:**
- Ensure backend is running: `cd backend && npm run start:dev`
- Ensure frontend is running: `cd frontend && npm run dev`
- Playwright browsers installed: `npx playwright install`

```bash
cd frontend

# Run all E2E tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests (step through)
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests matching a pattern
npx playwright test --grep "should register"
```

### View Test Reports

```bash
# Backend coverage report
cd backend
npm run test:cov
# Open coverage/lcov-report/index.html

# Playwright test report
cd frontend
npx playwright show-report
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: standupsnap_test
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
        run: cd backend && npm ci

      - name: Run backend tests
        run: cd backend && npm test
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: postgres
          DATABASE_PASSWORD: postgres
          DATABASE_NAME: standupsnap_test

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: standupsnap_test

      ollama:
        image: ollama/ollama:latest
        ports:
          - 11434:11434

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci

      - name: Install Playwright browsers
        run: cd frontend && npx playwright install --with-deps

      - name: Start backend
        run: cd backend && npm run start:dev &
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          OLLAMA_URL: http://localhost:11434

      - name: Wait for backend
        run: npx wait-on http://localhost:3001/api/health

      - name: Run E2E tests
        run: cd frontend && npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Test Coverage Goals

- **Backend**: Aim for >80% code coverage
- **Frontend**: Cover all critical user flows
- **E2E**: Test complete authentication workflows

## Writing New Tests

### Backend Unit Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should do something', async () => {
    const result = await service.doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

### Frontend E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.getByRole('button', { name: /click me/i });

    // Act
    await button.click();

    // Assert
    await expect(page).toHaveURL('/expected-url');
  });
});
```

## Debugging Tests

### Backend Tests
```bash
# Use --verbose for detailed output
npm test -- --verbose

# Use --detectOpenHandles to find async issues
npm test -- --detectOpenHandles

# Run single test with console logs
npm test -- -t "test name"
```

### Frontend Tests
```bash
# Debug mode (step through)
npm run test:e2e:debug

# Run with browser visible
npm run test:e2e:headed

# Generate trace for debugging
npx playwright test --trace on
npx playwright show-trace trace.zip
```

## Common Issues

### Playwright Browser Installation (WSL/Linux)
If you see missing dependencies warning:
```bash
sudo npx playwright install-deps
```

### Database Connection in Tests
Ensure test database is configured:
```env
DATABASE_NAME=standupsnap_test
```

### Port Conflicts
If tests fail due to port already in use:
```bash
# Kill process on port
lsof -ti:3001 | xargs kill -9
```

## Test Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clear database/localStorage between tests
3. **Unique Data**: Use timestamps for unique test data
4. **Descriptive Names**: Test names should describe behavior
5. **Arrange-Act-Assert**: Structure tests clearly
6. **Mock External Services**: Don't call real APIs in unit tests
7. **Test User Perspective**: E2E tests should mimic real user behavior
8. **Fast Feedback**: Unit tests should run quickly

## Security Testing

Authentication tests include:
- ✅ SQL injection prevention (parameterized queries)
- ✅ Password hashing (bcrypt)
- ✅ JWT token validation
- ✅ Protected route access control
- ✅ Token expiration handling
- ✅ Refresh token rotation

## Performance Testing

Consider adding:
- Load testing with k6 or Artillery
- Response time assertions
- Concurrent user simulation

## Future Test Additions

- [ ] Email verification flow
- [ ] Password reset flow
- [ ] Two-factor authentication
- [ ] Rate limiting tests
- [ ] Session management tests
- [ ] Role-based access control tests
