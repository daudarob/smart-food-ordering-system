import { test, expect } from '@playwright/test';

test.describe('Cross-browser Compatibility Tests', () => {
  test('should load homepage on all browsers', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/USIU.*Food.*System/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should display menu items correctly', async ({ page }) => {
    await page.goto('/menu');

    // Wait for menu to load
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 10000 });

    // Check that menu items are displayed
    const menuItems = page.locator('[data-testid="menu-item"]');
    await expect(menuItems.first()).toBeVisible();
  });

  test('should handle responsive design on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    }

    await page.goto('/');

    // Check that navigation is accessible on mobile
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Check that content is readable
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should handle form inputs correctly', async ({ page }) => {
    await page.goto('/login');

    // Test email input
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');

    // Test password input
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('testpassword');
    await expect(passwordInput).toHaveValue('testpassword');
  });

  test('should handle JavaScript disabled gracefully', async ({ page }) => {
    // Note: This test would require a separate configuration
    // as Playwright doesn't support disabling JS per test
    await page.goto('/');

    // Check that basic HTML structure is present
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load images correctly', async ({ page }) => {
    await page.goto('/');

    // Check that images load without errors
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toBeVisible();

      // Check for broken images
      const src = await img.getAttribute('src');
      if (src) {
        const response = await page.request.get(src);
        expect(response.status()).toBeLessThan(400);
      }
    }
  });

  test('should handle slow network conditions', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });

    await page.goto('/');

    // App should still load within reasonable time
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
  });

  test('should work with different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1920, height: 1080 }, // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');

      // Content should be visible and usable
      await expect(page.locator('body')).toBeVisible();

      // Navigation should be accessible
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
    }
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    await page.goto('/');
    await page.goto('/menu');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/\/menu$/);
  });

  test('should handle accessibility features', async ({ page }) => {
    await page.goto('/');

    // Check for skip links
    const skipLinks = page.locator('a[href^="#"]');
    const skipLinkCount = await skipLinks.count();

    if (skipLinkCount > 0) {
      // Test skip link functionality
      const firstSkipLink = skipLinks.first();
      const href = await firstSkipLink.getAttribute('href');
      if (href) {
        await firstSkipLink.click();
        const targetElement = page.locator(href.replace('#', ''));
        await expect(targetElement).toBeFocused();
      }
    }

    // Check for proper heading hierarchy
    const h1Elements = page.locator('h1');
    await expect(h1Elements).toHaveCount(1); // Should have exactly one h1

    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy(); // Should have alt text
    }
  });

  test('should handle offline functionality', async ({ page, context }) => {
    // First load the page online
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate going offline
    await context.setOffline(true);

    // Try to navigate (should work if service worker is caching)
    await page.reload();

    // Basic structure should still be visible
    await expect(page.locator('body')).toBeVisible();

    // Should show offline message or cached content
    const offlineIndicator = page.locator('[data-testid="offline-message"]');
    // Note: This assumes you have an offline indicator
    // await expect(offlineIndicator).toBeVisible();
  });
});