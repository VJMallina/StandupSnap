import { test, expect } from '@playwright/test';

/**
 * Simplified Standup Book E2E Tests
 * Uses ONE user and ONE project for all tests
 */
test.describe('Standup Book - Core Functionality', () => {
  const uniqueId = Date.now();
  const testUsername = `testuser${uniqueId}`;
  const testEmail = `test${uniqueId}@example.com`;
  const testPassword = 'Test123456!';

  let projectId: string;
  let sprintId: string;
  let card1Id: string;
  let card2Id: string;

  // Create ONE user and ONE project for ALL tests
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Register ONE user
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/username/i).fill(testUsername);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.getByRole('button', { name: /create account/i }).click();

    // Wait for successful login
    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Get auth token
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    // Create ONE project
    const projectStartDate = new Date();
    const projectEndDate = new Date();
    projectEndDate.setMonth(projectEndDate.getMonth() + 3);

    const projectResponse = await context.request.post('http://localhost:3000/api/projects', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `E2E Test Project ${uniqueId}`,
        description: 'Test project for standup book',
        startDate: projectStartDate.toISOString().split('T')[0],
        endDate: projectEndDate.toISOString().split('T')[0],
      },
    });

    const project = await projectResponse.json();
    projectId = project.id;

    // Create ONE sprint with 2 slots
    const sprintStartDate = new Date();
    const sprintEndDate = new Date();
    sprintEndDate.setDate(sprintEndDate.getDate() + 14);

    const sprintResponse = await context.request.post('http://localhost:3000/api/sprints', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `Test Sprint ${uniqueId}`,
        projectId: projectId,
        startDate: sprintStartDate.toISOString().split('T')[0],
        endDate: sprintEndDate.toISOString().split('T')[0],
        dailyStandupCount: 2,
      },
    });

    const sprint = await sprintResponse.json();
    sprintId = sprint.id;

    // Create cards
    const card1Response = await context.request.post('http://localhost:3000/api/cards', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: `Test Card 1 - ${uniqueId}`,
        description: 'First test card',
        sprintId: sprintId,
        priority: 'high',
        estimatedTime: 8,
      },
    });
    const card1 = await card1Response.json();
    card1Id = card1.id;

    const card2Response = await context.request.post('http://localhost:3000/api/cards', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: `Test Card 2 - ${uniqueId}`,
        description: 'Second test card',
        sprintId: sprintId,
        priority: 'medium',
        estimatedTime: 6,
      },
    });
    const card2 = await card2Response.json();
    card2Id = card2.id;

    // Create snaps with slot selection
    await context.request.post('http://localhost:3000/api/snaps', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        cardId: card1Id,
        rawInput: 'Completed initial setup. Working on database schema.',
        slotNumber: 1,
        done: 'Completed initial setup',
        toDo: 'Working on database schema',
        blockers: '',
        suggestedRAG: 'green',
      },
    });

    await context.request.post('http://localhost:3000/api/snaps', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        cardId: card2Id,
        rawInput: 'Implemented API endpoints. Testing authentication.',
        slotNumber: 1,
        done: 'Implemented API endpoints',
        toDo: 'Testing authentication',
        blockers: '',
        suggestedRAG: 'green',
      },
    });

    await context.request.post('http://localhost:3000/api/snaps', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        cardId: card1Id,
        rawInput: 'Finished database schema. Started frontend integration.',
        slotNumber: 2,
        done: 'Finished database schema',
        toDo: 'Started frontend integration',
        blockers: '',
        suggestedRAG: 'green',
      },
    });

    await context.close();
  });

  // Login before each test (reuse same user)
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForTimeout(500);
  });

  test('should access standup book page when authenticated', async ({ page }) => {
    await page.goto('/standup-book');
    await expect(page).toHaveURL('/standup-book');
    await expect(page.getByRole('heading', { name: /standup book/i })).toBeVisible();
  });

  test('should display project selector', async ({ page }) => {
    await page.goto('/standup-book');
    const selector = page.locator('select, [role="combobox"]').first();
    await expect(selector).toBeVisible({ timeout: 5000 });
  });

  test('should view standup book with project and sprint', async ({ page }) => {
    await page.goto('/standup-book');
    await page.waitForTimeout(1000);

    // Select the project
    const projectSelector = page.locator('select').first();
    await projectSelector.waitFor({ state: 'visible' });
    await projectSelector.selectOption({ value: projectId });
    await page.waitForTimeout(1500);

    // Sprint should be visible
    await expect(page.getByText(`Test Sprint ${uniqueId}`)).toBeVisible({ timeout: 5000 });

    // Sprint days should be displayed
    await expect(page.getByText(/day 1/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should access day details page and see slots', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await page.goto(`/standup-book-day/${sprintId}/${today}`);
    await page.waitForTimeout(1500);

    // Page should load
    expect(page.url()).toContain('/standup-book-day');

    // Should see slots
    await expect(page.getByText(/slot 1/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/slot 2/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should verify snap lock enforcement in Cards view', async ({ page }) => {
    // First lock the day
    const today = new Date().toISOString().split('T')[0];
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    await page.request.post('http://localhost:3000/api/standup-book/lock-day', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        sprintId: sprintId,
        date: today,
      },
    });

    // Navigate to Cards view
    await page.goto(`/cards?projectId=${projectId}`);
    await page.waitForTimeout(1000);

    // Click on first card
    await page.getByText(`Test Card 1 - ${uniqueId}`).first().click();
    await page.waitForTimeout(1000);

    // Should NOT see "Add Snap" button (day is locked)
    const addSnapButton = page.getByRole('button', { name: /add snap/i });
    await expect(addSnapButton).not.toBeVisible();

    // Should see lock warning
    await expect(page.getByText(/snaps have been locked/i).first()).toBeVisible();
  });
});
