// Exploration helper for the real phone run. STATE = saved login (scratchpad, never in the repo).
// node capture/explore.mjs login            → signs in with TZ_EMAIL / TZ_PASSWORD, saves STATE
// node capture/explore.mjs shot <path> [n]  → opens app.testoza.com<path>, saves explore-n.png + visible text
import { chromium, devices } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';
const STATE = process.env.TZ_STATE;
const OUT = process.env.TZ_OUT;
const [cmd, path = '/', n = '0'] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, ...(cmd === 'login' ? {} : { storageState: STATE }) });
const page = await ctx.newPage();
if (cmd === 'login') {
  await page.goto('https://app.testoza.com/login', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Email Address').fill(process.env.TZ_EMAIL);
  await dlg.getByLabel('Password').fill(process.env.TZ_PASSWORD);
  await dlg.getByRole('button', { name: 'Sign In', exact: true }).last().click();
  await page.waitForTimeout(5000);
  await ctx.storageState({ path: STATE });
  console.log('url after login', page.url());
} else {
  await page.goto('https://app.testoza.com' + path, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
}
await page.screenshot({ path: `${OUT}/explore-${n}.png`, fullPage: true });
writeFileSync(`${OUT}/explore-${n}.txt`, await page.locator('body').innerText());
await browser.close();
