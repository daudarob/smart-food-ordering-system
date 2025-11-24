import { test, expect } from '@playwright/test';

test.describe('Login Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should load login page correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/USIU.*Food.*System/);

    // Check login form elements
    await expect(page.locator('h2').filter({ hasText: 'Login' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]').filter({ hasText: 'Login' })).toBeVisible();
  });

  test('should toggle between login and register modes', async ({ page }) => {
    await page.goto('/login');

    // Should start in login mode
    await expect(page.locator('h2').filter({ hasText: 'Login' })).toBeVisible();
    await expect(page.locator('input[type="text"]')).not.toBeVisible(); // Name field should be hidden

    // Click toggle button
    await page.locator('button').filter({ hasText: 'Need to register?' }).click();

    // Should switch to register mode
    await expect(page.locator('h2').filter({ hasText: 'Register' })).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible(); // Name field should be visible
    await expect(page.locator('button').filter({ hasText: 'Register' })).toBeVisible();

    // Click toggle button again
    await page.locator('button').filter({ hasText: 'Already have an account?' }).click();

    // Should switch back to login mode
    await expect(page.locator('h2').filter({ hasText: 'Login' })).toBeVisible();
    await expect(page.locator('input[type="text"]')).not.toBeVisible();
  });

  test('should handle form input validation', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.locator('button[type="submit"]').filter({ hasText: 'Login' }).click();

    // Check that form validation prevents submission (HTML5 validation)
    // Note: This assumes the form has required attributes
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    // Check required attributes
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('should handle successful login for admin user', async ({ page }) => {
    // Mock successful login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: '1',
          token: 'mock-jwt-token-admin',
          name: 'Test Admin',
          role: 'cafeteria_admin',
          email: 'admin@test.com',
          cafeteria_id: 'cafeteria-paul-caffe'
        })
      });
    });

    await page.goto('/login');

    // Fill login form
    await page.locator('input[type="email"]').fill('admin@test.com');
    await page.locator('input[type="password"]').fill('password123');

    // Submit form
    await page.locator('button[type="submit"]').filter({ hasText: 'Login' }).click();

    // Should redirect to admin dashboard
    await page.waitForURL('**/admin');
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('should handle successful login for regular user', async ({ page }) => {
    // Mock successful login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: '2',
          token: 'mock-jwt-token-user',
          name: 'Test User',
          role: 'student',
          email: 'student@test.com'
        })
      });
    });

    await page.goto('/login');

    // Fill login form
    await page.locator('input[type="email"]').fill('student@test.com');
    await page.locator('input[type="password"]').fill('password123');

    // Submit form
    await page.locator('button[type="submit"]').filter({ hasText: 'Login' }).click();

    // Should redirect to home page
    await page.waitForURL('**/');
    await expect(page).toHaveURL(/\/$/);
  });

  test('should handle login failure', async ({ page }) => {
    // Mock failed login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid credentials'
        })
      });
    });

    await page.goto('/login');

    // Fill login form with wrong credentials
    await page.locator('input[type="email"]').fill('wrong@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');

    // Submit form
    await page.locator('button[type="submit"]').filter({ hasText: 'Login' }).click();

    // Should stay on login page and show error
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should handle successful registration', async ({ page }) => {
    // Mock successful registration response
    await page.route('**/api/auth/register', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: '3',
          token: 'mock-jwt-token-newuser',
          name: 'New User',
          role: 'student',
          email: 'newuser@test.com'
        })
      });
    });

    await page.goto('/login');

    // Switch to register mode
    await page.locator('button').filter({ hasText: 'Need to register?' }).click();

    // Fill registration form
    await page.locator('input[type="text"]').fill('New User');
    await page.locator('input[type="email"]').fill('newuser@test.com');
    await page.locator('input[type="password"]').fill('password123');

    // Submit form
    await page.locator('button').filter({ hasText: 'Register' }).click();

    // Should redirect to home page
    await page.waitForURL('**/');
    await expect(page).toHaveURL(/\/$/);
  });

  test('should persist login state across page reloads', async ({ page }) => {
    // Mock successful login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: '1',
          token: 'mock-jwt-token-admin',
          name: 'Test Admin',
          role: 'cafeteria_admin',
          email: 'admin@test.com',
          cafeteria_id: 'cafeteria-paul-caffe'
        })
      });
    });

    await page.goto('/login');

    // Login
    await page.locator('input[type="email"]').fill('admin@test.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button').filter({ hasText: 'Login' }).click();

    // Wait for redirect
    await page.waitForURL('**/admin');

    // Reload page
    await page.reload();

    // Should still be logged in and on admin page
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('h2').filter({ hasText: 'Admin Dashboard' })).toBeVisible();
  });

  test('should handle logout correctly', async ({ page }) => {
    // Mock successful login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: '1',
          token: 'mock-jwt-token-admin',
          name: 'Test Admin',
          role: 'cafeteria_admin',
          email: 'admin@test.com',
          cafeteria_id: 'cafeteria-paul-caffe'
        })
      });
    });

    await page.goto('/login');

    // Login
    await page.locator('input[type="email"]').fill('admin@test.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button').filter({ hasText: 'Login' }).click();

    // Wait for redirect to admin
    await page.waitForURL('**/admin');

    // Click logout button
    await page.locator('button').filter({ hasText: 'Logout' }).first().click();

    // Should redirect to login page
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/auth/login', async route => {
      await route.abort();
    });

    await page.goto('/login');

    // Fill and submit form
    await page.locator('input[type="email"]').fill('admin@test.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').filter({ hasText: 'Login' }).click();

    // Should show error message
    await expect(page.locator('.error')).toBeVisible();
  });

  test('should be accessible - keyboard navigation', async ({ page }) => {
    await page.goto('/login');

    // Test tab navigation
    await page.keyboard.press('Tab'); // Focus email input
    await expect(page.locator('input[type="email"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Focus password input
    await expect(page.locator('input[type="password"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Focus login button
    await expect(page.locator('button').filter({ hasText: 'Login' })).toBeFocused();

    await page.keyboard.press('Tab'); // Focus toggle button
    await expect(page.locator('button').filter({ hasText: 'Need to register?' })).toBeFocused();
  });

  test('should have proper form labels and accessibility', async ({ page }) => {
    await page.goto('/login');

    // Check form labels
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required');

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('required');

    // Check that labels are properly associated (assuming FormInput component handles this)
    await expect(page.locator('label').filter({ hasText: 'Email' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Password' })).toBeVisible();
  });
});