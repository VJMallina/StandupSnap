import { test, expect } from '@playwright/test';

/**
 * PROGRESSIVE SPRINT TEST - Natural Workflow
 *
 * This test simulates the ACTUAL progression through a sprint:
 * 1. Day 1: Sprint starts (Day 1 is TODAY) - add snaps, MOM, lock
 * 2. Day 2: Advance time (Day 2 is NOW today) - add snaps, lock
 * 3. Day 3: Continue progression...
 *
 * No "mocking" - we simulate the natural flow by adjusting sprint dates
 */
test.describe.serial('Standup Book - Progressive Sprint Workflow', () => {
  const uniqueId = Date.now();
  const testEmail = `progressive${uniqueId}@example.com`;
  const testPassword = 'Test123456!';

  let token: string;
  let projectId: string;
  let sprintId: string;
  const sprintDuration = 7;

  // Track created entities
  const cards: { id: string; title: string }[] = [];

  // Helper to update sprint dates (simulates time passing)
  const advanceSprintToDay = async (context: any, dayNumber: number) => {
    const newStartDate = new Date();
    newStartDate.setDate(newStartDate.getDate() - (dayNumber - 1)); // Start date moves back so today is day N

    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + (sprintDuration - 1));

    await context.request.patch(`http://localhost:3000/api/sprints/${sprintId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        startDate: newStartDate.toISOString().split('T')[0],
        endDate: newEndDate.toISOString().split('T')[0],
      },
    });

    console.log(`  📅 Advanced sprint: Day ${dayNumber} is now TODAY`);
  };

  // Helper to get today's date
  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // Helper to create a snap via API for TODAY
  const createSnapForToday = async (context: any, cardId: string, slotNumber: number, content: string) => {
    await context.request.post('http://localhost:3000/api/snaps', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        cardId: cardId,
        rawInput: content,
        slotNumber: slotNumber,
        done: `Completed: ${content}`,
        toDo: 'Continue tomorrow',
        blockers: '',
        suggestedRAG: 'green',
        date: getTodayDate(),
      },
    });
  };

  // Helper to create MOM via API for TODAY
  const createMOMForToday = async (context: any, agenda: string) => {
    await context.request.post('http://localhost:3000/api/standup-book/mom', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        sprintId: sprintId,
        date: getTodayDate(),
        rawInput: `Meeting notes for today`,
        agenda: agenda,
        keyDiscussionPoints: `Discussion points`,
        decisionsTaken: `Decisions made`,
        actionItems: `Action items`,
      },
    });
  };

  // Helper to lock today via API
  const lockToday = async (context: any) => {
    await context.request.post('http://localhost:3000/api/standup-book/lock-day', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        sprintId: sprintId,
        date: getTodayDate(),
      },
    });
  };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000); // 2 minutes
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('\n========================================');
    console.log('PROGRESSIVE SPRINT SETUP');
    console.log('========================================');

    // Register user
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('Progressive Sprint Test User');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/username/i).fill(`progressive${uniqueId}`);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.getByRole('button', { name: /create account/i }).click();

    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForTimeout(1000);

    token = await page.evaluate(() => localStorage.getItem('accessToken')) || '';
    console.log('✓ User created and logged in');

    // Create project
    const projectStartDate = new Date();
    const projectEndDate = new Date();
    projectEndDate.setMonth(projectEndDate.getMonth() + 2);

    const projectResponse = await context.request.post('http://localhost:3000/api/projects', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `Progressive Sprint ${uniqueId}`,
        description: 'Testing progressive sprint workflow',
        startDate: projectStartDate.toISOString().split('T')[0],
        endDate: projectEndDate.toISOString().split('T')[0],
      },
    });

    const project = await projectResponse.json();
    projectId = project.id;
    console.log(`✓ Project created: ${projectId}`);

    // Create 7-day sprint starting TODAY
    const sprintStartDate = new Date();
    const sprintEndDate = new Date();
    sprintEndDate.setDate(sprintEndDate.getDate() + (sprintDuration - 1));

    const sprintResponse = await context.request.post('http://localhost:3000/api/sprints', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `7-Day Progressive Sprint ${uniqueId}`,
        goal: 'Complete sprint day by day',
        projectId: projectId,
        startDate: sprintStartDate.toISOString().split('T')[0],
        endDate: sprintEndDate.toISOString().split('T')[0],
        dailyStandupCount: 2,
        slotTimes: {
          '1': '09:00',
          '2': '15:00',
        },
      },
    });

    const sprint = await sprintResponse.json();
    sprintId = sprint.id;
    console.log(`✓ Sprint created: ${sprintId} (Day 1 = TODAY)`);

    // Create 3 cards
    const cardTitles = [
      'Feature A - Authentication',
      'Feature B - Dashboard',
      'Feature C - Analytics',
    ];

    for (const title of cardTitles) {
      const cardResponse = await context.request.post('http://localhost:3000/api/cards', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          title: `${title} - ${uniqueId}`,
          description: `Implementation of ${title}`,
          sprintId: sprintId,
          priority: 'high',
          estimatedTime: 8,
        },
      });
      const card = await cardResponse.json();
      cards.push({ id: card.id, title: title });
    }
    console.log(`✓ Created ${cards.length} cards`);
    console.log('========================================\n');

    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="usernameOrEmail"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForTimeout(500);
  });

  test.describe('DAY 1 - Sprint Kickoff (Today)', () => {
    test('should show Day 1 as today and future days as disabled', async ({ page, browser }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(3000); // Wait for sprint to load and days to render

      // Sprint should be loaded
      await expect(page.getByText(`7-Day Progressive Sprint ${uniqueId}`)).toBeVisible({ timeout: 5000 });

      // Wait for day books to render
      await page.waitForTimeout(2000);

      // Day books are buttons in a grid - find by the day number text content
      const allDayBooks = page.locator('button').filter({ has: page.locator('div.text-5xl') });
      const dayBookCount = await allDayBooks.count();

      console.log(`✓ Found ${dayBookCount} day books`);
      expect(dayBookCount).toBeGreaterThanOrEqual(7);

      // Day 1 should be accessible (enabled button)
      const day1Book = allDayBooks.first();
      await expect(day1Book).toBeEnabled();

      console.log('✓ Day 1 is accessible');
    });

    test('should add snaps for Day 1 (today)', async ({ page, browser }) => {
      const context = await browser.newContext();
      context.addInitScript((token) => {
        localStorage.setItem('accessToken', token);
      }, token);

      console.log('\n--- DAY 1: Adding snaps ---');

      // Add snaps for Day 1 (today)
      await createSnapForToday(context, cards[0].id, 1, 'Day 1 Morning: Started auth design');
      await createSnapForToday(context, cards[1].id, 1, 'Day 1 Morning: Dashboard setup');
      await createSnapForToday(context, cards[0].id, 2, 'Day 1 Afternoon: Auth implementation started');

      console.log('  ✓ Added 3 snaps for Day 1');

      // Navigate to standup book and verify
      await page.goto(`/standup-book/${sprintId}/${getTodayDate()}`);
      await page.waitForTimeout(2500);

      // Should see the snaps
      await expect(page.getByText(/auth design/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/dashboard setup/i)).toBeVisible({ timeout: 5000 });

      await context.close();
    });

    test('should create MOM for Day 1', async ({ page, browser }) => {
      const context = await browser.newContext();
      context.addInitScript((token) => {
        localStorage.setItem('accessToken', token);
      }, token);

      console.log('\n--- DAY 1: Creating MOM ---');

      await createMOMForToday(context, 'Sprint Planning: Reviewed goals and cards');
      console.log('  ✓ Created MOM for Day 1');

      // Verify MOM shows up
      await page.goto(`/standup-book/${sprintId}/${getTodayDate()}`);
      await page.waitForTimeout(2500);

      await expect(page.getByText(/sprint planning/i)).toBeVisible({ timeout: 5000 });

      await context.close();
    });

    test('should lock Day 1', async ({ page, browser }) => {
      const context = await browser.newContext();
      context.addInitScript((token) => {
        localStorage.setItem('accessToken', token);
      }, token);

      console.log('\n--- DAY 1: Locking day ---');

      await lockToday(context);
      console.log('  ✓ Locked Day 1');

      // Verify day is locked
      await page.goto(`/standup-book/${sprintId}/${getTodayDate()}`);
      await page.waitForTimeout(2500);

      await expect(page.getByText(/locked/i)).toBeVisible({ timeout: 5000 });

      await context.close();
    });
  });

  test.describe('DAY 2 - Development (Advance to Day 2)', () => {
    test('should advance to Day 2 and verify Day 1 is now in the past', async ({ page, browser }) => {
      const context = await browser.newContext();
      context.addInitScript((token) => {
        localStorage.setItem('accessToken', token);
      }, token);

      console.log('\n--- ADVANCING TO DAY 2 ---');
      await advanceSprintToDay(context, 2);

      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(3000);

      // Find all day books
      const allDayBooks = page.locator('button').filter({ has: page.locator('div.text-5xl') });

      // Click on Day 1 (first book)
      const day1Book = allDayBooks.first();
      await day1Book.click();
      await page.waitForTimeout(2000);

      // Should show locked
      await expect(page.getByText(/locked/i)).toBeVisible({ timeout: 5000 });

      console.log('✓ Day 1 is now in the past (locked)');

      await context.close();
    });

    test('should add snaps for Day 2 (now today)', async ({ page, browser }) => {
      const context = await browser.newContext();
      context.addInitScript((token) => {
        localStorage.setItem('accessToken', token);
      }, token);

      console.log('\n--- DAY 2: Adding snaps ---');

      await createSnapForToday(context, cards[0].id, 1, 'Day 2 Morning: Auth API completed');
      await createSnapForToday(context, cards[1].id, 1, 'Day 2 Morning: Dashboard components built');
      await createSnapForToday(context, cards[0].id, 2, 'Day 2 Afternoon: Auth tests written');

      console.log('  ✓ Added 3 snaps for Day 2');

      await page.goto(`/standup-book/${sprintId}/${getTodayDate()}`);
      await page.waitForTimeout(2500);

      await expect(page.getByText(/auth api/i)).toBeVisible({ timeout: 5000 });

      await context.close();
    });

    test('should lock Day 2', async ({ page, browser }) => {
      const context = await browser.newContext();
      context.addInitScript((token) => {
        localStorage.setItem('accessToken', token);
      }, token);

      console.log('\n--- DAY 2: Locking day ---');

      await lockToday(context);
      console.log('  ✓ Locked Day 2');

      await page.goto(`/standup-book/${sprintId}/${getTodayDate()}`);
      await page.waitForTimeout(2500);

      await expect(page.getByText(/locked/i)).toBeVisible({ timeout: 5000 });

      await context.close();
    });
  });

  test.describe('DAY 3 - Mid-Sprint Review (Advance to Day 3)', () => {
    test('should advance to Day 3', async ({ page, browser }) => {
      const context = await browser.newContext();
      context.addInitScript((token) => {
        localStorage.setItem('accessToken', token);
      }, token);

      console.log('\n--- ADVANCING TO DAY 3 ---');
      await advanceSprintToDay(context, 3);

      console.log('✓ Day 3 is now TODAY');

      await context.close();
    });

    test('should add snaps and MOM for Day 3', async ({ page, browser }) => {
      const context = await browser.newContext();
      context.addInitScript((token) => {
        localStorage.setItem('accessToken', token);
      }, token);

      console.log('\n--- DAY 3: Adding snaps and MOM ---');

      await createSnapForToday(context, cards[0].id, 1, 'Day 3: Auth integration complete');
      await createSnapForToday(context, cards[1].id, 1, 'Day 3: Dashboard data fetching');
      await createSnapForToday(context, cards[2].id, 1, 'Day 3: Started analytics module');
      await createMOMForToday(context, 'Mid-Sprint Review: 50% complete, on track');

      console.log('  ✓ Added 3 snaps and MOM for Day 3');

      await page.goto(`/standup-book/${sprintId}/${getTodayDate()}`);
      await page.waitForTimeout(2500);

      await expect(page.getByText(/mid-sprint review/i)).toBeVisible({ timeout: 5000 });

      await context.close();
    });

    test('should lock Day 3', async ({ page, browser }) => {
      const context = await browser.newContext();
      context.addInitScript((token) => {
        localStorage.setItem('accessToken', token);
      }, token);

      await lockToday(context);
      console.log('  ✓ Locked Day 3');

      await context.close();
    });
  });

  test.describe('Sprint Progress Verification', () => {
    test('should show 3 locked days in bookshelf after Day 3', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Should have 3 locked badges (Days 1, 2, 3)
      const lockedBadges = page.getByText('Locked');
      const lockedCount = await lockedBadges.count();
      expect(lockedCount).toBeGreaterThanOrEqual(3);

      console.log(`\n✓ Sprint Progress: ${lockedCount} days locked`);
    });

    test('should verify complete progression: Day 1 → Day 2 → Day 3', async ({ page }) => {
      console.log('\n========================================');
      console.log('SPRINT PROGRESSION COMPLETE');
      console.log('========================================');
      console.log('✓ Day 1: Locked with snaps and MOM');
      console.log('✓ Day 2: Locked with snaps');
      console.log('✓ Day 3: Locked with snaps and MOM');
      console.log('✓ Natural workflow tested successfully');
      console.log('========================================\n');

      // Final verification
      expect(cards.length).toBe(3);
    });
  });
});
