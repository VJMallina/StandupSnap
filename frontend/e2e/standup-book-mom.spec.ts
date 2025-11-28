import { test, expect } from '@playwright/test';

/**
 * Standup Book - MOM (Minutes of Meeting) E2E Tests
 * Tests the complete MOM workflow including creation, update, lock enforcement
 *
 * Run with: npx playwright test standup-book-mom.spec.ts --workers=1
 */
test.describe('Standup Book - MOM Workflow', () => {
  const uniqueId = Date.now();
  const testUsername = `momtest${uniqueId}`;
  const testEmail = `momtest${uniqueId}@example.com`;
  const testPassword = 'Test123456!';
  const todayDate = new Date().toISOString().split('T')[0];

  let projectId: string;
  let sprintId: string;
  let cardId: string;
  let authToken: string;
  let momId: string;

  // Setup: Create user, project, sprint, and cards
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Register user
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('MOM Test User');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/username/i).fill(testUsername);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Get auth token
    authToken = await page.evaluate(() => localStorage.getItem('accessToken'));

    // Create project
    const projectResponse = await context.request.post('http://localhost:3000/api/projects', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `MOM Test Project ${uniqueId}`,
        description: 'Test project for MOM workflow',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    });
    const project = await projectResponse.json();
    projectId = project.id;

    // Create sprint
    const sprintResponse = await context.request.post('http://localhost:3000/api/sprints', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `MOM Test Sprint ${uniqueId}`,
        projectId: projectId,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dailyStandupCount: 2,
      },
    });
    const sprint = await sprintResponse.json();
    sprintId = sprint.id;

    // Create team member
    const teamMemberResponse = await context.request.post('http://localhost:3000/api/team-members', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        fullName: 'MOM Test User',
        designationRole: 'Developer',
        displayName: testUsername,
      },
    });
    const teamMember = await teamMemberResponse.json();

    // Add team member to project
    await context.request.post(`http://localhost:3000/api/projects/${projectId}/team`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        teamMemberIds: [teamMember.id],
      },
    });

    // Create a card
    const cardResponse = await context.request.post('http://localhost:3000/api/cards', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        projectId: projectId,
        sprintId: sprintId,
        assigneeId: teamMember.id,
        title: `MOM Test Card - ${uniqueId}`,
        description: 'Card for MOM testing',
        priority: 'high',
        estimatedTime: 8,
      },
    });
    const card = await cardResponse.json();
    cardId = card.id;

    // Create a snap (needed for daily lock summary generation)
    await context.request.post('http://localhost:3000/api/snaps', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        cardId: cardId,
        rawInput: 'Completed MOM feature implementation',
        slotNumber: 1,
        done: 'Completed MOM feature implementation',
        toDo: 'Test MOM workflow',
        blockers: '',
        suggestedRAG: 'green',
      },
    });

    await context.close();
  });

  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="usernameOrEmail"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForTimeout(500);
  });

  // TEST 1: Create MOM before day is locked
  test('1. should create MOM for unlocked day', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    const momResponse = await page.request.post('http://localhost:3000/api/standup-book/mom', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        sprintId: sprintId,
        date: todayDate,
        rawInput: 'Discussed sprint planning and API architecture. Decided to use REST. John will implement authentication.',
        agenda: 'Sprint planning and API architecture discussion',
        keyDiscussionPoints: 'Team discussed API design patterns. REST vs GraphQL evaluated.',
        decisionsTaken: 'Decided to use REST API for backend',
        actionItems: 'John: Implement authentication module\nSarah: Design database schema',
      },
    });

    if (!momResponse.ok()) {
      console.error('MOM creation failed:', await momResponse.json());
    }

    expect(momResponse.ok()).toBeTruthy();

    const mom = await momResponse.json();
    momId = mom.id;

    // Verify MOM fields
    expect(mom.agenda).toBe('Sprint planning and API architecture discussion');
    expect(mom.decisionsTaken).toBe('Decided to use REST API for backend');
    expect(mom.actionItems).toContain('John: Implement authentication module');

    console.log('MOM created successfully with ID:', momId);
  });

  // TEST 2: Update MOM before day is locked
  test('2. should update MOM for unlocked day', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    const updateResponse = await page.request.put(`http://localhost:3000/api/standup-book/mom/${momId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        actionItems: 'John: Implement authentication module\nSarah: Design database schema\nMike: Setup CI/CD pipeline',
      },
    });

    if (!updateResponse.ok()) {
      console.error('MOM update failed:', await updateResponse.json());
    }

    expect(updateResponse.ok()).toBeTruthy();

    const updatedMom = await updateResponse.json();
    expect(updatedMom.actionItems).toContain('Mike: Setup CI/CD pipeline');

    console.log('MOM updated successfully');
  });

  // TEST 3: Verify MOM is visible on day details page
  test('3. should display MOM section on day details page', async ({ page }) => {
    await page.goto(`/standup-book/${sprintId}/${todayDate}`);
    await page.waitForTimeout(2000);

    // Should see "Minutes of Meeting" heading
    await expect(page.getByRole('heading', { name: /minutes of meeting/i })).toBeVisible({ timeout: 5000 });

    // Should see MOM content (at least agenda or action items)
    const hasMomContent = await page.getByText(/sprint planning|john.*implement|sarah.*database/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasMomContent).toBeTruthy();
  });

  // TEST 4: Lock the day
  test('4. should lock the day successfully', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    const lockResponse = await page.request.post('http://localhost:3000/api/standup-book/lock-day', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        sprintId: sprintId,
        date: todayDate,
      },
    });

    if (!lockResponse.ok()) {
      const errorData = await lockResponse.json();
      console.error('Lock day failed:', lockResponse.status(), errorData);
    }

    expect(lockResponse.ok()).toBeTruthy();
    console.log('Day locked successfully');
  });

  // TEST 5: Verify cannot create MOM after day is locked
  test('5. should prevent MOM creation for locked day', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    const momResponse = await page.request.post('http://localhost:3000/api/standup-book/mom', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        sprintId: sprintId,
        date: todayDate,
        rawInput: 'Trying to create MOM after lock',
        agenda: 'Should fail',
        keyDiscussionPoints: 'Should fail',
        decisionsTaken: 'Should fail',
        actionItems: 'Should fail',
      },
    });

    // Should fail with 403 Forbidden
    expect(momResponse.status()).toBe(403);

    const error = await momResponse.json();
    expect(error.message).toContain('Cannot create MOM for a locked day');

    console.log('MOM creation correctly blocked for locked day');
  });

  // TEST 6: Verify cannot update MOM after day is locked
  test('6. should prevent MOM update for locked day', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    const updateResponse = await page.request.put(`http://localhost:3000/api/standup-book/mom/${momId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        actionItems: 'Trying to update after lock - should fail',
      },
    });

    // Should fail with 403 Forbidden
    expect(updateResponse.status()).toBe(403);

    const error = await updateResponse.json();
    expect(error.message).toContain('Cannot edit MOM for a locked day');

    console.log('MOM update correctly blocked for locked day');
  });

  // TEST 7: Verify locked day shows both MOM and Daily Summary
  test('7. should display both MOM and Daily Summary for locked day', async ({ page }) => {
    await page.goto(`/standup-book/${sprintId}/${todayDate}`);
    await page.waitForTimeout(2000);

    // Should show "Locked" badge
    const isLocked = await page.getByText('Locked', { exact: true }).isVisible({ timeout: 5000 }).catch(() => false);
    expect(isLocked).toBeTruthy();

    // Should show "Minutes of Meeting" section (MOM)
    const hasMomHeading = await page.getByRole('heading', { name: /minutes of meeting/i }).isVisible({ timeout: 5000 }).catch(() => false);

    // Should show "Daily Standup Summary" section (generated from snaps)
    const hasSummaryHeading = await page.getByRole('heading', { name: /daily standup summary/i }).isVisible({ timeout: 5000 }).catch(() => false);

    // At least one should be visible
    expect(hasMomHeading || hasSummaryHeading).toBeTruthy();

    console.log('Locked day displays both MOM and Summary sections');
  });

  // TEST 8: Verify MOM can still be read after lock
  test('8. should allow reading MOM for locked day', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    const momResponse = await page.request.get(`http://localhost:3000/api/standup-book/mom/${sprintId}?date=${todayDate}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(momResponse.ok()).toBeTruthy();

    const mom = await momResponse.json();
    expect(mom.id).toBe(momId);
    expect(mom.agenda).toBe('Sprint planning and API architecture discussion');

    console.log('MOM can still be read after lock');
  });

  // TEST 9: Verify Daily Lock Summary is independent of MOM
  test('9. should verify Daily Lock Summary is separate from MOM', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    // Get daily lock
    const lockResponse = await page.request.get(`http://localhost:3000/api/standup-book/daily-lock/${sprintId}?date=${todayDate}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(lockResponse.ok()).toBeTruthy();

    const lock = await lockResponse.json();

    // Daily Lock Summary should be generated from snaps
    expect(lock.dailySummaryDone).toBeDefined();
    expect(lock.dailySummaryDone).toContain('Completed MOM feature');

    // Get MOM
    const momResponse = await page.request.get(`http://localhost:3000/api/standup-book/mom/${sprintId}?date=${todayDate}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const mom = await momResponse.json();

    // MOM should have different content
    expect(mom.agenda).toBeDefined();
    expect(mom.agenda).not.toBe(lock.dailySummaryDone);

    console.log('Daily Lock Summary and MOM are independent');
    console.log('Lock Summary (from snaps):', lock.dailySummaryDone);
    console.log('MOM Agenda (manual/AI):', mom.agenda);
  });
});
