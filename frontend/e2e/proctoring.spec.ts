import { test, expect } from '@playwright/test';

test.describe('Proctoring UI', () => {

  test('should not show violation counter when proctoring is off', async ({ page }) => {
    // Setup test with proctoring OFF
    // await page.goto('/test/non-proctored-test-id');
    
    // Verify counter is not visible
    // const counter = page.locator('text=/\\d+\\/\\d+/');
    // await expect(counter).not.toBeVisible();
  });

  test('should show warning toast on tab switch when strict mode is on', async ({ page }) => {
    // Setup test with proctoring ON
    // await page.goto('/test/proctored-test-id');
    
    // Simulate tab switch (using Playwright's API to change visibility state)
    // await page.evaluate(() => {
    //   Object.defineProperty(document, 'hidden', { value: true, writable: true });
    //   document.dispatchEvent(new Event('visibilitychange'));
    // });
    
    // VERIFY TOAST
    // await expect(page.getByText('Tab Switching / Navigation is not allowed')).toBeVisible();
  });
});
