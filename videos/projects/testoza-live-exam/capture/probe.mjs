// Look-only probe of the live app as the demo teacher: screenshots of the pages the tutorial
// walks through, plus the test cards on /my-tests. Clicks nothing that changes data.
// Credentials via TZ_EMAIL / TZ_PASSWORD env, never in files.
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = decodeURIComponent(new URL('./probe/', import.meta.url).pathname.slice(1));
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 });
const page = await context.newPage();

await page.goto('https://app.testoza.com/my-tests', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const email = page.locator('input[type="email"]');
if (!(await email.isVisible().catch(() => false))) await page.getByRole('button', { name: /sign in|log in|login/i }).first().click().catch(() => {});
await email.waitFor({ timeout: 15000 });
await email.fill(process.env.TZ_EMAIL);
await page.locator('input[type="password"]').fill(process.env.TZ_PASSWORD);
await page.locator('form button[type="submit"]').last().click();
await page.waitForTimeout(5000);

for (const [name, url] of [['my-tests', '/my-tests'], ['dashboard', '/dashboard']]) {
  await page.goto('https://app.testoza.com' + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: OUT + name + '.png' });
  await page.screenshot({ path: OUT + name + '-full.png', fullPage: true });
}
await page.goto('https://app.testoza.com/my-tests', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const cards = await page.evaluate(() => [...document.querySelectorAll('h3, h2')].map((h) => h.textContent.trim()).filter(Boolean).slice(0, 60));
const buttons = await page.evaluate(() => [...document.querySelectorAll('button, a')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 200));
writeFileSync(OUT + 'my-tests.json', JSON.stringify({ cards, buttons }, null, 2));

const pub = await context.newPage();
await pub.goto('https://testoza.com/', { waitUntil: 'networkidle' });
await pub.waitForTimeout(2500);
await pub.screenshot({ path: OUT + 'landing.png' });
await pub.goto('https://app.testoza.com/join', { waitUntil: 'networkidle' });
await pub.waitForTimeout(2000);
await pub.screenshot({ path: OUT + 'join.png' });
await browser.close();
console.log('ok');
