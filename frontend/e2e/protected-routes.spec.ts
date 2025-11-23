import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth state
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('should allow access to dashboard when authenticated', async ({ page }) => {
    const uniqueEmail = `test${Date.now()}@example.com`;
    const uniqueUsername = `testuser${Date.now()}`;

    // Register
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/username/i).fill(uniqueUsername);
    await page.locator('input[name="password"]').fill('Test123456!');
    await page.getByRole('button', { name: /create account/i }).click();

    // Should be able to access dashboard
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should allow access to login and register without auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.goto('/register');
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: /create.*account/i })).toBeVisible();
  });

  test('should redirect unknown routes to home', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await expect(page).toHaveURL('/login'); // Redirects to login since not authenticated
  });
});
