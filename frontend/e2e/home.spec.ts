import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the homepage correctly', async ({ page }) => {
    // Go to the home page
    await page.goto('/');

    // Check that we're on the home page (title or basic content)
    // Adjust this based on actual content on the home page
    await expect(page).toHaveTitle(/Test/i);
  });
});
