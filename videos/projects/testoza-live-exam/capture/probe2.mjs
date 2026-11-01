// Walk-through probe on the demo account: Conduct exam → Settings tabs → join code → share text →
// /join and the phone intro page → Stop exam. Screenshots + notes into probe/flow/.
// Changes data on the demo account only (test goes live, gets a join code, is stopped again).
import { chromium, devices } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = decodeURIComponent(new URL('./probe/flow/', import.meta.url).pathname.slice(1));
mkdirSync(OUT, { recursive: true });
const TITLE = process.env.TZ_TEST || 'JEE Main Mini Mock';
const notes = {};
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1536, height: 864 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
let n = 0;
const snap = async (name, p = page) => { await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}${String(++n).padStart(2, '0')}-${name}.png` }); };
const step = async (name, fn) => { try { await fn(); notes[name] = notes[name] || 'ok'; } catch (e) { notes[name] = 'FAIL ' + e.message.split('\n')[0]; await snap('fail-' + name); } };
const dumpButtons = (scope) => scope.evaluate((el) => [...el.querySelectorAll('button, [role=tab], [role=menuitem], a')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean));

await page.goto('https://app.testoza.com/my-tests', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const email = page.locator('input[type="email"]');
if (!(await email.isVisible().catch(() => false))) await page.getByRole('button', { name: /sign in|log in|login/i }).first().click().catch(() => {});
await email.waitFor({ timeout: 15000 });
await email.fill(process.env.TZ_EMAIL);
await page.locator('input[type="password"]').fill(process.env.TZ_PASSWORD);
await page.locator('form button[type="submit"]').last().click();
await page.waitForTimeout(5000);
// Mark the first-run tour done for this user (it is stored per browser, keyed by user id).
notes.userId = await page.evaluate(() => {
  const k = Object.keys(localStorage).find((x) => x.includes('auth-token'));
  const id = k && JSON.parse(localStorage.getItem(k))?.user?.id;
  if (id) for (const f of ['creator_dashboard_tour_completed', 'tour_link_copied', 'tour_save_completed']) localStorage.setItem(`${f}_${id}`, 'true');
  return id;
});
await page.goto('https://app.testoza.com/my-tests', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
// Leftover live exam from an earlier run: stop it first.
if (await page.getByRole('button', { name: /stop exam/i }).first().isVisible().catch(() => false)) {
  await page.getByRole('button', { name: /stop exam/i }).first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('alertdialog').or(page.getByRole('dialog')).last().getByRole('button', { name: /stop/i }).last().click();
  await page.waitForTimeout(2500);
}

await step('dismiss', async () => {
  // Tour popover ×, rewards banner ×, How-it-works "Got it".
  for (const name of [/close/i, /hide creator rewards/i, /^got it$/i]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(600); }
  }
  await snap('my-tests-clean');
});

const card = page.locator(`xpath=//*[self::h3 or self::h2][contains(., "${TITLE}")]/ancestor::*[.//button[contains(., "Conduct exam")]][1]`).first();
await step('card', async () => { await card.scrollIntoViewIfNeeded(); await snap('card'); });
await step('conduct', async () => {
  await card.getByRole('button', { name: /conduct exam/i }).click();
  await page.waitForTimeout(1200);
  const dlg = page.getByRole('dialog').last();
  notes.conductDialog = await dumpButtons(dlg);
  notes.conductDialogText = (await dlg.innerText()).slice(0, 1500);
  await snap('conduct-dialog');
  const go = dlg.getByRole('button', { name: /start|go live|conduct|confirm/i }).last();
  await go.click();
  await page.waitForTimeout(2500);
  await snap('live-card');
});
await step('settings', async () => {
  await page.getByRole('button', { name: /^settings$/i }).first().click();
  await page.waitForTimeout(1500);
  const dlg = page.locator('body');
  notes.settingsButtons = await dumpButtons(dlg);
  await snap('settings-open');
  for (const tab of [/proctoring/i, /access/i, /results/i]) {
    const t = dlg.getByRole('tab', { name: tab }).first();
    if (await t.isVisible().catch(() => false)) {
      await t.click();
      await page.waitForTimeout(800);
      await snap('settings-' + String(tab).replace(/\W/g, ''));
      const panel = page.locator('[role=tabpanel][data-state=active]').first();
      notes['tab ' + tab] = (await panel.innerText().catch(() => '')).slice(0, 2500);
      // Scroll the panel to see everything.
      await panel.evaluate((el) => { const s = el.closest('[class*=overflow-y]') || el.parentElement; s.scrollTop = 99999; }).catch(() => {});
      await snap('settings-' + String(tab).replace(/\W/g, '') + '-bottom');
    }
  }
  await page.getByRole('button', { name: /^cancel$/i }).last().click();
  await page.waitForTimeout(1200);
  await snap('after-settings');
});
await step('joincode', async () => {
  const live = page.locator('li', { has: page.getByRole('button', { name: /stop exam/i }) }).first();
  await live.getByRole('button', { name: /more options/i }).first().click();
  await page.waitForTimeout(800);
  notes.menu = await dumpButtons(page.locator('[role=menu]').last());
  await snap('menu');
  await page.getByRole('menuitem', { name: /join code/i }).click();
  await page.waitForTimeout(2500);
  await snap('join-code');
  notes.liveCardText = (await live.innerText()).slice(0, 1500);
});
await step('share', async () => {
  await page.evaluate(() => { navigator.share = undefined; });
  await page.getByRole('button', { name: /share link/i }).first().click();
  await page.waitForTimeout(1200);
  notes.shareText = await page.evaluate(() => navigator.clipboard.readText());
  await snap('after-share');
});
const code = (notes.liveCardText || '').match(/\b\d{6}\b/)?.[0] || (notes.liveCardText || '').match(/\b[A-Z0-9]{5,8}\b/)?.[0];
const link = (notes.shareText || '').match(/https?:\/\/\S+/)?.[0];
notes.code = code; notes.link = link;

const guest = await browser.newContext({ viewport: { width: 1536, height: 864 } });
const g = await guest.newPage();
await step('join', async () => {
  await g.goto('https://testoza.com/join', { waitUntil: 'networkidle' });
  await snap('join-page', g);
  notes.joinUrl = g.url();
  if (code) {
    await g.locator('input').first().fill(code);
    await snap('join-typed', g);
    await g.keyboard.press('Enter');
    await g.waitForTimeout(4000);
    notes.afterJoinUrl = g.url();
    await snap('after-join', g);
  }
});
const phone = await browser.newContext({ ...devices['iPhone 13'] });
const p = await phone.newPage();
await step('phone', async () => {
  if (!link) throw new Error('no link');
  await p.goto(link, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  await snap('phone-intro', p);
  notes.phoneIntro = (await p.locator('body').innerText()).slice(0, 1200);
});
await step('stop', async () => {
  await page.getByRole('button', { name: /stop exam/i }).first().click();
  await page.waitForTimeout(1000);
  const dlg = page.getByRole('alertdialog').or(page.getByRole('dialog')).last();
  notes.stopDialog = (await dlg.innerText()).slice(0, 600);
  await snap('stop-dialog');
  await dlg.getByRole('button', { name: /stop/i }).last().click();
  await page.waitForTimeout(2500);
  await snap('after-stop');
  await page.screenshot({ path: OUT + 'after-stop-full.png', fullPage: true });
});
writeFileSync(OUT + 'notes.json', JSON.stringify(notes, null, 2));
await browser.close();
console.log(JSON.stringify(notes, null, 2).slice(0, 6000));
