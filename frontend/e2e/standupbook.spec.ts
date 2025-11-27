import { test, expect } from '@playwright/test';

test.describe('Standup Book E2E Flow', () => {
  let authToken: string;
  let projectId: string;
  let sprintId: string;
  const uniqueId = Date.now();
  const testUsername = `standuptest${uniqueId}`;
  const testEmail = `standuptest${uniqueId}@example.com`;
  const testPassword = 'Test123456!';
  const projectName = `Standup Test Project ${uniqueId}`;
  const sprintName = `Test Sprint ${uniqueId}`;

  test.beforeAll(async ({ request }) => {
    // Register a test user and create initial data
    try {
      console.log('Registering test user:', testUsername);
      const response = await request.post('http://localhost:3000/api/auth/register', {
        data: {
          username: testUsername,
          email: testEmail,
          password: testPassword,
          name: 'Standup Test User',
          roleName: 'scrum_master',
        },
      });

      if (!response.ok()) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Registration failed:', errorData);
        throw new Error(`Registration failed: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      authToken = data.accessToken;
      console.log('User registered successfully');

      // Create project
      console.log('Creating test project');
      const projectStartDate = new Date();
      const projectEndDate = new Date();
      projectEndDate.setMonth(projectEndDate.getMonth() + 3); // 3 months project

      const projectResponse = await request.post('http://localhost:3000/api/projects', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: projectName,
          description: 'Test project for standup book',
          startDate: projectStartDate.toISOString().split('T')[0],
          endDate: projectEndDate.toISOString().split('T')[0],
        },
      });

      if (!projectResponse.ok()) {
        const errorData = await projectResponse.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Project creation failed:', errorData);
        throw new Error(`Failed to create project: ${JSON.stringify(errorData)}`);
      }

      const project = await projectResponse.json();
      projectId = project.id;
      console.log('Project created:', projectId);

      // Create active sprint
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);

      console.log('Creating test sprint');
      const sprintResponse = await request.post('http://localhost:3000/api/sprints', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: sprintName,
          projectId: projectId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dailyStandupCount: 2,
          // Status is automatically calculated based on dates
        },
      });

      if (!sprintResponse.ok()) {
        const errorData = await sprintResponse.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Sprint creation failed:', errorData);
        throw new Error(`Failed to create sprint: ${JSON.stringify(errorData)}`);
      }

      const sprint = await sprintResponse.json();
      sprintId = sprint.id;
      console.log('Sprint created:', sprintId);
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  test.beforeEach(async ({ page }) => {
    // Set auth token directly in localStorage before navigation
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('accessToken', token);
    }, authToken);

    // Navigate to home page - should be logged in
    await page.goto('/');

    // Wait a bit for auth to process
    await page.waitForTimeout(1000);

    // Verify we're logged in by checking we're not redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // If still on login page, try manual login
      console.log('Auth token not working, trying manual login');
      await page.getByPlaceholder(/username or email/i).fill(testUsername);
      await page.getByPlaceholder(/password/i).fill(testPassword);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(2000);

      // Check if login succeeded
      if (page.url().includes('/login')) {
        throw new Error('Login failed - still on login page');
      }
    }
  });

  test.describe('Standup Book Main Page', () => {
    test('should navigate to standup book page', async ({ page }) => {
      await page.goto('/standup-book');
      await expect(page).toHaveURL('/standup-book');
      await expect(page.getByRole('heading', { name: /standup book/i })).toBeVisible({ timeout: 5000 });
    });

    test('should display project selector', async ({ page }) => {
      await page.goto('/standup-book');
      await expect(page.locator('select, [role="combobox"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('should show active sprint when project selected', async ({ page }) => {
      await page.goto('/standup-book');

      // Wait for projects to load
      await page.waitForTimeout(1000);

      // Select the test project
      const projectSelector = page.locator('select, [role="combobox"]').first();
      const options = await projectSelector.locator('option').allTextContents();
      console.log('Available projects:', options);

      if (options.some(opt => opt.includes(projectName))) {
        await projectSelector.selectOption({ label: projectName });

        // Wait for sprint to load
        await page.waitForTimeout(1000);

        // Verify sprint name appears
        await expect(page.getByText(sprintName)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display sprint days calendar', async ({ page }) => {
      await page.goto('/standup-book');

      // Select project
      await page.waitForTimeout(1000);
      const projectSelector = page.locator('select, [role="combobox"]').first();

      try {
        await projectSelector.selectOption({ label: projectName });
      } catch (e) {
        console.log('Could not select project by label, trying by value');
        await projectSelector.selectOption({ value: projectId });
      }

      // Wait for days to load
      await page.waitForTimeout(2000);

      // Verify days are displayed
      const days = page.locator('[data-testid*="day-"], .day-card, .calendar-day');
      const count = await days.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show day numbers and dates', async ({ page }) => {
      await page.goto('/standup-book');

      await page.waitForTimeout(1000);
      const projectSelector = page.locator('select, [role="combobox"]').first();

      try {
        await projectSelector.selectOption({ label: projectName });
      } catch (e) {
        await projectSelector.selectOption({ value: projectId });
      }

      await page.waitForTimeout(2000);

      // Verify day 1 is visible
      await expect(page.getByText(/day 1/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Day Details Page', () => {
    test('should navigate to day details when day is clicked', async ({ page }) => {
      await page.goto('/standup-book');

      await page.waitForTimeout(1000);
      const projectSelector = page.locator('select, [role="combobox"]').first();

      try {
        await projectSelector.selectOption({ label: projectName });
      } catch (e) {
        await projectSelector.selectOption({ value: projectId });
      }

      await page.waitForTimeout(2000);

      // Click on the first accessible day
      const firstDay = page.locator('[data-testid*="day-"], .day-card, .calendar-day').first();
      await firstDay.click();

      // Verify we're on day details page
      await expect(page).toHaveURL(/standup-book-day/);
    });

    test('should display day metadata on day details page', async ({ page }) => {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      await page.goto(`/standup-book-day/${sprintId}/${today}`);
      await page.waitForTimeout(1000);

      // Verify day details are shown
      await expect(page.getByText(/day/i)).toBeVisible({ timeout: 5000 });
    });

    test('should display slots on day details page', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];

      await page.goto(`/standup-book-day/${sprintId}/${today}`);
      await page.waitForTimeout(1000);

      // Verify slots are displayed (sprint has 2 daily standup slots)
      const hasSlot = await page.getByText(/slot 1/i).or(page.getByText(/standup 1/i)).isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasSlot).toBeTruthy();
    });
  });

  test.describe('Lock Day Functionality', () => {
    test('should show lock day button when day is not locked', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];

      await page.goto(`/standup-book-day/${sprintId}/${today}`);
      await page.waitForTimeout(1000);

      // Check if lock button exists
      const lockButton = page.getByRole('button', { name: /lock day/i });
      const isVisible = await lockButton.isVisible({ timeout: 3000 }).catch(() => false);

      // Button should be visible or page should indicate day is already locked
      expect(isVisible || await page.getByText(/locked/i).isVisible().catch(() => false)).toBeTruthy();
    });
  });

  test.describe('MOM (Minutes of Meeting)', () => {
    test('should show create MOM button on day details page', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];

      await page.goto(`/standup-book-day/${sprintId}/${today}`);
      await page.waitForTimeout(1000);

      // Check if create MOM button or MOM content exists
      const hasMomButton = await page.getByRole('button', { name: /create mom|add mom/i }).isVisible({ timeout: 3000 }).catch(() => false);
      const hasMomContent = await page.getByText(/mom|meeting|minutes/i).isVisible().catch(() => false);

      expect(hasMomButton || hasMomContent).toBeTruthy();
    });
  });

  test.describe('Navigation and Back Button', () => {
    test('should navigate back to standup book main page from day details', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];

      await page.goto(`/standup-book-day/${sprintId}/${today}`);
      await page.waitForTimeout(1000);

      // Try to go back
      await page.goBack();

      // Verify we're back on standup book page (or at least not on day details)
      await page.waitForTimeout(500);
      const url = page.url();
      expect(url.includes('/standup-book') && !url.includes('/standup-book-day')).toBeTruthy();
    });
  });

  test.describe('Data Validation', () => {
    test('should display correct day number', async ({ page }) => {
      await page.goto('/standup-book');

      await page.waitForTimeout(1000);
      const projectSelector = page.locator('select, [role="combobox"]').first();

      try {
        await projectSelector.selectOption({ label: projectName });
      } catch (e) {
        await projectSelector.selectOption({ value: projectId });
      }

      await page.waitForTimeout(2000);

      // First day should be Day 1
      await expect(page.getByText(/day 1/i).first()).toBeVisible();
    });

    test('should show snap count on day cards', async ({ page }) => {
      await page.goto('/standup-book');

      await page.waitForTimeout(1000);
      const projectSelector = page.locator('select, [role="combobox"]').first();

      try {
        await projectSelector.selectOption({ label: projectName });
      } catch (e) {
        await projectSelector.selectOption({ value: projectId });
      }

      await page.waitForTimeout(2000);

      // Verify snap count is displayed (should be 0 for new sprint)
      const hasSnapText = await page.getByText(/snap/i).isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasSnapText).toBeTruthy();
    });
  });

  test.describe('Permissions and Access Control', () => {
    test('should allow SCRUM_MASTER to access standup book', async ({ page }) => {
      await page.goto('/standup-book');

      // Should successfully load page without permission errors
      await expect(page.getByRole('heading', { name: /standup book/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid sprint ID gracefully', async ({ page }) => {
      await page.goto('/standup-book-day/00000000-0000-0000-0000-000000000000/2025-01-01');
      await page.waitForTimeout(1000);

      // Should show error message or redirect
      const hasError = await page.getByText(/not found|error|invalid/i).isVisible({ timeout: 3000 }).catch(() => false);
      const isRedirected = page.url().includes('/standup-book') && !page.url().includes('/standup-book-day');

      expect(hasError || isRedirected).toBeTruthy();
    });

    test('should handle invalid date gracefully', async ({ page }) => {
      await page.goto(`/standup-book-day/${sprintId}/invalid-date`);
      await page.waitForTimeout(1000);

      // Should show error or redirect
      const hasError = await page.getByText(/not found|error|invalid/i).isVisible({ timeout: 3000 }).catch(() => false);
      const isRedirected = page.url().includes('/standup-book') && !page.url().includes('/standup-book-day');

      expect(hasError || isRedirected).toBeTruthy();
    });
  });
});
