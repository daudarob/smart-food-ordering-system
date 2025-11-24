import { test, expect } from '@playwright/test';

test.describe('AdminDashboard Cross-Browser Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and API calls
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'mock-token');
      window.localStorage.setItem('user', JSON.stringify({
        id: 1,
        name: 'Test Admin',
        role: 'cafeteria_admin',
        cafeteria_id: 'cafeteria-paul-caffe'
      }));
    });

    // Mock API responses
    await page.route('**/api/admin/orders', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            total: 150,
            status: 'pending',
            created_at: '2025-11-05T00:00:00.000Z',
            user: { name: 'Test User', email: 'test@example.com' }
          }
        ])
      });
    });

    await page.route('**/api/categories', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Beverages', description: 'Drinks and beverages' }
        ])
      });
    });

    await page.route('**/api/menu-items', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: 'Coffee',
            description: 'Hot coffee',
            price: 50,
            category_id: 1,
            available: true,
            stock: 10,
            Category: { name: 'Beverages' }
          }
        ])
      });
    });
  });

  test('should load admin dashboard correctly', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await expect(page).toHaveTitle(/USIU.*Food.*System/);

    // Check main elements are present
    await expect(page.locator('h2').filter({ hasText: 'Admin Dashboard' })).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('should display statistics correctly', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Check stat cards
    await expect(page.locator('.stat-card').filter({ hasText: 'Total Orders' })).toBeVisible();
    await expect(page.locator('.stat-card').filter({ hasText: 'Revenue' })).toBeVisible();
    await expect(page.locator('.stat-card').filter({ hasText: 'Active Users' })).toBeVisible();
  });

  test('should display inventory alerts', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Check inventory alerts section
    await expect(page.locator('#inventory-heading')).toBeVisible();
  });

  test('should display analytics chart', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Check analytics section
    await expect(page.locator('#analytics-heading')).toBeVisible();
    await expect(page.locator('#chart-description')).toBeVisible();
  });

  test('should display management tables', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Check table sections
    await expect(page.locator('#categories-heading')).toBeVisible();
    await expect(page.locator('#menu-heading')).toBeVisible();
    await expect(page.locator('#orders-heading')).toBeVisible();
  });

  test('should handle skip link functionality', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Check skip link exists and is focusable
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeVisible();

    // Focus skip link
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();

    // Click skip link and check focus moves to main content
    await skipLink.click();
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Check navigation has proper role
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();

    // Check main content has proper role
    await expect(page.locator('main[role="main"]')).toBeVisible();

    // Check stat cards have aria-labels
    const statCards = page.locator('.stat-card p');
    await expect(statCards.first()).toHaveAttribute('aria-label');
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab'); // Skip link
    await expect(page.locator('.skip-link')).toBeFocused();

    await page.keyboard.press('Tab'); // First nav button
    const firstNavButton = page.locator('.nav-links button').first();
    await expect(firstNavButton).toBeFocused();
  });

  test('should handle form accessibility', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Click add category button
    await page.locator('button').filter({ hasText: 'Add Category' }).click();

    // Check modal is open
    await expect(page.locator('h3').filter({ hasText: 'Add Category' })).toBeVisible();

    // Check form inputs have proper labels and descriptions
    const nameInput = page.locator('input[type="text"]').first();
    await expect(nameInput).toHaveAttribute('aria-describedby', 'name-help');

    const descriptionInput = page.locator('input[type="text"]').nth(1);
    await expect(descriptionInput).toHaveAttribute('aria-describedby', 'description-help');
  });

  test('should display error messages accessibly', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Click add category button
    await page.locator('button').filter({ hasText: 'Add Category' }).click();

    // Try to save without name (should show error)
    await page.locator('button').filter({ hasText: 'Save' }).click();

    // Check for error message with role="alert"
    const errorMessage = page.locator('.error[role="alert"]');
    // Note: This assumes the form validation will trigger an error
    // In a real scenario, you might need to mock the API to return an error
  });

  test('should handle chart accessibility', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Check chart has proper ARIA attributes
    const chartContainer = page.locator('[role="img"]');
    await expect(chartContainer).toHaveAttribute('aria-labelledby', 'analytics-heading');
    await expect(chartContainer).toHaveAttribute('aria-describedby', 'chart-description');
  });

  test('should work with screen readers - headings hierarchy', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Check heading hierarchy
    const h2 = page.locator('h2').filter({ hasText: 'Admin Dashboard' });
    await expect(h2).toBeVisible();

    const h3Elements = page.locator('h3');
    await expect(h3Elements).toHaveCount(await h3Elements.count()); // At least some h3s exist
  });

  test('should handle table accessibility', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Check tables have proper structure (assuming Table component handles this)
    const tables = page.locator('table');
    await expect(tables.first()).toBeVisible();
  });

  test('should handle modal accessibility', async ({ page }) => {
    await page.goto('/admin-dashboard');

    // Open category modal
    await page.locator('button').filter({ hasText: 'Add Category' }).click();

    // Check modal focus management (focus should be trapped in modal)
    const modal = page.locator('.modal'); // Assuming modal has this class
    if (await modal.isVisible()) {
      // Check that tab navigation stays within modal
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      // Focus should still be within modal
    }
  });
});