// Recording takes for the three reels (CBT setup, proctoring, scheduling). Mark ids = the {cue}
// names in SCRIPT-<reel>.md; ids that start with "x-" are in-between actions. Real app.testoza.com as
// the demo educator, on "JEE 2026 Chemistry — Practice Test" (DPP 07 stays untouched: its join code
// is in the Top-10 video).
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/record.mjs teacher|cbt|sched|early|late
//   teacher — Conduct → live → Settings: proctoring switches, AI tab (off), NTA layout → Save → join code
//   cbt     — a candidate on a computer: /join → code → NTA screen: answer, mark, skip, palette, submit
//             summary (cancel) → leaves the tab ×2 + exits full screen → auto-submitted
//   sched   — Settings → Access & Control → Scheduled Access: start in ~2.5 min, end ~2.5 min later → Save
//   early   — phone, before the start: details → Start → waiting room countdown → the exam opens itself
//   late    — phone, after the end: the link says the exam is over
import { launch, session, login, Recorder, act, appear, sleep, state, APP } from './rec-lib.mjs';

const take = process.argv[2];
const browser = await launch();
let page, rec = null;
const fail = async (e) => { await page.screenshot({ path: `capture/rec/FAIL-${take}.png` }).catch(() => {}); console.error('FAIL', e.message.split('\n').slice(0, 3).join(' | ')); };
const shot = async (name) => page.screenshot({ path: `capture/probe/${take}-${name}.png` }).catch(() => {});

const X = {
  async click(id, loc, o = {}) { return act(page, rec, id, loc, o); },
  async hover(id, loc, o = {}) { return act(page, rec, id, loc, { settle: 900, ...o, hover: true }); },
  async see(id, loc, o = {}) { return appear(page, rec, id, loc, o); },
  async typed(id, text, delay, { slow = false, boxOf, tag = {} } = {}) {
    const b = boxOf ? await boxOf.boundingBox() : undefined;
    const m = rec.mark(id, { pre: 0, box: b, slow, ...tag });
    await m.flagged;
    await page.keyboard.type(text, { delay });
    await sleep(350);
    m.end = +rec.now().toFixed(3);
  },
  async show(id, loc, ratio = 0.15) {
    const t1 = rec.now();
    await loc.evaluate((el, r) => {
      const top = el.getBoundingClientRect().top + window.scrollY - Math.max(window.innerHeight * r, 80);
      window.scrollTo({ top, behavior: 'smooth' });
    }, ratio);
    await sleep(1100);
    if (id) { const m = rec.mark(id, { pre: +(rec.now() - t1).toFixed(3), box: await loc.boundingBox() }); await m.flagged; await sleep(500); m.end = +rec.now().toFixed(3); }
  },
};
const visibleButtons = async () => (await page.getByRole('button').filter({ visible: true }).allInnerTexts()).map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' | ');

/* ── My Tests helpers (from testoza-top-10-features) ──────────────────────── */
async function openMyTests() {
  await page.goto(APP + '/my-tests', { waitUntil: 'load', timeout: 60000 });
  await page.getByRole('heading', { name: 'All tests' }).waitFor({ timeout: 60000 });
  const anyCard = page.getByRole('button', { name: /Conduct exam/ }).filter({ visible: true }).first();
  for (let i = 0; i < 30 && !(await anyCard.isVisible().catch(() => false)); i++) {
    await page.getByRole('heading', { name: 'All tests' }).scrollIntoViewIfNeeded().catch(() => {});
    await sleep(2000);
  }
  await sleep(1500);
  for (const name of [/hide creator rewards/i, /^got it$/i]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.isVisible().catch(() => false)) { await b.click(); await sleep(600); }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
}
/** The My Tests card of `title`, re-found on every use (the list re-renders, so a tag would be lost). */
const cardOf = (title) => page.getByRole('heading', { name: new RegExp(title) }).filter({ visible: true }).first().locator('xpath=ancestor::*[.//button[contains(., "Conduct exam")]][1]');
const sw = (label) => page.locator(`xpath=//label[contains(normalize-space(.), "${label}")]/ancestor::div[.//button[@role="switch"]][1]//button[@role="switch"] >> visible=true`).first();
const lab = (text) => page.locator(`xpath=//label[contains(normalize-space(.), "${text}")] >> visible=true`).first();
const liveCard = (title) => page.locator('li', { has: page.getByRole('button', { name: /stop exam/i }) }).filter({ hasText: title }).first();
async function stopOurs(title) {
  for (let i = 0; i < 3 && await liveCard(title).isVisible().catch(() => false); i++) {
    await liveCard(title).getByRole('button', { name: /stop exam/i }).filter({ visible: true }).first().click();
    await sleep(1000);
    await page.getByRole('alertdialog').or(page.getByRole('dialog')).last().getByRole('button', { name: /stop exam/i }).last().click();
    await sleep(2500);
  }
}
/** The live card's settings dialog, opened off camera when `id` is null. */
async function openSettings(title, id) {
  const live = liveCard(title);
  await live.scrollIntoViewIfNeeded();
  if (id) await X.click(id, live.getByRole('button', { name: /^settings$/i }), { settle: 1500 });
  else { await live.getByRole('button', { name: /^settings$/i }).click(); await sleep(1500); }
}

