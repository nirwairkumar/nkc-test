// Shared helpers for driving the real app.testoza.com builder as the demo teacher.
// Credentials come from env (TZ_EMAIL / TZ_PASSWORD), never from files.
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';

export const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
export const SHOTS = DIR + 'shots/';
export const CROPS = DIR + 'crops/';

/** A visible cursor with a click ripple (headless recordings have none). Follows real mouse events. */
const CURSOR = `
addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('div');
  c.id = '__tz_cursor';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L16 20l-3 1.3-3.4-7.6L4 18z" fill="#0f172a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: 'fixed', left: '-40px', top: '-40px', zIndex: 2147483647, pointerEvents: 'none', transition: 'left .12s ease-out, top .12s ease-out', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.35))' });
  document.documentElement.appendChild(c);
  addEventListener('mousemove', (e) => { c.style.left = e.clientX - 3 + 'px'; c.style.top = e.clientY - 2 + 'px'; }, true);
  addEventListener('mousedown', (e) => {
    const r = document.createElement('div');
    Object.assign(r.style, { position: 'fixed', left: e.clientX - 18 + 'px', top: e.clientY - 18 + 'px', width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #38bdf8', zIndex: 2147483646, pointerEvents: 'none', transition: 'transform .45s ease-out, opacity .45s ease-out', opacity: '1' });
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 600);
  }, true);
});`;

export async function open({ recordVideo, viewport = { width: 1920, height: 1080 }, scale = 1, cursor = false } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    permissions: ['clipboard-read', 'clipboard-write'],
    ...(recordVideo ? { recordVideo: { dir: recordVideo, size: { width: 1920, height: 1080 } } } : {}),
  });
  if (cursor) await context.addInitScript(CURSOR);
  const page = await context.newPage();
  page.__t0 = Date.now();
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
  await page.goto('https://app.testoza.com/create-test', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  return { browser, context, page };
}

/** Recording marks: seconds since the page (and its video) started. */
let markFn = () => {};
export const setMark = (fn) => { markFn = fn; };
export const mark = (name) => markFn(name);

export const shot = (page, name) => page.screenshot({ path: SHOTS + name + '.png' });

/** Bring an element to a comfortable reading position (about a third from the top). */
export async function frameOn(page, locator, ratio = 0.33) {
  await locator.evaluate((el, r) => {
    // Never under the sticky top bar (64 px): keep at least 100 px above the element.
    const top = el.getBoundingClientRect().top + window.scrollY - Math.max(window.innerHeight * r, 100);
    window.scrollTo({ top, behavior: 'instant' });
  }, ratio);
  await page.waitForTimeout(400);
}

/** Human-paced typing so viewers can follow. */
export const type = (page, text, delay = 35) => page.keyboard.type(text, { delay });

/** Put a PNG from crops/ on the real clipboard, like Win+Shift+S does. */
export async function clipImage(page, file) {
  const b64 = readFileSync(CROPS + file).toString('base64');
  await page.evaluate(async (data) => {
    const bin = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([bin], { type: 'image/png' }) })]);
  }, b64);
}

/** The n-th question card (0-based). Filled boxes show a rendered preview when blurred, so cards
 *  are found by their always-present "Mark option A as correct" button, not by a textarea. */
// Each question is an <article>; in section mode the "Question N" labels restart per section,
// so cards are counted in page order across all sections.
export const card = (page, n) => page.locator('article:has(.group\\/ime-container)').nth(n);

/** Box idx in card n (0 = question, 1–4 = options A–D): click it (preview or textarea) into edit mode. */
export async function editBox(page, n, idx = 0) {
  const box = card(page, n).locator('.group\\/ime-container').nth(idx);
  await box.click();
  await page.waitForTimeout(250);
  const ta = box.locator('textarea, input').first();
  await ta.focus();
  return ta;
}

/** Kept for empty boxes that are still textareas. */
export const qText = (page, n) => card(page, n).locator('.group\\/ime-container').first();

/** Sy Pad: type LaTeX into the code box, then Insert into the last focused box. */
export async function syPadInsert(page, latex, { delay = 25, keepOpen = false } = {}) {
  const code = page.getByLabel('Formula code');
  await code.click();
  await code.press('Control+A');
  await code.press('Backspace');
  await code.type(latex, { delay });
  await page.waitForTimeout(500);
  if (keepOpen) return;
  await page.getByRole('button', { name: /^Insert$/ }).click();
  await page.waitForTimeout(400);
}
