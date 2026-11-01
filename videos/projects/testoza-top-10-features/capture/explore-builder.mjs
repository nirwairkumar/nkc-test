// Exploration only (nothing saved): walks the builder and screenshots each control the takes will use.
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/explore-builder.mjs
import { launch, session, login, sleep, APP } from './rec-lib.mjs';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const browser = await launch();
const { page } = await session(browser, 'desktop');
await login(page);
let n = 0;
const shot = async (name) => {
  const png = `capture/probe/b${++n}-${name}.png`;
  await page.screenshot({ path: png });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=1152:-1', '-q:v', '5', png.replace('.png', '.jpg')]);
  console.log('shot', png);
};
const log = [];
const step = async (name, fn) => { try { await fn(); log.push('ok ' + name); } catch (e) { log.push('FAIL ' + name + ': ' + e.message.split('\n')[0]); } };
await page.goto(APP + '/create-test', { waitUntil: 'load', timeout: 60000 });
await page.getByPlaceholder(/e\.g\. Class 10 Science/).waitFor({ timeout: 60000 });
await sleep(1500);
await step('sections switch', async () => {
  const sw = page.getByRole('switch', { name: 'Split into sections' });
  await sw.scrollIntoViewIfNeeded();
  await sleep(500);
  await shot('sections-off');
  await sw.click(); await sleep(1200);
  await page.getByRole('switch', { name: 'Time each section' }).click(); await sleep(1200);
  await shot('sections-timed');
});
await step('question card', async () => {
  const q = page.getByText(/Question 1|Q1\b|#1/).first();
  await page.evaluate(() => window.scrollBy(0, 500)); await sleep(800);
  await shot('question-card');
});
await step('language', async () => {
  const grp = page.getByRole('group', { name: 'Typing language' });
  log.push('language groups: ' + await grp.count());
  const last = grp.last();
  await last.scrollIntoViewIfNeeded();
  await last.getByRole('button').nth(1).click(); await sleep(1200);
  await shot('language-menu');
  const items = await page.locator('[role=dialog] button, [data-radix-popper-content-wrapper] button').allInnerTexts();
  log.push('menu: ' + items.slice(0, 20).map((s) => s.replace(/\s+/g, ' ')).join(' | '));
  await page.keyboard.type('Hindi', { delay: 60 }); await sleep(800);
  await shot('language-search');
  await page.keyboard.press('Escape');
});
await step('sypad', async () => {
  const b = page.getByRole('button', { name: /Maths & symbols/ }).last();
  await b.scrollIntoViewIfNeeded(); await b.click(); await sleep(1500);
  await shot('sypad');
  const tabs = await page.getByRole('tab').allInnerTexts();
  log.push('tabs: ' + tabs.join(' | '));
  const keys = await page.locator('button[aria-label]').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => e.getAttribute('aria-label')).slice(0, 80));
  log.push('keys: ' + keys.join(' | '));
});
writeFileSync('capture/probe/explore-builder.log', log.join('\n'));
console.log(log.join('\n'));
await browser.close();
