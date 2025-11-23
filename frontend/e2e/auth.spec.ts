import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const uniqueUsername = `testuser${Date.now()}`;
  const uniqueEmail = `test${Date.now()}@example.com`;
  const password = 'Test123456!';
  const name = 'Test User';

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    // Navigate first, then clear storage
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Login', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL('/login');
    });

    test('should show login form', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      await expect(page.getByPlaceholder(/username or email/i)).toBeVisible();
      await expect(page.getByPlaceholder(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should navigate to register page from login', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('link', { name: /create account/i }).click();
      await expect(page).toHaveURL('/register');
    });

    test('should navigate to forgot password page from login', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('link', { name: /forgotten password/i }).click();
      await expect(page).toHaveURL('/forgot-password');
    });

    test('should login with valid credentials', async ({ page }) => {
      // Use unique values for this test
      const testEmail = `test${Date.now()}@example.com`;
      const testUsername = `testuser${Date.now()}`;

      // First register a user
      await page.goto('/register');
      await page.getByLabel(/full name/i).fill(name);
      await page.getByLabel(/email/i).fill(testEmail);
      await page.getByLabel(/username/i).fill(testUsername);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // Logout
      await page.getByRole('button', { name: /sign out|logout/i }).click();
      await expect(page).toHaveURL('/login');

      // Login with username
      await page.getByPlaceholder(/username or email/i).fill(testUsername);
      await page.getByPlaceholder(/password/i).fill(password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('should login with email instead of username', async ({ page }) => {
      // Register first
      const email2 = `test${Date.now()}2@example.com`;
      const username2 = `testuser${Date.now()}2`;

      await page.goto('/register');
      await page.getByLabel(/full name/i).fill(name);
      await page.getByLabel(/email/i).fill(email2);
      await page.getByLabel(/username/i).fill(username2);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // Logout
      await page.getByRole('button', { name: /sign out|logout/i }).click();

      // Login with email
      await page.getByPlaceholder(/username or email/i).fill(email2);
      await page.getByPlaceholder(/password/i).fill(password);
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('should not login with invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.getByPlaceholder(/username or email/i).fill('wronguser');
      await page.getByPlaceholder(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error
      await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible();
      await expect(page).toHaveURL('/login');
    });

    test('should persist authentication on page refresh', async ({ page }) => {
      // Register
      const email3 = `test${Date.now()}3@example.com`;
      const username3 = `testuser${Date.now()}3`;

      await page.goto('/register');
      await page.getByLabel(/full name/i).fill(name);
      await page.getByLabel(/email/i).fill(email3);
      await page.getByLabel(/username/i).fill(username3);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // Refresh page
      await page.reload();

      // Should still be on dashboard
      await expect(page).toHaveURL('/');
      await expect(page.getByText(/welcome back/i)).toBeVisible();
    });
  });

  test.describe('Registration', () => {
    test('should show registration form', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: /create.*account/i })).toBeVisible();
      await expect(page.getByLabel(/full name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/username/i)).toBeVisible();
    });

    test('should register a new user successfully', async ({ page }) => {
      const email4 = `test${Date.now()}4@example.com`;
      const username4 = `testuser${Date.now()}4`;

      await page.goto('/register');
      await page.getByLabel(/full name/i).fill(name);
      await page.getByLabel(/email/i).fill(email4);
      await page.getByLabel(/username/i).fill(username4);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', { name: /create account/i }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL('/', { timeout: 10000 });
      await expect(page.getByText(/welcome back/i)).toBeVisible();
    });

    test('should not register with duplicate username', async ({ page }) => {
      const email5 = `test${Date.now()}5@example.com`;
      const username5 = `testuser${Date.now()}5`;

      // First registration
      await page.goto('/register');
      await page.getByLabel(/full name/i).fill(name);
      await page.getByLabel(/email/i).fill(email5);
      await page.getByLabel(/username/i).fill(username5);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // Logout
      await page.getByRole('button', { name: /sign out|logout/i }).click();

      // Try again with same username
      await page.goto('/register');
      await page.getByLabel(/full name/i).fill(name);
      await page.getByLabel(/email/i).fill(`different${Date.now()}@example.com`);
      await page.getByLabel(/username/i).fill(username5);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show error
      await expect(page.getByText(/username.*already|already.*registered/i)).toBeVisible();
    });

    test('should navigate to login from register', async ({ page }) => {
      await page.goto('/register');
      await page.getByRole('link', { name: /sign in/i }).click();
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Forgot Password', () => {
    test('should show forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');
      await expect(page.getByRole('heading', { name: /forgotten password/i })).toBeVisible();
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
    });

    test('should show success message after submitting email', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.getByPlaceholder(/email/i).fill('test@example.com');
      await page.getByRole('button', { name: /send reset link/i }).click();

      // Should show success message
      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
    });

    test('should navigate back to login', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.getByRole('link', { name: /back to sign in/i }).click();
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Reset Password', () => {
    test('should show invalid token message without token', async ({ page }) => {
      await page.goto('/reset-password');
      await expect(page.getByRole('heading', { name: /invalid reset link/i })).toBeVisible();
    });

    test('should show reset password form with token', async ({ page }) => {
      await page.goto('/reset-password?token=test-token');
      await expect(page.getByRole('heading', { name: /reset.*password/i })).toBeVisible();
      await expect(page.getByLabel(/new password/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    });

    test('should validate password match', async ({ page }) => {
      await page.goto('/reset-password?token=test-token');
      await page.getByLabel(/new password/i).fill('password123');
      await page.getByLabel(/confirm password/i).fill('different123');
      await page.getByRole('button', { name: /reset password/i }).click();

      // Should show error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('should validate minimum password length', async ({ page }) => {
      await page.goto('/reset-password?token=test-token');
      await page.getByLabel(/new password/i).fill('short');
      await page.getByLabel(/confirm password/i).fill('short');
      await page.getByRole('button', { name: /reset password/i }).click();

      // Should show error
      await expect(page.getByText(/at least 6 characters/i)).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // Register first
      const email7 = `test${Date.now()}7@example.com`;
      const username7 = `testuser${Date.now()}7`;

      await page.goto('/register');
      await page.getByLabel(/full name/i).fill(name);
      await page.getByLabel(/email/i).fill(email7);
      await page.getByLabel(/username/i).fill(username7);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // Logout
      await page.getByRole('button', { name: /sign out|logout/i }).click();

      // Should redirect to login
      await expect(page).toHaveURL('/login');

      // Try to access dashboard
      await page.goto('/');
      await expect(page).toHaveURL('/login');
    });
  });
});
