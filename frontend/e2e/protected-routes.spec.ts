import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth state
    await page.context().clearCookies();
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

    // Register
    await page.goto('/register');
    await page.getByPlaceholder('First Name').fill('Test');
    await page.getByPlaceholder('Last Name').fill('User');
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder(/password.*min/i).fill('Test123456');
    await page.getByRole('button', { name: /create account/i }).click();

    // Should be able to access dashboard
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test('should allow access to login and register without auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    await page.goto('/register');
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('should redirect unknown routes to home', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await expect(page).toHaveURL('/login'); // Redirects to login since not authenticated
  });
});
