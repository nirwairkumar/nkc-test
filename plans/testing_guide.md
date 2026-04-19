# Testoza.com - Intern's Guide to E2E Testing

Welcome to the team! This guide explains how we ensure the quality of the Testoza platform using **Playwright**, our industry-standard End-to-End (E2E) testing framework.

## 1. Overview
E2E testing simulates real user behavior across different devices (Phone, Tablet, PC) and browsers (Chrome, Firefox, Safari). We use it to verify that students can take tests without issues, the virtual keypad works, and proctoring is reliable.

## 2. File Structure

All testing files are located in the `frontend/` directory:

- **`frontend/playwright.config.ts`**: The brain of the testing system. It defines:
    - Supported devices (iPhone, iPad, Pixel, Desktop, etc.)
    - Base URLs and timeouts.
    - Screenshot and trace collection settings.
- **`frontend/e2e/`**: This folder contains our test scripts (spec files):
    - `home.spec.ts`: Verifies the landing page and basic navigation.
    - `test-flow.spec.ts`: Covers the core student journey (MCQ, Numerical, Passages).
    - `proctoring.spec.ts`: Validates security features like tab-switching detection and violation counters.
    - `mobile-ux.spec.ts`: Specifically checks mobile-only features like the sticky bottom bar and keypad rendering.

## 3. Getting Started (Setup)

Before running tests for the first time, an intern must:

1.  **Install Library**:
    ```bash
    cd frontend
    npm install
    ```
2.  **Install Browser Binaries**: (This downloads the specific versions of Chrome/Firefox/Safari needed)
    ```bash
    npx playwright install
    ```

## 4. How to Run Tests

From the `frontend/` directory, use the following commands:

### A. Local Development Testing
Make sure your local Vite server is running (usually on `http://localhost:5173` or `8081`).

```bash
# Run all tests in the background (Headless)
npm run test:e2e

# RECOMMENDED: Run with the UI (Interactive)
# This lets you see the browser actions and debug step-by-step
npm run test:e2e:ui
```

### B. Overriding Port/URL
If your local server is on a different port (e.g., 5173), use this:
```bash
PLAYWRIGHT_TEST_BASE_URL=http://localhost:5173 npm run test:e2e:ui
```

### C. Mobile-Only Testing
To save time and only verify responsiveness:
```bash
npm run test:e2e:mobile
```

### D. Production Smoke Test
To verify the live website is working perfectly:
```bash
npm run test:e2e:prod
```

## 5. What to look for
- **Green Checks**: Everything is perfect.
- **Red Fails**: Look at the **Trace Viewer** or the **Screenshot** automatically saved in `frontend/test-results/`.
- **Timeouts**: Usually means the server is slow or the element selector has changed.

## 6. Best Practices
- **Atomic Tests**: Keep tests focused (e.g., verify one feature at a time).
- **No Hardcoded Wait**: Use Playwright's auto-waiting (e.g., `await expect(locator).toBeVisible()`) instead of `setTimeout`.
- **Test ID's**: If a test keeps failing because of layout changes, add `data-testid="xyz"` to the HTML for stable targeting.

---
*Happy Testing! If you have questions, refer to the [Playwright Docs](https://playwright.dev/).*
