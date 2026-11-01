// One-off: switch on "Become a Creator" for the demo student so My Tests lists the saved test.
import { chromium, devices } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const OUT = process.env.TZ_OUT;
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, storageState: process.env.TZ_STATE });
const page = await ctx.newPage();
await page.goto('https://app.testoza.com/profile', { waitUntil: 'load' });
await page.getByText('Become a Creator').waitFor({ timeout: 20000 });
await page.getByRole('button', { name: 'Enable', exact: true }).first().tap();
await page.getByRole('button', { name: 'Confirm & Enable' }).tap();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/creator-1.png` });
await page.goto('https://app.testoza.com/my-tests', { waitUntil: 'load' });
await page.waitForTimeout(5000);
await page.screenshot({ path: `${OUT}/mytests-1.png`, fullPage: true });
writeFileSync(`${OUT}/mytests-1.txt`, await page.locator('body').innerText());
await browser.close();