/* ── teacher: go live + proctoring + NTA layout ──────────────────────────── */
async function teacher() {
  ({ page } = await session(browser, 'desktop'));
  const { title } = state.read();
  await login(page);
  await openMyTests();
  await stopOurs(title);
  await openMyTests();
  const c = cardOf(title);
  await c.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await sleep(800);
  await page.mouse.move(1150, 260); page.__pos = { x: 1150, y: 260 };
  rec = new Recorder(page, 'teacher');
  await rec.start();
  try {
    await sleep(1000);
    await X.click('conduct', c.getByRole('button', { name: /conduct exam/i }).filter({ visible: true }).first(), { settle: 1400 });
    const dlg = page.getByRole('dialog').filter({ hasText: 'Conduct Online Exam' });
    await X.click('start', dlg.getByRole('button', { name: /start conducting/i }), { settle: 200 });
    await X.see('live', page.getByText('Exam is now live.'), { settle: 1400 });
    const live = liveCard(title);
    await X.click('settings', live.getByRole('button', { name: /^settings$/i }), { settle: 1500 });
    await shot('settings');
    // Proctoring & Security
    await X.click('fs', sw('Force Full Screen'), { settle: 1100 });
    await X.click('tab', sw('Tab/App Switch Detection'), { settle: 1100 });
    await X.hover('strict', lab('Strict (Instant Submit)'), { settle: 1000 });
    await X.click('count', page.locator('input[type=radio][name^="violation_limit"] >> visible=true').nth(2), { settle: 900 });
    await X.click('three', page.getByRole('combobox').filter({ visible: true }).first(), { settle: 700 });
    await X.click('threepick', page.getByRole('option', { name: '3', exact: true }), { settle: 1000, ms: 450 });
    await X.click('copy', sw('Disable Copy/Paste'), { settle: 1000 });
    await X.click('right', sw('Disable Right Click'), { settle: 1000 });
    await X.click('back', sw('Block Back Button'), { settle: 1000 });
    await X.click('exit', sw('Disable Exit Button'), { settle: 1100 });
    await X.hover('aitab', page.getByRole('tab', { name: /AI Utilities/i }), { settle: 1500 });
    // Results & Timing → the NTA-style screen
    await X.click('results', page.getByRole('tab', { name: /results/i }), { settle: 1200 });
    const std = page.getByText('Standard Mode').filter({ visible: true }).first();
    await X.show('x-layout', std, 0.35);
    await X.click('std', std, { settle: 1400 });
    await shot('layout');
    await X.click('strictt', sw('Strict Timer'), { settle: 1200 });
    await X.click('save', page.getByRole('button', { name: /save settings/i }).last(), { settle: 2000 });
    // Join code for the candidate take (off the story).
    await live.scrollIntoViewIfNeeded();
    await page.evaluate(() => { navigator.share = undefined; });
    await X.click('x-menu', live.getByRole('button', { name: /more options/i }).first(), { settle: 900 });
    await X.click('x-getcode', page.getByRole('menuitem', { name: /join code/i }), { settle: 300 });
    const codeEl = live.getByText(/^\d{3} \d{3}$/).first();
    await codeEl.waitFor();
    await sleep(1200);
    await live.getByRole('button', { name: /copy link/i }).click();
    await sleep(600);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    state.write({ code: (await codeEl.innerText()).trim(), link: (link.match(/https?:\/\/\S+/) || [link])[0], liveAt: new Date().toISOString() });
    console.log('state', JSON.stringify(state.read()));
  } catch (e) { await fail(e); }
  await rec.stop();
}

