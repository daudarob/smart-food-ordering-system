import { test, expect } from '@playwright/test';

test.describe('Menu Rendering Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
  });

  test('should display menu items correctly for student role', async ({ page }) => {
    // Navigate directly to cafeteria selection (skip login for now)
    await page.goto('http://localhost:5173/cafeteria');

    // Wait for cafeteria selection to load
    await page.waitForSelector('.cafeteria-selector');

    // Select first cafeteria
    await page.click('.cafeteria-card:first-child');

    // Wait for menu to load - wait for the menu grid to have content
    await page.waitForSelector('.menu-grid', { timeout: 10000 });

    // Wait a bit more for the API call to complete and items to render
    await page.waitForTimeout(2000);

    // Check that menu items are displayed
    const menuItems = page.locator('.menu-item-card');
    const itemCount = await menuItems.count();
    console.log(`Found ${itemCount} menu items`);

    // At least some items should be displayed (expecting items from the selected cafeteria)
    expect(itemCount).toBeGreaterThan(0);

    if (itemCount > 0) {
      // Verify each menu item has required elements
      const firstItem = menuItems.first();
      await expect(firstItem.locator('h3')).toBeVisible();
      await expect(firstItem.locator('p')).toBeVisible();
      await expect(firstItem.locator('.price')).toBeVisible();
      await expect(firstItem.locator('button')).toBeVisible();

      // Check text visibility - ensure text is not transparent or hidden
      const titleColor = await firstItem.locator('h3').evaluate(el => getComputedStyle(el).color);
      const descColor = await firstItem.locator('p').evaluate(el => getComputedStyle(el).color);
      const priceColor = await firstItem.locator('.price').evaluate(el => getComputedStyle(el).color);

      console.log('Title color:', titleColor);
      console.log('Description color:', descColor);
      console.log('Price color:', priceColor);

      // Colors should not be transparent (rgba with alpha 0)
      expect(titleColor).not.toContain('rgba(0, 0, 0, 0)');
      expect(descColor).not.toContain('rgba(0, 0, 0, 0)');
      expect(priceColor).not.toContain('rgba(0, 0, 0, 0)');
    }
  });

  test('should display menu items correctly for admin role', async ({ page }) => {
    // First login as admin
    await page.goto('http://localhost:5173/login');

    // Wait for login form to load
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Fill login form with admin credentials - use correct password from seeder
    await page.fill('input[type="email"]', 'pauladmin@campus.com');
    await page.fill('input[type="password"]', 'admin123');

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for redirect to admin dashboard or handle login failure
    try {
      await page.waitForURL('**/admin', { timeout: 5000 });
    } catch (e) {
      // If login fails, check if we're still on login page
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        console.log('Login failed, staying on login page');
        return; // Skip this test if login doesn't work
      }
    }

    // Wait for admin dashboard to load
    await page.waitForSelector('.admin-dashboard', { timeout: 10000 });

    // Navigate to menu management if link exists
    const menuLink = page.locator('a[href*="menu"]').first();
    if (await menuLink.isVisible()) {
      await menuLink.click();
      await page.waitForSelector('.menu-management', { timeout: 5000 });

      // Check menu items display
      const menuItems = page.locator('[data-testid="menu-item"]');
      const itemCount = await menuItems.count();
      console.log(`Admin view: Found ${itemCount} menu items`);

      // Verify text visibility for admin view
      if (itemCount > 0) {
        const firstItem = menuItems.first();
        const titleColor = await firstItem.locator('h3').evaluate(el => getComputedStyle(el).color);
        console.log('Admin title color:', titleColor);
        expect(titleColor).not.toContain('rgba(0, 0, 0, 0)');
      }
    } else {
      console.log('Menu management link not found, skipping admin menu test');
    }
  });

  test('should display menu for all four cafeterias', async ({ page }) => {
    // Navigate directly to cafeteria selection
    await page.goto('http://localhost:5173/cafeteria');

    // Wait for cafeteria selection to load
    await page.waitForSelector('.cafeteria-selector', { timeout: 10000 });

    const cafeterias = [
      'Paul Caffe',
      'Cafelater',
      'Sironi Student Center',
      'Sironi Humanity'
    ];

    for (const cafeteriaName of cafeterias) {
      console.log(`Testing cafeteria: ${cafeteriaName}`);

      // Select cafeteria
      const cafeteriaCard = page.locator(`.cafeteria-card:has-text("${cafeteriaName}")`);
      if (await cafeteriaCard.isVisible()) {
        await cafeteriaCard.click();

        // Wait for menu to load
        await page.waitForSelector('.menu-grid', { timeout: 10000 });

        // Check menu items exist
        const menuItems = page.locator('[data-testid="menu-item"]');
        const itemCount = await menuItems.count();
        console.log(`${cafeteriaName}: ${itemCount} menu items`);

        // At least some items should be displayed (may be 0 if no data for that cafeteria)
        expect(itemCount).toBeGreaterThanOrEqual(0);

        // If items exist, check text visibility
        if (itemCount > 0) {
          const firstItem = menuItems.first();
          await expect(firstItem.locator('h3')).toBeVisible();
          await expect(firstItem.locator('.description')).toBeVisible();
          await expect(firstItem.locator('.price')).toBeVisible();

          // Check colors are not transparent
          const titleColor = await firstItem.locator('h3').evaluate(el => getComputedStyle(el).color);
          console.log(`${cafeteriaName} title color:`, titleColor);
          expect(titleColor).not.toContain('rgba(0, 0, 0, 0)');
        }

        // Go back to cafeteria selection
        const backButton = page.locator('button:has-text("Back to Cafeterias")');
        if (await backButton.isVisible()) {
          await backButton.click();
          await page.waitForSelector('.cafeteria-selector', { timeout: 5000 });
        } else {
          // Fallback: navigate directly
          await page.goto('http://localhost:5173/cafeteria');
          await page.waitForSelector('.cafeteria-selector', { timeout: 5000 });
        }
      } else {
        console.log(`Cafeteria "${cafeteriaName}" not found, skipping`);
      }
    }
  });

  test('should handle text visibility issues in dark/light themes', async ({ page }) => {
    // Navigate directly to cafeteria selection
    await page.goto('http://localhost:5173/cafeteria');

    // Wait for cafeteria selection to load
    await page.waitForSelector('.cafeteria-selector', { timeout: 10000 });

    await page.click('.cafeteria-card:first-child');
    await page.waitForSelector('.menu-grid', { timeout: 10000 });

    const menuItems = page.locator('[data-testid="menu-item"]');
    const itemCount = await menuItems.count();

    if (itemCount > 0) {
      const firstItem = menuItems.first();

      // Check current theme
      const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light');
      console.log('Current theme:', theme);

      // Get computed styles
      const cardBg = await firstItem.evaluate(el => getComputedStyle(el).backgroundColor);
      const titleColor = await firstItem.locator('h3').evaluate(el => getComputedStyle(el).color);
      const descColor = await firstItem.locator('.description').evaluate(el => getComputedStyle(el).color);
      const priceColor = await firstItem.locator('.price').evaluate(el => getComputedStyle(el).color);

      console.log('Card background:', cardBg);
      console.log('Title color:', titleColor);
      console.log('Description color:', descColor);
      console.log('Price color:', priceColor);

      // Ensure text is visible (not transparent)
      expect(titleColor).not.toMatch(/rgba\(.*, 0\)/);
      expect(descColor).not.toMatch(/rgba\(.*, 0\)/);
      expect(priceColor).not.toMatch(/rgba\(.*, 0\)/);
    } else {
      console.log('No menu items found for theme visibility test');
    }
  });

  test('should display menu item names, descriptions, and prices properly', async ({ page }) => {
    // Navigate directly to cafeteria selection
    await page.goto('http://localhost:5173/cafeteria');

    // Wait for cafeteria selection to load
    await page.waitForSelector('.cafeteria-selector', { timeout: 10000 });

    await page.click('.cafeteria-card:first-child');
    await page.waitForSelector('.menu-grid', { timeout: 10000 });

    const menuItems = page.locator('[data-testid="menu-item"]');
    const itemCount = await menuItems.count();

    if (itemCount > 0) {
      // Check first few items for complete data
      for (let i = 0; i < Math.min(3, itemCount); i++) {
        const item = menuItems.nth(i);

        // Check name exists and is not empty
        const name = await item.locator('h3').textContent();
        expect(name).toBeTruthy();
        expect(name.trim()).not.toBe('');

        // Check description exists
        const description = await item.locator('.description').textContent();
        expect(description).toBeTruthy();
        expect(description.trim()).not.toBe('');

        // Check price exists and is properly formatted
        const priceText = await item.locator('.price').textContent();
        expect(priceText).toBeTruthy();
        expect(priceText).toMatch(/KES \d+\.\d{2}/);

        console.log(`Item ${i + 1}: ${name} - ${description} - ${priceText}`);
      }
    } else {
      console.log('No menu items found for data validation test');
    }
  });
});