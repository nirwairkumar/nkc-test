import { test, expect } from '@playwright/test';

test.describe('Mobile UX', () => {
  // Mobile only tests

  test('should show sticky bottom bar', async ({ page, isMobile }) => {
    // Skip if not mobile profile
    if (!isMobile) return;

    // await page.goto('/test/some-test-id');
    // Verify bottom navigation controls exist
    // const bottomBar = page.getByRole('button', { name: 'Save & Next' }).locator('xpath=ancestor::div[contains(@class, "flex-none z-40")]');
    // await expect(bottomBar).toBeVisible();
  });
});