/* ── cbt: a candidate on a computer (NTA screen, then the proctoring) ────── */
async function cbt() {
  ({ page } = await session(browser, 'desktop'));
  const { code } = state.read();
  await page.goto('https://testoza.com/join', { waitUntil: 'load', timeout: 60000 });
  await page.locator('input').first().waitFor({ timeout: 60000 });
  await sleep(1500);
  await page.mouse.move(1000, 700); page.__pos = { x: 1000, y: 700 };
  rec = new Recorder(page, 'cbt');
  await rec.start();
  try {
    await sleep(1000);
    await X.click('typecode', page.locator('input').first(), { settle: 300 });
    await X.typed('code6', code.replace(/\D/g, ''), 200);
    await X.see('details', page.getByText('Candidate Details'), { settle: 900, timeout: 45000 });
    const inputs = page.locator('input[type=text], input:not([type])').filter({ visible: true });
    await X.click('name', inputs.nth(0), { settle: 200 });
    await X.typed('x-name', 'Ishaan Kapoor', 60);
    const tick = page.getByRole('checkbox').first();
    if (await tick.isVisible().catch(() => false) && !(await tick.isChecked().catch(() => true))) await X.click('x-tick', tick, { settle: 500 });
    await X.click('go', page.getByRole('button', { name: /start test/i }), { settle: 300 });
    await X.see('exam', page.getByText(/QUESTION 1/i).first(), { settle: 1500, timeout: 60000 });
    await shot('exam');
    console.log('exam buttons:', await visibleButtons());
    const opt = (L) => page.locator('div.cursor-pointer.rounded-lg.border').filter({ has: page.locator('div.h-7.w-7', { hasText: new RegExp(`^${L}$`) }) }).filter({ visible: true }).first();
    const btn = (re) => page.getByRole('button', { name: re }).filter({ visible: true }).first();
    await X.hover('timer', page.getByText(/^\d{1,2}:\d{2}(:\d{2})?$/).filter({ visible: true }).first(), { settle: 1200 });
    await X.hover('palette', page.getByText(/Question Palette|Choose a Question/i).filter({ visible: true }).first(), { settle: 1200 });
    // The palette's five states, the NTA way: answered, answered + review, review, not answered.
    await X.click('ans1', opt('D'), { settle: 700, fx: 0.15 });
    await X.click('next1', btn(/^save & next/i), { settle: 1100 });
    await X.click('ans2', opt('B'), { settle: 600, fx: 0.15 });
    await X.click('ansrev', btn(/^ans & review/i), { settle: 1200 });
    await X.click('rev3', btn(/^review$/i), { settle: 1200 });
    await X.click('skip4', btn(/^save & next/i), { settle: 1200 });
    await X.hover('legend', page.getByText(/^Ans & Review$/i).filter({ visible: true }).first(), { settle: 1600 });
    await shot('palette');
    await X.click('jump', page.getByRole('button', { name: /^2$/ }).filter({ visible: true }).last(), { settle: 1300 });
    await X.click('submitbtn', btn(/submit test/i), { settle: 1500 });
    await X.see('summary', page.getByText(/Submit Test\?/i).first(), { settle: 1800 });
    await shot('summary');
    await X.click('cancel', page.getByRole('button', { name: /^cancel$/i }).filter({ visible: true }).last(), { settle: 1200 });

    // Proctoring: leaves the tab, exits full screen, leaves again → submitted automatically.
    const vis = (hidden) => page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    const okWarn = async (id) => {
      const d = page.getByRole('dialog').or(page.getByRole('alertdialog')).filter({ hasText: /Warning/ }).last();
      await X.click(id, d.getByRole('button').filter({ visible: true }).last(), { settle: 1100 });
    };
    if (rec) { const m = rec.mark('leave1', { pre: 0 }); await m.flagged; }
    await vis(true); await sleep(600); await vis(false);
    await X.see('warn1', page.getByText(/Warning 1\/3/).filter({ visible: true }).first(), { settle: 1800 });
    await okWarn('ok1');
    if (rec) { const m = rec.mark('fsexit', { pre: 0 }); await m.flagged; }
    await page.evaluate(() => document.exitFullscreen && document.exitFullscreen());
    await X.see('warn2', page.getByText(/Warning 2\/3/).filter({ visible: true }).first(), { settle: 1600, timeout: 10000 }).catch(async () => { console.log('no warning 2 after full-screen exit:', await visibleButtons()); });
    await shot('warn2');
    const d2 = page.getByRole('dialog').or(page.getByRole('alertdialog')).filter({ visible: true }).last();
    if (await d2.isVisible().catch(() => false)) await X.click('ok2', d2.getByRole('button').filter({ visible: true }).last(), { settle: 1100 });
    if (rec) { const m = rec.mark('leave3', { pre: 0 }); await m.flagged; }
    await vis(true); await sleep(600); await vis(false);
    await X.see('warn3', page.getByText('Warning 3/3', { exact: false }).filter({ visible: true }).first(), { settle: 1600 });
    await okWarn('ok3');
    // Three warnings used up: the next switch submits the test.
    if (rec) { const m = rec.mark('leave4', { pre: 0 }); await m.flagged; }
    await vis(true); await sleep(600); await vis(false);
    await page.waitForURL(/result/, { timeout: 30000 }).catch(() => {});
    await sleep(1500);
    await shot('after3');
    console.log('after third:', page.url(), '|', await visibleButtons());
    await X.see('auto', page.getByText(/Test Completed|auto.?submit|Submitted/i).filter({ visible: true }).first(), { settle: 3500, timeout: 30000 });
    await shot('auto');
    console.log('auto:', page.url(), '|', (await page.locator('body').innerText()).slice(0, 300).replace(/\s+/g, ' '));
  } catch (e) { console.log('buttons at failure:', await visibleButtons().catch(() => '?')); await fail(e); }
  await rec.stop();
}

