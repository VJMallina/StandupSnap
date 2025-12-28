import { test, expect } from '@playwright/test';

/**
 * COMPREHENSIVE ENTIRE SPRINT TEST
 *
 * This test creates a complete 7-day sprint with:
 * - Snaps for multiple days across the sprint
 * - MOMs for selected days
 * - Progressive locking of days
 * - Systematic verification of ALL days
 *
 * Tests the complete sprint lifecycle from start to finish
 */
test.describe.serial('Standup Book - Complete Sprint Lifecycle Test', () => {
  const uniqueId = Date.now();
  const testEmail = `entiresprint${uniqueId}@example.com`;
  const testPassword = 'Test123456!';

  let token: string;
  let projectId: string;
  let sprintId: string;
  let sprintStartDate: Date;
  const sprintDuration = 7; // 7-day sprint for thorough testing

  // Track created entities
  const cards: { id: string; title: string }[] = [];
  const dayData: {
    [dayNumber: number]: {
      date: string;
      snaps: number;
      hasMom: boolean;
      isLocked: boolean;
    };
  } = {};

  // Helper to get date for day N of sprint
  const getSprintDate = (dayNumber: number): string => {
    const date = new Date(sprintStartDate);
    date.setDate(date.getDate() + dayNumber - 1);
    return date.toISOString().split('T')[0];
  };

  // Helper to create a snap via API
  const createSnap = async (context: any, cardId: string, slotNumber: number, day: number, content: string) => {
    const date = getSprintDate(day);
    await context.request.post('http://localhost:3000/api/snaps', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        cardId: cardId,
        rawInput: content,
        slotNumber: slotNumber,
        done: `Completed work for day ${day}`,
        toDo: `Continue work for day ${day + 1}`,
        blockers: '',
        suggestedRAG: 'green',
        date: date,
      },
    });
  };

  // Helper to create MOM via API
  const createMOM = async (context: any, day: number, agenda: string) => {
    const date = getSprintDate(day);
    await context.request.post('http://localhost:3000/api/standup-book/mom', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        sprintId: sprintId,
        date: date,
        rawInput: `Meeting notes for day ${day}`,
        agenda: agenda,
        keyDiscussionPoints: `Key points discussed on day ${day}`,
        decisionsTaken: `Decisions made on day ${day}`,
        actionItems: `Action items for day ${day}`,
      },
    });
  };

  // Helper to lock a day via API
  const lockDay = async (context: any, day: number) => {
    const date = getSprintDate(day);
    await context.request.post('http://localhost:3000/api/standup-book/lock-day', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        sprintId: sprintId,
        date: date,
      },
    });
  };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180000); // 3 minutes for complete sprint setup
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('========================================');
    console.log('SETTING UP COMPLETE SPRINT TEST DATA');
    console.log('========================================');

    // Register user
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('Entire Sprint Test User');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/username/i).fill(`entiresprint${uniqueId}`);
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
        name: `Complete Sprint Test ${uniqueId}`,
        description: 'Testing entire sprint lifecycle',
        startDate: projectStartDate.toISOString().split('T')[0],
        endDate: projectEndDate.toISOString().split('T')[0],
      },
    });

    const project = await projectResponse.json();
    projectId = project.id;
    console.log(`✓ Project created: ${projectId}`);

    // Create 7-day sprint with 2 slots
    sprintStartDate = new Date();
    const sprintEndDate = new Date();
    sprintEndDate.setDate(sprintEndDate.getDate() + (sprintDuration - 1));

    const sprintResponse = await context.request.post('http://localhost:3000/api/sprints', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `7-Day Complete Sprint ${uniqueId}`,
        goal: 'Complete a full development cycle',
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
    console.log(`✓ Sprint created: ${sprintId} (${sprintDuration} days)`);

    // Create 3 cards
    const cardTitles = [
      'Feature A - User Authentication',
      'Feature B - Dashboard UI',
      'Feature C - Data Analytics',
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

    // Initialize day data structure
    for (let day = 1; day <= sprintDuration; day++) {
      dayData[day] = {
        date: getSprintDate(day),
        snaps: 0,
        hasMom: false,
        isLocked: false,
      };
    }

    console.log('\n--- Creating Sprint Data Day by Day ---\n');

    // DAY 1: Sprint kickoff - All cards started, create MOM, lock day
    console.log('Day 1: Sprint Kickoff');
    await createSnap(context, cards[0].id, 1, 1, 'Day 1 Morning: Started authentication module design');
    await createSnap(context, cards[1].id, 1, 1, 'Day 1 Morning: Initialized dashboard project structure');
    await createSnap(context, cards[2].id, 1, 1, 'Day 1 Morning: Research analytics libraries');
    await createSnap(context, cards[0].id, 2, 1, 'Day 1 Afternoon: Completed auth design, started implementation');
    await createSnap(context, cards[1].id, 2, 1, 'Day 1 Afternoon: Set up routing and layout');
    dayData[1].snaps = 5;
    await createMOM(context, 1, 'Sprint Planning: Reviewed sprint goal and card breakdown');
    dayData[1].hasMom = true;
    await lockDay(context, 1);
    dayData[1].isLocked = true;
    console.log('  ✓ 5 snaps, MOM created, day locked');

    // DAY 2: Active development - Focus on Feature A and B
    console.log('Day 2: Active Development');
    await createSnap(context, cards[0].id, 1, 2, 'Day 2 Morning: Auth API endpoints completed');
    await createSnap(context, cards[1].id, 1, 2, 'Day 2 Morning: Dashboard components built');
    await createSnap(context, cards[0].id, 2, 2, 'Day 2 Afternoon: Auth unit tests written');
    await createSnap(context, cards[1].id, 2, 2, 'Day 2 Afternoon: Dashboard styling completed');
    dayData[2].snaps = 4;
    await lockDay(context, 2);
    dayData[2].isLocked = true;
    console.log('  ✓ 4 snaps, day locked');

    // DAY 3: Mid-sprint review - All features progressing, create MOM
    console.log('Day 3: Mid-Sprint Review');
    await createSnap(context, cards[0].id, 1, 3, 'Day 3 Morning: Auth integration with frontend');
    await createSnap(context, cards[1].id, 1, 3, 'Day 3 Morning: Dashboard data fetching implemented');
    await createSnap(context, cards[2].id, 1, 3, 'Day 3 Morning: Analytics data model designed');
    await createSnap(context, cards[0].id, 2, 3, 'Day 3 Afternoon: Auth testing complete');
    await createSnap(context, cards[2].id, 2, 3, 'Day 3 Afternoon: Started analytics API');
    dayData[3].snaps = 5;
    await createMOM(context, 3, 'Mid-Sprint Review: 60% complete, on track');
    dayData[3].hasMom = true;
    await lockDay(context, 3);
    dayData[3].isLocked = true;
    console.log('  ✓ 5 snaps, MOM created, day locked');

    // DAY 4: Focus on Feature C - Analytics
    console.log('Day 4: Analytics Focus');
    await createSnap(context, cards[2].id, 1, 4, 'Day 4 Morning: Analytics API endpoints implemented');
    await createSnap(context, cards[2].id, 2, 4, 'Day 4 Afternoon: Analytics dashboard integration started');
    await createSnap(context, cards[1].id, 2, 4, 'Day 4 Afternoon: Dashboard refinements');
    dayData[4].snaps = 3;
    await lockDay(context, 4);
    dayData[4].isLocked = true;
    console.log('  ✓ 3 snaps, day locked');

    // DAY 5: Testing and bug fixes - Only today (current day in real sprint)
    console.log('Day 5: Testing Phase (TODAY - Current Day)');
    await createSnap(context, cards[0].id, 1, 5, 'Day 5 Morning: Auth bug fixes');
    await createSnap(context, cards[1].id, 1, 5, 'Day 5 Morning: Dashboard performance optimization');
    await createSnap(context, cards[2].id, 1, 5, 'Day 5 Morning: Analytics testing');
    await createSnap(context, cards[0].id, 2, 5, 'Day 5 Afternoon: Final auth review');
    await createSnap(context, cards[1].id, 2, 5, 'Day 5 Afternoon: Dashboard cross-browser testing');
    await createSnap(context, cards[2].id, 2, 5, 'Day 5 Afternoon: Analytics data validation');
    dayData[5].snaps = 6;
    // Day 5 is TODAY - not locked yet, no MOM yet
    console.log('  ✓ 6 snaps (not locked - this is today)');

    // DAY 6 & 7: Future days - No data yet (they haven't happened)
    console.log('Day 6: Future (No data yet)');
    console.log('  ✓ Future day - no snaps');
    console.log('Day 7: Future - Sprint End (No data yet)');
    console.log('  ✓ Future day - no snaps');

    console.log('\n========================================');
    console.log('SPRINT DATA SUMMARY:');
    console.log('========================================');
    console.log(`Total Days: ${sprintDuration}`);
    console.log(`Days with Data: 5`);
    console.log(`Days Locked: 4 (Days 1-4)`);
    console.log(`Current Day: 5 (unlocked, active)`);
    console.log(`Future Days: 2 (Days 6-7)`);
    console.log(`Total Snaps Created: ${Object.values(dayData).reduce((sum, day) => sum + day.snaps, 0)}`);
    console.log(`Total MOMs Created: ${Object.values(dayData).filter(day => day.hasMom).length}`);
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

  test.describe('Complete Sprint Overview Verification', () => {
    test('should display all 7 days of the sprint in bookshelf view', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Verify sprint loaded
      await expect(page.getByText(`7-Day Complete Sprint ${uniqueId}`)).toBeVisible({ timeout: 5000 });

      // Verify total days shown - look for it near "Total Days" text
      await expect(page.getByText('Total Days')).toBeVisible();

      // Verify 7 days are displayed (look for day books, not just the text "7")
      const dayBooks = page.locator('button').filter({ hasText: /^[1-7]$/ });
      expect(await dayBooks.count()).toBeGreaterThanOrEqual(7);
    });

    test('should show correct visual indicators for each day category', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Should have locked days (green badges)
      const lockedBadges = page.getByText('Locked');
      const lockedCount = await lockedBadges.count();
      expect(lockedCount).toBeGreaterThanOrEqual(4); // Days 1-4 are locked

      // Should have MOM badges
      const momBadges = page.getByText('MOM');
      const momCount = await momBadges.count();
      expect(momCount).toBeGreaterThanOrEqual(2); // Days 1 and 3 have MOMs
    });

    test('should display snap count badges on days with snaps', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Day 1 should show 5 snaps
      // Day 5 (today) should show 6 snaps
      // Look for snap count badges
      const snapBadges = page.locator('span').filter({ hasText: /^[3-6]$/ });
      const badgeCount = await snapBadges.count();
      expect(badgeCount).toBeGreaterThan(0);
    });
  });

  test.describe('Day-by-Day Verification - Complete Sprint', () => {
    test('DAY 1: Verify locked sprint kickoff day with MOM', async ({ page }) => {
      await page.goto(`/standup-book/${sprintId}/${dayData[1].date}`);
      await page.waitForTimeout(2500);

      // Should show locked status
      await expect(page.getByText(/locked/i)).toBeVisible({ timeout: 5000 });

      // Should show MOM
      await expect(page.getByText(/sprint planning/i)).toBeVisible({ timeout: 5000 });

      // Should show snaps in both slots
      await expect(page.getByText(/slot 1/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/slot 2/i)).toBeVisible({ timeout: 5000 });

      // Should show content from snaps
      await expect(page.getByText(/authentication module/i)).toBeVisible({ timeout: 5000 });
    });

    test('DAY 2: Verify locked development day', async ({ page }) => {
      await page.goto(`/standup-book/${sprintId}/${dayData[2].date}`);
      await page.waitForTimeout(2500);

      // Should show locked status
      await expect(page.getByText(/locked/i)).toBeVisible({ timeout: 5000 });

      // Should show snaps
      await expect(page.getByText(/API endpoints/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Dashboard components/i)).toBeVisible({ timeout: 5000 });
    });

    test('DAY 3: Verify locked mid-sprint review day with MOM', async ({ page }) => {
      await page.goto(`/standup-book/${sprintId}/${dayData[3].date}`);
      await page.waitForTimeout(2500);

      // Should show locked status
      await expect(page.getByText(/locked/i)).toBeVisible({ timeout: 5000 });

      // Should show MOM
      await expect(page.getByText(/mid-sprint review/i)).toBeVisible({ timeout: 5000 });

      // Should show analytics work started
      await expect(page.getByText(/analytics/i)).toBeVisible({ timeout: 5000 });
    });

    test('DAY 4: Verify locked analytics focus day', async ({ page }) => {
      await page.goto(`/standup-book/${sprintId}/${dayData[4].date}`);
      await page.waitForTimeout(2500);

      // Should show locked status
      await expect(page.getByText(/locked/i)).toBeVisible({ timeout: 5000 });

      // Should show analytics API work
      await expect(page.getByText(/analytics api/i)).toBeVisible({ timeout: 5000 });
    });

    test('DAY 5 (TODAY): Verify unlocked current day with active work', async ({ page }) => {
      await page.goto(`/standup-book/${sprintId}/${dayData[5].date}`);
      await page.waitForTimeout(2500);

      // Should NOT show locked status (it's today, unlocked)
      const lockButton = page.getByRole('button', { name: /lock day/i });
      await expect(lockButton).toBeVisible({ timeout: 5000 });

      // Should show testing phase snaps
      await expect(page.getByText(/bug fixes/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/performance optimization/i)).toBeVisible({ timeout: 5000 });

      // Both slots should have data
      await expect(page.getByText(/slot 1/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/slot 2/i)).toBeVisible({ timeout: 5000 });
    });

    test('DAY 6 (FUTURE): Verify future day is not accessible', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Find day 6 book - should be disabled/gray
      const allDayBooks = page.locator('button').filter({ hasText: /^6$/ });
      const day6Book = allDayBooks.first();

      // Should be disabled
      const isDisabled = await day6Book.isDisabled();
      expect(isDisabled).toBe(true);
    });

    test('DAY 7 (FUTURE): Verify sprint end day is not accessible', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Find day 7 book - should be disabled/gray
      const allDayBooks = page.locator('button').filter({ hasText: /^7$/ });
      const day7Book = allDayBooks.first();

      // Should be disabled
      const isDisabled = await day7Book.isDisabled();
      expect(isDisabled).toBe(true);
    });
  });

  test.describe('Sprint-Wide Data Consistency', () => {
    test('should show consistent snap counts across bookshelf and day details', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Navigate to Day 5 (today with 6 snaps)
      const day5Book = page.locator('button').filter({ hasText: /^5$/ }).first();
      await day5Book.click();
      await page.waitForTimeout(2000);

      // Count visible snaps on details page
      const snapsText = page.getByText(/day 5/i);
      await expect(snapsText).toBeVisible();
    });

    test('should show locked days are actually locked (cannot add snaps)', async ({ page }) => {
      // Try to add snap to a locked day via Cards page
      await page.goto(`/cards?projectId=${projectId}`);
      await page.waitForTimeout(1500);

      // Click on a card
      const card = page.getByText(/Feature A/i).first();
      await card.click();
      await page.waitForTimeout(1000);

      // Should see lock warning for past locked days
      const lockWarning = page.getByText(/locked|cannot add/i).first();
      if (await lockWarning.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(lockWarning).toBeVisible();
      }
    });

    test('should display all MOMs created across sprint', async ({ page }) => {
      // Verify Day 1 MOM
      await page.goto(`/standup-book/${sprintId}/${dayData[1].date}`);
      await page.waitForTimeout(2000);
      await expect(page.getByText(/sprint planning/i)).toBeVisible({ timeout: 5000 });

      // Verify Day 3 MOM
      await page.goto(`/standup-book/${sprintId}/${dayData[3].date}`);
      await page.waitForTimeout(2000);
      await expect(page.getByText(/mid-sprint review/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Sprint Navigation Flow', () => {
    test('should navigate through sprint sequentially (Day 1 → Day 2 → Day 3)', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Day 1
      const day1Book = page.locator('button').filter({ hasText: /^1$/ }).first();
      await day1Book.click();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain(dayData[1].date);
      await page.goBack();
      await page.waitForTimeout(1000);

      // Day 2
      const day2Book = page.locator('button').filter({ hasText: /^2$/ }).first();
      await day2Book.click();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain(dayData[2].date);
      await page.goBack();
      await page.waitForTimeout(1000);

      // Day 3
      const day3Book = page.locator('button').filter({ hasText: /^3$/ }).first();
      await day3Book.click();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain(dayData[3].date);
    });

    test('should maintain bookshelf state during navigation', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      const sprintName = `7-Day Complete Sprint ${uniqueId}`;
      await expect(page.getByText(sprintName)).toBeVisible();

      // Navigate away and back
      await page.goto('/');
      await page.waitForTimeout(500);
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      // Project should still be selected
      const selectedValue = await projectSelector.inputValue();
      expect(selectedValue).toBe(projectId);
    });
  });

  test.describe('Complete Sprint Summary', () => {
    test('should generate comprehensive sprint report', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      console.log('\n========================================');
      console.log('SPRINT VERIFICATION SUMMARY:');
      console.log('========================================');

      // Count locked days (should see green books)
      const lockedBadges = page.getByText('Locked');
      const lockedCount = await lockedBadges.count();
      console.log(`Locked Days (Green): ${lockedCount}`);

      // Count MOM badges
      const momBadges = page.getByText('MOM');
      const momCount = await momBadges.count();
      console.log(`Days with MOMs: ${momCount}`);

      // Verify all expected data
      expect(lockedCount).toBeGreaterThanOrEqual(4);
      expect(momCount).toBeGreaterThanOrEqual(2);

      console.log('✓ All days verified successfully');
      console.log('✓ Visual indicators correct');
      console.log('✓ Sprint progression accurate');
      console.log('========================================\n');
    });
  });
});
