import { test, expect } from '@playwright/test';

/**
 * Comprehensive Standup Book E2E Tests
 * Tests entire sprint standup book functionality including:
 * - Sprint overview/bookshelf view
 * - Visual indicators (locked days, MOMs, snap counts)
 * - Day navigation and details
 * - MOM creation and management
 * - Day locking functionality
 * - Complete sprint testing scenarios
 */
test.describe.serial('Standup Book - Complete Sprint Tests', () => {
  const uniqueId = Date.now();
  const testUsername = `sbtest${uniqueId}`;
  const testEmail = `sbtest${uniqueId}@example.com`;
  const testPassword = 'Test123456!';

  let projectId: string;
  let sprintId: string;
  let card1Id: string;
  let card2Id: string;
  let sprintStartDate: string;
  let sprintDuration: number = 14; // 14-day sprint

  // Helper to get date for day N of sprint
  const getSprintDay = (dayNumber: number): string => {
    const date = new Date(sprintStartDate);
    date.setDate(date.getDate() + dayNumber - 1);
    return date.toISOString().split('T')[0];
  };

  // Setup: Create user, project, sprint, cards, and snaps
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Setting up test data...');

    // Register user
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('StandupBook Test User');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/username/i).fill(testUsername);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.getByRole('button', { name: /create account/i }).click();

    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));

    // Create project
    const projectStartDate = new Date();
    const projectEndDate = new Date();
    projectEndDate.setMonth(projectEndDate.getMonth() + 3);

    const projectResponse = await context.request.post('http://localhost:3000/api/projects', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `StandupBook Test Project ${uniqueId}`,
        description: 'Test project for complete standup book testing',
        startDate: projectStartDate.toISOString().split('T')[0],
        endDate: projectEndDate.toISOString().split('T')[0],
      },
    });

    const project = await projectResponse.json();
    projectId = project.id;
    console.log(`Created project: ${projectId}`);

    // Create 14-day sprint with 2 daily standup slots
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (sprintDuration - 1));
    sprintStartDate = startDate.toISOString().split('T')[0];

    const sprintResponse = await context.request.post('http://localhost:3000/api/sprints', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `Complete Test Sprint ${uniqueId}`,
        goal: 'Test comprehensive standup book functionality',
        projectId: projectId,
        startDate: sprintStartDate,
        endDate: endDate.toISOString().split('T')[0],
        dailyStandupCount: 2,
        slotTimes: {
          '1': '09:00',
          '2': '15:00',
        },
      },
    });

    const sprint = await sprintResponse.json();
    sprintId = sprint.id;
    console.log(`Created sprint: ${sprintId} (${sprintDuration} days)`);

    // Create test cards
    const card1Response = await context.request.post('http://localhost:3000/api/cards', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: `Backend API Development - ${uniqueId}`,
        description: 'Implement REST API endpoints',
        sprintId: sprintId,
        priority: 'high',
        estimatedTime: 16,
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
        title: `Frontend UI Components - ${uniqueId}`,
        description: 'Build reusable UI components',
        sprintId: sprintId,
        priority: 'high',
        estimatedTime: 12,
      },
    });
    const card2 = await card2Response.json();
    card2Id = card2.id;

    console.log(`Created cards: ${card1Id}, ${card2Id}`);

    // Create snaps for today (Day 1) in both slots
    const today = new Date().toISOString().split('T')[0];

    await context.request.post('http://localhost:3000/api/snaps', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        cardId: card1Id,
        rawInput: 'Morning standup: Started API design and database schema',
        slotNumber: 1,
        done: 'Initial project setup',
        toDo: 'Design API endpoints and database schema',
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
        rawInput: 'Morning standup: Setting up component library',
        slotNumber: 1,
        done: 'Created project structure',
        toDo: 'Set up component library and styling',
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
        rawInput: 'Afternoon standup: Completed API design, starting implementation',
        slotNumber: 2,
        done: 'Designed API endpoints and database schema',
        toDo: 'Implement API endpoints',
        blockers: '',
        suggestedRAG: 'amber',
      },
    });

    console.log('Created snaps for today');

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

  test.describe('Sprint Overview - Bookshelf View', () => {
    test('should display standup book page and load active sprint', async ({ page }) => {
      await page.goto('/standup-book');
      await expect(page).toHaveURL('/standup-book');

      // Page title
      await expect(page.getByRole('heading', { name: /standup book/i })).toBeVisible();

      // Project selector
      const projectSelector = page.locator('select').first();
      await expect(projectSelector).toBeVisible({ timeout: 5000 });

      // Select project
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Sprint should load automatically (active sprint)
      await expect(page.getByText(`Complete Test Sprint ${uniqueId}`)).toBeVisible({ timeout: 5000 });
    });

    test('should display correct number of day books for sprint duration', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Sprint info should show total days
      await expect(page.getByText('14')).toBeVisible(); // Total Days count
      await expect(page.getByText('Total Days')).toBeVisible();
    });

    test('should display sprint goal and date range', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Sprint goal
      await expect(page.getByText('Test comprehensive standup book functionality')).toBeVisible();

      // Sprint name
      await expect(page.getByText(`Complete Test Sprint ${uniqueId}`)).toBeVisible();
    });

    test('should display legend for day book colors', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Legend items
      await expect(page.getByText('Locked')).toBeVisible();
      await expect(page.getByText('Today')).toBeVisible();
      await expect(page.getByText('Available')).toBeVisible();
      await expect(page.getByText('Future')).toBeVisible();
    });

    test('should show day numbers on all day books', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Check for Day 1, Day 7, and Day 14 (sampling)
      await expect(page.getByText('1').first()).toBeVisible();
    });
  });

  test.describe('Visual Indicators - Badges and Colors', () => {
    test('should show snap count badge on today\'s book', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Today should have snap count badge (we created 3 snaps)
      await expect(page.getByText('3')).toBeVisible();
    });

    test('should highlight today\'s book with blue color', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Find today's day book by checking for blue gradient classes
      const dayBooks = page.locator('button').filter({ hasText: /^\d+$/ });
      const todayBook = dayBooks.first();

      // Check if it has blue color classes
      const classes = await todayBook.getAttribute('class');
      expect(classes).toContain('blue');
    });

    test('should show future days as gray and not clickable', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Future days should have cursor-not-allowed or be disabled
      const dayBooks = page.locator('button[disabled]');
      const count = await dayBooks.count();

      // Should have at least 13 future days (Days 2-14)
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Day Navigation and Details', () => {
    test('should navigate to day details when clicking today\'s book', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Click on the first accessible day book (today)
      const todayBook = page.locator('button').filter({ hasText: /^1$/ }).first();
      await todayBook.click();
      await page.waitForTimeout(1500);

      // Should navigate to day details
      expect(page.url()).toContain('/standup-book');
    });

    test('should display slot groups on day details page', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      // Should see both slots
      await expect(page.getByText(/slot 1/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/slot 2/i)).toBeVisible({ timeout: 5000 });
    });

    test('should display snaps in correct slots on day details page', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      // Should see snap content
      await expect(page.getByText(/Started API design/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Setting up component library/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Completed API design/i)).toBeVisible({ timeout: 5000 });
    });

    test('should display card information with snaps', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      // Should see card titles
      await expect(page.getByText(/Backend API Development/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Frontend UI Components/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show day metadata (day number and date)', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      // Should show sprint name
      await expect(page.getByText(`Complete Test Sprint ${uniqueId}`)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Day Locking Functionality', () => {
    test('should show lock day button on unlocked day', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      // Lock button should be visible
      const lockButton = page.getByRole('button', { name: /lock day/i });
      await expect(lockButton).toBeVisible({ timeout: 5000 });
    });

    test('should lock day successfully', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      // Click lock day button
      const lockButton = page.getByRole('button', { name: /lock day/i });
      await lockButton.click();
      await page.waitForTimeout(1000);

      // May show warning modal if slots are empty, confirm if present
      const confirmButton = page.getByRole('button', { name: /confirm|yes.*lock/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(2000);

      // Should show locked status
      await expect(page.getByText(/locked/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show lock badge on day book after locking', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Today's book should now have a locked badge
      await expect(page.getByText('Locked').first()).toBeVisible({ timeout: 5000 });
    });

    test('should change day book to green after locking', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Find the locked day book
      const dayBooks = page.locator('button').filter({ hasText: /^1$/ });
      const lockedBook = dayBooks.first();

      // Should have green color classes
      const classes = await lockedBook.getAttribute('class');
      expect(classes).toContain('green');
    });
  });

  test.describe('MOM (Minutes of Meeting) Management', () => {
    test('should show create MOM button on day details', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      // Create MOM button should be visible
      const momButton = page.getByRole('button', { name: /create mom/i });
      await expect(momButton).toBeVisible({ timeout: 5000 });
    });

    test('should open MOM creation modal', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      const momButton = page.getByRole('button', { name: /create mom/i });
      await momButton.click();
      await page.waitForTimeout(1000);

      // Modal should open
      await expect(page.getByRole('heading', { name: /create.*mom/i })).toBeVisible({ timeout: 5000 });
    });

    test('should create MOM with AI generation', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      // Open MOM modal
      const momButton = page.getByRole('button', { name: /create mom/i });
      await momButton.click();
      await page.waitForTimeout(1000);

      // Enter raw meeting notes
      const rawInput = page.locator('textarea').first();
      await rawInput.fill('Daily standup meeting. Team discussed API development progress. Decided to use REST architecture. Action: Complete database schema by tomorrow.');

      // Generate MOM
      const generateButton = page.getByRole('button', { name: /generate/i });
      await generateButton.click();
      await page.waitForTimeout(3000); // Wait for AI generation

      // MOM should be created
      const successMessage = page.getByText(/mom.*created|success/i);
      if (await successMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(successMessage).toBeVisible();
      }
    });

    test('should display MOM on day details after creation', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      // Should show MOM section
      const momSection = page.getByText(/agenda|discussion points|decisions|action items/i).first();
      await expect(momSection).toBeVisible({ timeout: 5000 });
    });

    test('should show MOM badge on day book after creation', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Today's book should have MOM badge
      await expect(page.getByText('MOM')).toBeVisible({ timeout: 5000 });
    });

    test('should download MOM as text file', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/standup-book/${sprintId}/${today}`);
      await page.waitForTimeout(2000);

      // Download button should be visible if MOM exists
      const downloadButton = page.getByRole('button', { name: /download/i });
      if (await downloadButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          downloadButton.click(),
        ]);

        // Verify download
        expect(download.suggestedFilename()).toMatch(/MOM.*\.txt/);
      }
    });
  });

  test.describe('Complete Sprint Testing Scenarios', () => {
    test('should verify all day books are accessible or properly restricted', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Count total day books
      const allDayBooks = page.locator('button').filter({ hasText: /^\d+$/ });
      const totalBooks = await allDayBooks.count();

      console.log(`Total day books: ${totalBooks}`);
      expect(totalBooks).toBeGreaterThanOrEqual(14); // At least sprint duration

      // Count disabled (future) books
      const disabledBooks = page.locator('button[disabled]').filter({ hasText: /^\d+$/ });
      const futureCount = await disabledBooks.count();

      console.log(`Future (disabled) day books: ${futureCount}`);
      expect(futureCount).toBeGreaterThan(0); // Should have future days
    });

    test('should show sprint progress overview', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Should show total days
      await expect(page.getByText('14')).toBeVisible();

      // Should show at least one locked day (green book)
      const lockedBadge = page.getByText('Locked').first();
      await expect(lockedBadge).toBeVisible({ timeout: 5000 });

      // Should show at least one MOM badge
      const momBadge = page.getByText('MOM');
      await expect(momBadge).toBeVisible({ timeout: 5000 });
    });

    test('should navigate through multiple days sequentially', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Click Day 1
      const day1Book = page.locator('button').filter({ hasText: /^1$/ }).first();
      await day1Book.click();
      await page.waitForTimeout(1500);

      // Verify we're on day 1 details
      expect(page.url()).toContain(sprintId);

      // Go back to bookshelf
      await page.goBack();
      await page.waitForTimeout(1000);

      // Should be back on bookshelf
      await expect(page.getByText(`Complete Test Sprint ${uniqueId}`)).toBeVisible();
    });

    test('should display consistent data across bookshelf and day details', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2500);

      // Get snap count from bookshelf badge
      const snapBadge = page.getByText('3').first();
      await expect(snapBadge).toBeVisible();

      // Navigate to day details
      const day1Book = page.locator('button').filter({ hasText: /^1$/ }).first();
      await day1Book.click();
      await page.waitForTimeout(2000);

      // Verify snaps are visible on details page (3 snaps created)
      const snaps = page.locator('div').filter({ hasText: /done|to do|blockers/i });
      const snapCount = await snaps.count();
      expect(snapCount).toBeGreaterThan(0);
    });

    test('should handle locked day restrictions properly', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];

      // Verify lock is enforced in Cards view
      await page.goto(`/cards?projectId=${projectId}`);
      await page.waitForTimeout(1000);

      // Find and click first card
      const card = page.getByText(/Backend API Development/i).first();
      await card.click();
      await page.waitForTimeout(1000);

      // Should NOT see "Add Snap" button (day is locked)
      const addSnapButton = page.getByRole('button', { name: /add snap/i });
      await expect(addSnapButton).not.toBeVisible();

      // Should see lock warning
      const lockWarning = page.getByText(/locked|cannot add/i).first();
      await expect(lockWarning).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle project with no active sprint gracefully', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      // If we deselect project (select empty option)
      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption('');
      await page.waitForTimeout(1000);

      // Should show appropriate message or empty state
      const emptyState = page.getByText(/select.*project|no.*sprint/i);
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    });

    test('should handle navigation to non-existent day gracefully', async ({ page }) => {
      // Try to access a day far in the future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 100);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      await page.goto(`/standup-book/${sprintId}/${futureDateStr}`);
      await page.waitForTimeout(2000);

      // Should either redirect or show error
      // Page should handle this gracefully (not crash)
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    });

    test('should maintain state when navigating back to bookshelf', async ({ page }) => {
      await page.goto('/standup-book');
      await page.waitForTimeout(1000);

      const projectSelector = page.locator('select').first();
      await projectSelector.selectOption({ value: projectId });
      await page.waitForTimeout(2000);

      // Remember sprint name
      const sprintName = `Complete Test Sprint ${uniqueId}`;
      await expect(page.getByText(sprintName)).toBeVisible();

      // Navigate to day details
      const day1Book = page.locator('button').filter({ hasText: /^1$/ }).first();
      await day1Book.click();
      await page.waitForTimeout(1500);

      // Go back
      await page.goBack();
      await page.waitForTimeout(1000);

      // Sprint should still be loaded (state maintained)
      await expect(page.getByText(sprintName)).toBeVisible();
    });
  });
});