/* ── sched: a start/end window on the live exam ──────────────────────────── */
const local = (d) => { const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
async function sched() {
  ({ page } = await session(browser, 'desktop'));
  const { title } = state.read();
  await login(page);
  await openMyTests();
  // An ended window ends the live exam too: go live again off camera (new link).
  if (!(await liveCard(title).isVisible().catch(() => false))) {
    const c = cardOf(title);
    await c.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await c.getByRole('button', { name: /conduct exam/i }).filter({ visible: true }).first().click();
    await sleep(1500);
    await page.getByRole('dialog').filter({ hasText: 'Conduct Online Exam' }).getByRole('button', { name: /start conducting/i }).click();
    await page.getByText('Exam is now live.').waitFor({ timeout: 30000 });
    await sleep(2000);
    await liveCard(title).getByRole('button', { name: /copy link/i }).click();
    await sleep(600);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    state.write({ link: (link.match(/https?:\/\/\S+/) || [link])[0] });
    console.log('live again', state.read().link);
    await openMyTests();
  }
  const live = liveCard(title);
  await live.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await sleep(800);
  await page.mouse.move(1150, 300); page.__pos = { x: 1150, y: 300 };
  rec = new Recorder(page, 'sched');
  await rec.start();
  try {
    await sleep(1000);
    await X.click('settings', live.getByRole('button', { name: /^settings$/i }), { settle: 1500 });
    await page.getByRole('tab', { name: /access/i }).waitFor({ timeout: 60000 });
    await X.click('access', page.getByRole('tab', { name: /access/i }), { settle: 1200 });
    await X.click('sched', sw('Scheduled Access'), { settle: 1100 });
    // The window: opens ~3.5 min from now (whole minute), closes 3 min later. The browser runs in IST.
    const start = new Date(Math.ceil((Date.now() + 210_000) / 60_000) * 60_000), end = new Date(start.getTime() + 180_000);
    const inputs = page.locator('input[type="datetime-local"]').filter({ visible: true });
    await X.click('start', inputs.nth(0), { settle: 300 });
    await inputs.nth(0).fill(local(start));
    await sleep(1200);
    await X.click('end', inputs.nth(1), { settle: 300 });
    await inputs.nth(1).fill(local(end));
    await sleep(1200);
    await X.hover('window', lab('Start Date & Time'), { settle: 1400 });
    await shot('window');
    await X.click('save', page.getByRole('button', { name: /save settings/i }).last(), { settle: 2500 });
    await shot('saved');
    state.write({ start: start.toISOString(), end: end.toISOString() });
    console.log('window', start.toString(), '→', end.toString());
  } catch (e) { await fail(e); }
  await rec.stop();
}

/* ── early / late: a candidate on a phone, before the start and after the end ── */
async function early() {
  ({ page } = await session(browser, 'phone'));
  const { link, start } = state.read();
  await page.goto('about:blank');
  rec = new Recorder(page, 'early');
  await rec.start();
  try {
    await page.goto(link, { waitUntil: 'load', timeout: 60000 });
    await X.see('intro', page.getByText('Candidate Details'), { settle: 1200, timeout: 60000 });
    await shot('intro');
    await X.show('x-scroll', page.getByText('Candidate Details'), 0.08);
    const inputs = page.locator('input[type=text], input:not([type])').filter({ visible: true });
    await X.click('name', inputs.nth(0), { settle: 250 });
    await X.typed('x-name', 'Meera Iyer', 85);
    await page.keyboard.press('Tab').catch(() => {});
    const tick = page.getByRole('checkbox').first();
    if (await tick.isVisible().catch(() => false) && !(await tick.isChecked().catch(() => true))) await X.click('x-tick', tick, { settle: 500 });
    await X.click('go', page.getByRole('button', { name: /start test|join|enter/i }).filter({ visible: true }).first(), { settle: 1500 });
    await X.see('wait', page.getByText(/Starts in/i).first(), { settle: 2000, timeout: 30000, tag: { maxRate: 30 } });
    await shot('waiting');
    console.log('waiting room:', (await page.locator('body').innerText()).slice(0, 300).replace(/\s+/g, ' '));
    const ms = new Date(start).getTime() - Date.now();
    console.log('waiting', Math.round(ms / 1000), 's for the start');
    // At zero the waiting room shows its button; the candidate taps it.
    const enter = page.getByRole('button', { name: /Enter Exam Now/i });
    await enter.waitFor({ timeout: ms + 60000 });
    await X.see('zero', enter, { settle: 1200 });
    await X.click('enter', enter, { settle: 300 });
    await X.see('opens', page.getByText(/QUESTION 1/i).first(), { settle: 3000, timeout: 60000 });
    await shot('opened');
  } catch (e) { await fail(e); }
  await rec.stop();
}
async function late() {
  ({ page } = await session(browser, 'phone'));
  const { link, end } = state.read();
  const ms = new Date(end).getTime() + 20_000 - Date.now();
  if (ms > 0) { console.log('waiting', Math.round(ms / 1000), 's for the end'); await sleep(ms); }
  await page.goto('about:blank');
  rec = new Recorder(page, 'late');
  await rec.start();
  try {
    await page.goto(link, { waitUntil: 'load', timeout: 60000 });
    await X.see('x-intro', page.getByText('Candidate Details'), { settle: 1200, timeout: 60000 });
    await X.show('closed', page.getByText(/This exam ended on/), 0.45);
    await sleep(3000);
    await shot('closed');
    console.log('late page:', page.url(), '|', (await page.locator('body').innerText()).slice(0, 300).replace(/\s+/g, ' '));
  } catch (e) { await fail(e); }
  await rec.stop();
}

const takes = { teacher, cbt, sched, early, late };
if (!takes[take]) { console.error('unknown take', take); process.exit(1); }
await takes[take]();
await browser.close();
