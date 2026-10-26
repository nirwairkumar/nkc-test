// Second real run for clean crops: full-page shots every ~0.6 s plus the document rects of the
// progress card and the questions column, so prep.py can crop them wherever the page scrolled.
// TZ_EMAIL / TZ_PASSWORD from env. Output: run2/NNN.png + run2/log.json
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
const OUT = DIR + (process.env.RUN_DIR || 'run2/');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
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
await page.locator('input[type="file"]').first().setInputFiles(DIR + 'photo/IMG_2219.jpg');
await page.waitForTimeout(2500);
await page.screenshot({ path: OUT + 'selected.png' });
const extract = page.getByText('Extract Questions →').first();
await extract.waitFor({ timeout: 20000 });

// rects in document coordinates (CSS px)
const rects = () => page.evaluate(() => {
  const up = (el, ok) => { while (el && el !== document.body) { const r = el.getBoundingClientRect(); if (ok(r, el)) return el; el = el.parentElement; } return null; };
  const doc = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const h = [...document.querySelectorAll('h1,h2,h3')];
  const title = h.find((e) => /Extracting questions|Your questions are ready/.test(e.textContent));
  const card = up(title, (r) => r.width > 300 && r.width < 560 && r.height > 450);
  const qh = h.find((e) => e.textContent.trim().startsWith('Questions'));
  const col = up(qh, (r) => r.width > 600 && r.height > 300);
  return { card: doc(card), qhead: doc(qh && qh.parentElement), col: doc(col), scrollY, docH: document.documentElement.scrollHeight };
});

const t0 = Date.now();
await extract.click();
const log = [];
for (let i = 0; Date.now() - t0 < 240000; i++) {
  const s = +((Date.now() - t0) / 1000).toFixed(2);
  const r = await rects().catch(() => null);
  const name = String(i).padStart(3, '0');
  await page.screenshot({ path: OUT + name + '.png', fullPage: false });
  const body = await page.locator('body').innerText().catch(() => '');
  const clock = (body.match(/(\d+:\d\d)\s*\n?\s*Elapsed/) || [])[1] || '';
  const qs = (body.match(/(\d+)\s*\n?\s*Questions/) || [])[1] || '';
  log.push({ name, s, clock, qs, r });
  if (/Your questions are ready|Processing time|connection closed|Please try again/.test(body)) { log.push({ end: /connection closed/.test(body) ? 'error' : 'ready' }); break; }
  await page.waitForTimeout(250);
}
await page.waitForTimeout(2500);
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + 'ready.png' });
writeFileSync(OUT + 'log.json', JSON.stringify(log, null, 1));
console.log(log.map((l) => `${l.s}s ${l.clock} q${l.qs}`).join(' | '));
await browser.close();
