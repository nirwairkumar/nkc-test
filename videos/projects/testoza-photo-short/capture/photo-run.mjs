// 1) Renders photo-page.html as a phone photo (photo/IMG_2219.jpg).
// 2) --run: signs in as the demo teacher (TZ_EMAIL / TZ_PASSWORD from env), uploads the photo on
//    app.testoza.com/generate-with-ai, clicks Extract, and times the real AI read, screenshotting
//    every ~1.5 s into shots/. Nothing is saved or published.
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
const PHOTO = DIR + 'photo/IMG_2219.jpg';
mkdirSync(DIR + 'photo', { recursive: true });
mkdirSync(DIR + 'shots', { recursive: true });

const browser = await chromium.launch();
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  await page.goto('file:///' + DIR + 'photo-page.html');
  await page.screenshot({ path: PHOTO, type: 'jpeg', quality: 86 });
  await page.close();
  console.log('photo →', PHOTO);
}

if (process.argv.includes('--run')) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto('https://app.testoza.com/create-test', { waitUntil: 'networkidle' });
  const email = page.locator('input[type="email"]');
  await page.waitForTimeout(2000);
  if (!(await email.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /sign in|log in|login/i }).first().click().catch(() => {});
  }
  await email.waitFor({ timeout: 15000 });
  await email.fill(process.env.TZ_EMAIL);
  await page.locator('input[type="password"]').fill(process.env.TZ_PASSWORD);
  await page.locator('form button[type="submit"]').last().click();
  await page.waitForTimeout(4000);

  await page.goto('https://app.testoza.com/generate-with-ai', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: DIR + 'shots/00-upload.png' });
  await page.locator('input[type="file"]').first().setInputFiles(PHOTO);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: DIR + 'shots/01-selected.png' });

  const extract = page.getByText('Extract Questions →').first();
  await extract.waitFor({ timeout: 20000 });
  await extract.scrollIntoViewIfNeeded();
  await page.screenshot({ path: DIR + 'shots/02-modes.png' });
  const t0 = Date.now();
  await extract.click();

  const log = [];
  let done = null;
  for (let i = 0; Date.now() - t0 < 300000; i++) {
    const ms = Date.now() - t0;
    await page.screenshot({ path: DIR + `shots/run-${String(i).padStart(3, '0')}-${(ms / 1000).toFixed(1)}s.png` });
    const body = await page.locator('body').innerText().catch(() => '');
    const appClock = (body.match(/(\d+:\d\d)\s*\n?\s*Elapsed/) || [])[1] || '';
    const qs = (body.match(/(\d+)\s*\n?\s*Questions/) || [])[1] || '';
    log.push({ i, s: +(ms / 1000).toFixed(1), appClock, qs });
    if (/Your questions are ready/.test(body)) { done = { s: +(ms / 1000).toFixed(1), appClock, qs }; break; }
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: DIR + 'shots/90-ready.png' });
  await page.screenshot({ path: DIR + 'shots/91-ready-full.png', fullPage: true });
  writeFileSync(DIR + 'shots/run-log.json', JSON.stringify({ done, log }, null, 1));
  console.log('DONE', JSON.stringify(done));
  await context.close();
}
await browser.close();
