import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const uniqueEmail = `test${Date.now()}@example.com`;
  const password = 'Test123456';
  const firstName = 'Test';
  const lastName = 'User';

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to standupsnap/i })).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate to register page from login', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /create a new account/i }).click();
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');

    // Fill registration form
    await page.getByPlaceholder('First Name').fill(firstName);
    await page.getByPlaceholder('Last Name').fill(lastName);
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder(/password.*min/i).fill(password);

    // Submit form
    await page.getByRole('button', { name: /create account/i }).click();

    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.getByText(`Welcome back, ${firstName}!`)).toBeVisible();
    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();
  });

  test('should not register with duplicate email', async ({ page }) => {
    // First registration
    await page.goto('/register');
    await page.getByPlaceholder('First Name').fill(firstName);
    await page.getByPlaceholder('Last Name').fill(lastName);
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder(/password.*min/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Logout
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL('/login');

    // Try to register again with same email
    await page.goto('/register');
    await page.getByPlaceholder('First Name').fill(firstName);
    await page.getByPlaceholder('Last Name').fill(lastName);
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder(/password.*min/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show error
    await expect(page.getByText(/user with this email already exists/i)).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // First register a user
    await page.goto('/register');
    await page.getByPlaceholder('First Name').fill(firstName);
    await page.getByPlaceholder('Last Name').fill(lastName);
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder(/password.*min/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Logout
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL('/login');

    // Login
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.getByText(`Welcome back, ${firstName}!`)).toBeVisible();
  });

  test('should not login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill('wrong@example.com');
    await page.getByPlaceholder('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // Register and login
    await page.goto('/register');
    await page.getByPlaceholder('First Name').fill(firstName);
    await page.getByPlaceholder('Last Name').fill(lastName);
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder(/password.*min/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Logout
    await page.getByRole('button', { name: /logout/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Try to access dashboard
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('should persist authentication on page refresh', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.getByPlaceholder('First Name').fill(firstName);
    await page.getByPlaceholder('Last Name').fill(lastName);
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder(/password.*min/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Refresh page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText(`Welcome back, ${firstName}!`)).toBeVisible();
  });

  test('should validate required fields on register', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /create account/i }).click();

    // HTML5 validation should prevent submission
    const firstNameInput = page.getByPlaceholder('First Name');
    await expect(firstNameInput).toHaveAttribute('required');
  });

  test('should validate minimum password length', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder('First Name').fill(firstName);
    await page.getByPlaceholder('Last Name').fill(lastName);
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder(/password.*min/i).fill('short');

    // HTML5 validation should show error
    const passwordInput = page.getByPlaceholder(/password.*min/i);
    await expect(passwordInput).toHaveAttribute('minlength', '6');
  });

  test('should show loading state during registration', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder('First Name').fill(firstName);
    await page.getByPlaceholder('Last Name').fill(lastName);
    await page.getByPlaceholder('Email address').fill(uniqueEmail);
    await page.getByPlaceholder(/password.*min/i).fill(password);

    // Click and check for loading state
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();

    // Button should show loading text
    await expect(submitButton).toContainText(/creating account/i);
    await expect(submitButton).toBeDisabled();
  });
});
