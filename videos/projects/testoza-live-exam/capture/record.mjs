// Recording takes for the live-exam tutorial. Mark ids = the {cue} names in SCRIPT-en.md.
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/record.mjs teacher|phone|candidate|results|landing
//   teacher   — My Tests: Conduct → every setting → Save → Roll No → Copy → Share → join code (leaves the exam LIVE)
//   phone     — guest on a phone opens the exam link → name + roll → Start
//   candidate — guest on a computer: /join → code → name + roll → Start → answer → tab-switch warning → Submit
//   results   — educator dashboard + Results with the live numbers staged in this browser (see stage.mjs)
//   landing   — testoza.com
import { launch, session, login, Recorder, act, appear, glide, type, sleep, state, APP, TITLE } from './rec-lib.mjs';
import { stage } from './stage.mjs';

const take = process.argv[2];
const browser = await launch();
const fail = async (page, e) => { await page.screenshot({ path: `capture/rec/FAIL-${take}.png` }).catch(() => {}); console.error('FAIL', e.message.split('\n').slice(0, 3).join(' | ')); };

/** Switch (role=switch) on the settings row whose label contains `label` (visible copy only). */
const sw = (page, label) => page.locator(`xpath=//label[contains(normalize-space(.), "${label}")]/ancestor::div[.//button[@role="switch"]][1]//button[@role="switch"] >> visible=true`).first();
const label = (page, text) => page.locator(`xpath=//label[contains(normalize-space(.), "${text}")] >> visible=true`).first();
async function smoothInto(page, locator, block = 'center') {
  await locator.evaluate((el, b) => el.scrollIntoView({ behavior: 'smooth', block: b }), block);
  await sleep(900);
}

async function stopLive(page) {
  await page.goto(APP + '/my-tests', { waitUntil: 'load', timeout: 60000 });
  await page.getByRole('heading', { name: 'All tests' }).waitFor({ timeout: 60000 });
  await sleep(2000);
  while (await page.getByRole('button', { name: /stop exam/i }).filter({ visible: true }).first().isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /stop exam/i }).filter({ visible: true }).first().click();
    await sleep(1000);
    await page.getByRole('alertdialog').or(page.getByRole('dialog')).last().getByRole('button', { name: /stop exam/i }).last().click();
    await sleep(2500);
  }
}

async function teacher() {
  const { page } = await session(browser, 'desktop');
  page.on('response', async (r) => {
    if (!/json/.test(r.headers()['content-type'] || '') || state.read().testId) return;
    try {
      const walk = (o) => { if (!o || typeof o !== 'object') return; if (typeof o.title === 'string' && o.title.startsWith(TITLE) && o.id) { state.write({ testId: o.id }); return; } Object.values(o).forEach(walk); };
      walk(await r.json());
    } catch {}
  });
  state.write({ testId: null });
  await login(page);
  await stopLive(page);
  // Clean page: no rewards banner / how-it-works box.
  for (const name of [/hide creator rewards/i, /^got it$/i]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.isVisible().catch(() => false)) { await b.click(); await sleep(600); }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(1180, 230); page.__pos = { x: 1180, y: 230 };
  const rec = new Recorder(page, 'teacher');
  await rec.start();
  try {
    await sleep(1500);
    // Tag the test's card: the nearest container around a Conduct button that holds the title
    // and no other Conduct button.
    await page.evaluate((title) => {
      const isConduct = (b) => b.offsetParent !== null && b.innerText.trim() === 'Conduct exam';
      for (const b of [...document.querySelectorAll('button')].filter(isConduct)) {
        let el = b;
        while (el && !(el.innerText || '').includes(title)) el = el.parentElement;
        if (el && [...el.querySelectorAll('button')].filter(isConduct).length === 1) { el.setAttribute('data-tz', 'card'); return; }
      }
    }, TITLE);
    const card = page.locator('[data-tz=card]');
    await act(page, rec, 'card', card.getByRole('heading').first(), { hover: true, settle: 1600, ms: 900 });
    await act(page, rec, 'conduct', card.getByRole('button', { name: /conduct exam/i }).filter({ visible: true }).first(), { settle: 1500 });

    const dlg = page.getByRole('dialog').filter({ hasText: 'Conduct Online Exam' });
    await act(page, rec, 'link', dlg.getByText(/https:\/\/app\.testoza\.com\/test\//), { hover: true, settle: 1500 });
    await act(page, rec, 'start', dlg.getByRole('button', { name: /start conducting/i }), { settle: 200 });
    await appear(page, rec, 'live', page.getByText('Exam is now live.'), { settle: 1500 });

    const live = page.locator('li', { has: page.getByRole('button', { name: /stop exam/i }) }).first();
    await act(page, rec, 'coach', page.getByText('Set up the exam room').first(), { hover: true, settle: 1400 });
    await act(page, rec, 'settings', live.getByRole('button', { name: /^settings$/i }), { settle: 1500 });

    // ── Proctoring & Security
    await act(page, rec, 't1', page.getByRole('tab', { name: /proctoring/i }), { hover: true, settle: 500, ms: 500 });
    await act(page, rec, 't2', page.getByRole('tab', { name: /access/i }), { hover: true, settle: 400, ms: 400 });
    await act(page, rec, 't3', page.getByRole('tab', { name: /results/i }), { hover: true, settle: 900, ms: 400 });
    await act(page, rec, 'fs', sw(page, 'Force Full Screen'), { settle: 1300 });
    await act(page, rec, 'tab', sw(page, 'Tab/App Switch Detection'), { settle: 1200 });
    await act(page, rec, 'caught', page.getByText('Detect if user switches tabs/apps or minimizes browser.').filter({ visible: true }).first(), { hover: true, settle: 900, fx: 0.3 });
    await act(page, rec, 'warn', label(page, 'No limit (Warn only)'), { hover: true, settle: 900 });
    await act(page, rec, 'strict', label(page, 'Strict (Instant Submit)'), { hover: true, settle: 900 });
    await act(page, rec, 'count', page.locator('input[type=radio][name^="violation_limit"] >> visible=true').nth(2), { settle: 1000 });
    await act(page, rec, 'three', page.getByRole('combobox').filter({ visible: true }).first(), { settle: 700 });
    await act(page, rec, 'threepick', page.getByRole('option', { name: '3', exact: true }), { settle: 1200, ms: 450 });
    await act(page, rec, 'copy', sw(page, 'Disable Copy/Paste'), { settle: 1200 });
    await act(page, rec, 'right', sw(page, 'Disable Right Click'), { settle: 1200 });
    await smoothInto(page, sw(page, 'Block Back Button'));
    await act(page, rec, 'back', sw(page, 'Block Back Button'), { settle: 1200 });
    await act(page, rec, 'exit', sw(page, 'Disable Exit Button'), { settle: 1400 });

    // ── Access & Control
    await act(page, rec, 'access', page.getByRole('tab', { name: /access/i }), { settle: 1300 });
    await act(page, rec, 'sched', sw(page, 'Scheduled Access'), { settle: 1000 });
    await act(page, rec, 'pickers', label(page, 'Start Date & Time'), { hover: true, settle: 1300 });
    await act(page, rec, 'schedoff', sw(page, 'Scheduled Access'), { settle: 1200 });
    await act(page, rec, 'class', label(page, 'Assign to Class'), { hover: true, settle: 1200 });
    await act(page, rec, 'attempt', sw(page, 'Attempt Limit'), { settle: 900 });
    await act(page, rec, 'single', page.getByText('Single Attempt').filter({ visible: true }).first(), { hover: true, settle: 1000 });
    await act(page, rec, 'login', sw(page, 'Require Candidate Login'), { hover: true, settle: 1500 });

    // ── Results & Timing
    await act(page, rec, 'results', page.getByRole('tab', { name: /results/i }), { settle: 1300 });
    await act(page, rec, 'vis', sw(page, 'Result Visibility'), { hover: true, settle: 1400 });
    await act(page, rec, 'strictt', sw(page, 'Strict Timer'), { settle: 1300 });
    await act(page, rec, 'flex', sw(page, 'Allow Flexible Timer'), { settle: 900 });
    await act(page, rec, 'flexwarn', page.getByText(/turn this off for strict exams/i).filter({ visible: true }).first(), { hover: true, settle: 1100, fx: 0.25 });
    await act(page, rec, 'flexoff', sw(page, 'Allow Flexible Timer'), { settle: 1200 });
    await act(page, rec, 'shuffle', sw(page, 'Randomize Questions'), { settle: 1300 });
    const layoutLabel = label(page, 'Exam Interface Layout');
    const t1 = rec.now();
    await smoothInto(page, layoutLabel, 'start');
    rec.mark('layout', { pre: +(rec.now() - t1).toFixed(3) });
    await sleep(600);
    await act(page, rec, 'std', page.getByText('Standard Mode').filter({ visible: true }).first(), { hover: true, settle: 1400 });
    await act(page, rec, 'modern', page.getByText('Modern Mode').filter({ visible: true }).first(), { hover: true, settle: 1400 });
    await act(page, rec, 'stdpick', page.getByText('Standard Mode').filter({ visible: true }).first(), { settle: 1200 });

    await act(page, rec, 'save', page.getByRole('button', { name: /save settings/i }).last(), { settle: 2000 });
    {
      // Where the amber chip sat: just right of the live card's Results button.
      const rb = await live.getByRole('button', { name: /^results/i }).first().boundingBox();
      const chipBox = { x: rb.x + rb.width + 8, y: rb.y, width: 150, height: rb.height };
      const t2 = rec.now();
      await glide(page, chipBox.x + 70, chipBox.y + chipBox.height / 2, 700);
      const m = rec.mark('chip', { pre: +(rec.now() - t2).toFixed(3), box: chipBox, hover: true });
      await sleep(1600);
      m.end = +rec.now().toFixed(3);
    }

    // ── Candidate inputs, copy, share
    await act(page, rec, 'inputs', live.getByText(/Candidate inputs — what candidates fill in/), { hover: true, settle: 1300, fx: 0.2 });
    await act(page, rec, 'roll', live.getByRole('textbox', { name: 'Input 2' }), { settle: 300 });
    await type(page, 'Roll No', 80);
    await page.keyboard.press('Tab');
    await sleep(1300);
    await act(page, rec, 'coach2', page.getByText('Send it to your candidates'), { hover: true, settle: 1300 });
    await page.evaluate(() => { navigator.share = undefined; });
    await act(page, rec, 'copy2', live.getByRole('button', { name: /copy link/i }), { settle: 1300 });
    await act(page, rec, 'share', live.getByRole('button', { name: /share link/i }), { settle: 1500 });
    const shareText = await page.evaluate(() => navigator.clipboard.readText());

    // ── Join code
    await act(page, rec, 'menu', live.getByRole('button', { name: /more options/i }).first(), { settle: 1000 });
    await act(page, rec, 'getcode', page.getByRole('menuitem', { name: /join code/i }), { settle: 300 });
    const codeEl = live.getByText(/^\d{3} \d{3}$/).first();
    await codeEl.waitFor();
    await act(page, rec, 'code', codeEl, { hover: true, settle: 2200 });
    const code = (await codeEl.innerText()).trim();
    const link = (shareText.match(/https?:\/\/\S+/) || [])[0];
    state.write({ code, link, shareText, liveAt: new Date().toISOString() });
    console.log('code', code, 'link', link);
  } catch (e) { await fail(page, e); }
  await rec.stop();
}

async function phone() {
  const { link } = state.read();
  const { page } = await session(browser, 'phone');
  await page.goto('about:blank');
  const rec = new Recorder(page, 'phone');
  await rec.start();
  try {
    await page.goto(link, { waitUntil: 'load', timeout: 60000 });
    await appear(page, rec, 'intro', page.getByText('Candidate Details'), { settle: 1500 });
    const t1 = rec.now();
    await smoothInto(page, page.getByText('Candidate Details'), 'start');
    rec.mark('scrollp', { pre: +(rec.now() - t1).toFixed(3) });
    await sleep(800);
    const inputs = page.locator('input[type=text], input:not([type])').filter({ visible: true });
    await act(page, rec, 'name', inputs.nth(0), { settle: 200 });
    await type(page, 'Priya Sharma', 75);
    await act(page, rec, 'roll2', inputs.nth(1), { settle: 200 });
    await type(page, 'JM-14', 90);
    await page.keyboard.press('Tab').catch(() => {});
    await sleep(500);
    const tick = page.getByRole('checkbox').first();
    if (await tick.isVisible().catch(() => false) && !(await tick.isChecked().catch(() => true))) await act(page, rec, 'tick', tick, { settle: 600 });
    await act(page, rec, 'go', page.getByRole('button', { name: /start test/i }), { settle: 4000 });
  } catch (e) { await fail(page, e); }
  await rec.stop();
}

async function candidate() {
  const { code } = state.read();
  const { page } = await session(browser, 'desktop');
  await page.goto('https://testoza.com/join', { waitUntil: 'load', timeout: 60000 });
  await sleep(1500);
  await page.mouse.move(1000, 700); page.__pos = { x: 1000, y: 700 };
  const rec = new Recorder(page, 'candidate');
  await rec.start();
  try {
    await sleep(1200);
    rec.mark('join', { pre: 0 });
    await sleep(800);
    await act(page, rec, 'typecode', page.locator('input').first(), { settle: 300 });
    await type(page, code.replace(/\D/g, ''), 230);
    await sleep(600);
    // The sixth digit opens the exam by itself.
    await appear(page, rec, 'cont', page.getByText('Candidate Details'), { settle: 1200, timeout: 30000 });
    const inputs = page.locator('input[type=text], input:not([type])').filter({ visible: true });
    await smoothInto(page, page.getByText('Candidate Details'), 'center');
    await act(page, rec, 'fill', inputs.nth(0), { settle: 200 });
    await type(page, 'Rohan Mehta', 70);
    await act(page, rec, 'fill2', inputs.nth(1), { settle: 200 });
    await type(page, 'JM-07', 90);
    const tick = page.getByRole('checkbox').first();
    if (await tick.isVisible().catch(() => false) && !(await tick.isChecked().catch(() => true))) await act(page, rec, 'tick', tick, { settle: 500 });
    await act(page, rec, 'start2', page.getByRole('button', { name: /start test/i }), { settle: 300 });
    await appear(page, rec, 'fsgo', page.getByText(/QUESTION 1/i).first(), { settle: 1500, timeout: 60000 });

    const opt = (L) => page.locator('div.cursor-pointer.rounded-lg.border').filter({ has: page.locator('div.h-7.w-7', { hasText: new RegExp(`^${L}$`) }) }).filter({ visible: true }).first();
    // Questions are shuffled per candidate: answer from the paper's key (builder tutorial BRIEF).
    const KEY = [[/stone/i, 'D'], [/steel|brass/i, 'B'], [/optical isomer/i, 'C'], [/bromobenzene|final product/i, 'B'], [/match/i, 'C']];
    const pick = async () => {
      const q = await page.locator('body').innerText();
      return KEY.find(([re]) => re.test(q.split('OPTIONS')[0]))?.[1];
    };
    const next = () => page.getByRole('button', { name: /save & next/i });
    let answered = 0;
    for (let i = 0; i < 6 && answered < 2; i++) {
      const L = await pick();
      if (!L) { await next().click(); await sleep(900); continue; }
      answered++;
      await act(page, rec, answered === 1 ? 'answer' : 'answer2', opt(L), { settle: 900, fx: 0.08 });
      await act(page, rec, answered === 1 ? 'next' : 'next2', next(), { settle: 1300 });
    }

    // "Sneaks into another tab": cursor heads for the top, the page reports hidden → visible.
    await glide(page, 760, 6, 700);
    await sleep(200);
    const vis = (hidden) => page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await vis(true);
    await sleep(500);
    await vis(false);
    await appear(page, rec, 'violation', page.getByText(/Warning 1\/3/).filter({ visible: true }).first(), { settle: 2600 });
    const warnDlg = page.getByRole('dialog').or(page.getByRole('alertdialog')).filter({ hasText: /Warning 1\/3/ }).last();
    console.log('warning dialog buttons:', await warnDlg.getByRole('button').allInnerTexts().catch(() => []));
    await act(page, rec, 'warnok', warnDlg.getByRole('button').filter({ visible: true }).last(), { settle: 1200 });

    await act(page, rec, 'submit', page.getByRole('button', { name: /submit test/i }).filter({ visible: true }).first(), { settle: 1500 });
    await act(page, rec, 'yes', page.getByRole('button', { name: /yes, submit/i }), { settle: 300 });
    await appear(page, rec, 'score', page.getByText('Test Completed Successfully'), { settle: 3500, timeout: 60000 });
    await page.screenshot({ path: 'capture/rec/candidate-result.png' });
    console.log('result url', page.url());
  } catch (e) { await fail(page, e); }
  await rec.stop();
}

async function results() {
  const { testId, liveAt } = state.read();
  const { context, page } = await session(browser, 'desktop');
  await login(page);
  const st = await stage(context, { testId, liveAt });
  await page.goto(APP + '/dashboard', { waitUntil: 'load', timeout: 60000 });
  await page.getByText('Writing now').filter({ visible: true }).first().waitFor({ timeout: 60000 });
  await sleep(3000);
  await page.mouse.move(1180, 200); page.__pos = { x: 1180, y: 200 };
  const rec = new Recorder(page, 'results');
  await rec.start();
  try {
    await sleep(1000);
    const d = rec.mark('dash', { pre: 0 }); await sleep(1500); d.end = +rec.now().toFixed(3);
    await act(page, rec, 'writing', page.getByText('Writing now').filter({ visible: true }).first(), { hover: true, settle: 1300 });
    await act(page, rec, 'subm', page.getByText(/^Submitted/).filter({ visible: true }).first(), { hover: true, settle: 1300 });
    await act(page, rec, 'panel', page.getByRole('button', { name: /^results/i }).filter({ visible: true }).first(), { settle: 300 });
    await appear(page, rec, 'panelopen', page.getByText(/^test results$/i).first(), { settle: 300 });
    await page.getByText(/fetching results/i).first().waitFor({ state: 'hidden', timeout: 30000 });
    await sleep(1200);
    rec.marks.at(-1).end = +rec.now().toFixed(3);
    const tile = (re) => page.getByText(re).filter({ visible: true }).last();
    await act(page, rec, 'started', tile(/^started$/i), { hover: true, settle: 900, ms: 500 });
    await act(page, rec, 'writ', tile(/^writing now$/i), { hover: true, settle: 900, ms: 500 });
    await act(page, rec, 'two', tile(/^submitted$/i), { hover: true, settle: 900, ms: 500 });
    await act(page, rec, 'zero', tile(/^dropped$/i), { hover: true, settle: 900, ms: 500 });
    await act(page, rec, 'names', tile(/^writing now$/i), { settle: 2600 });
    await page.keyboard.press('Escape');
    await sleep(1200);

    // ── Later: everyone has submitted.
    st.setPhase('done');
    await act(page, rec, 'reopen', page.getByRole('button', { name: /^results/i }).filter({ visible: true }).first(), { settle: 300 });
    // The dashboard behind the panel also lists the top student: wait for the panel's own list.
    await page.getByText(/fetching results/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.getByText(/fetching results/i).first().waitFor({ state: 'hidden', timeout: 30000 });
    await appear(page, rec, 'all', null, { settle: 2000 });
    await act(page, rec, 'rank', page.getByRole('switch').filter({ visible: true }).first(), { settle: 1600 });
    const t1 = rec.now();
    await page.mouse.move(1100, 600); page.__pos = { x: 1100, y: 600 };
    await page.mouse.wheel(0, 500); await sleep(900); await page.mouse.wheel(0, 500);
    rec.mark('scrolllist', { pre: +(rec.now() - t1).toFixed(3) });
    await sleep(1500);
    await page.mouse.wheel(0, -1000); await sleep(800);
    const dl = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    await act(page, rec, 'export', page.getByRole('button', { name: /excel/i }).filter({ visible: true }).first(), { settle: 3500 });
    const file = await dl;
    console.log('download', file ? file.suggestedFilename() : 'none');
  } catch (e) { await fail(page, e); }
  await rec.stop();
}

async function landing() {
  const { page } = await session(browser, 'desktop');
  await page.goto('https://testoza.com/', { waitUntil: 'load', timeout: 60000 });
  await sleep(5000);
  await page.mouse.move(1320, 760); page.__pos = { x: 1320, y: 760 };
  const rec = new Recorder(page, 'landing');
  await rec.start();
  try {
    await sleep(800);
    const m = rec.mark('landing', { pre: 0 });
    await sleep(3000);
    m.end = +rec.now().toFixed(3);
    for (let i = 0; i < 3; i++) {
      const t = rec.now();
      await page.evaluate(() => window.scrollBy({ top: 620, behavior: 'smooth' }));
      await sleep(1100);
      rec.mark('scroll' + (i + 1), { pre: +(rec.now() - t).toFixed(3), end: +(rec.now() + 2).toFixed(3) });
      await sleep(2600);
    }
  } catch (e) { await fail(page, e); }
  await rec.stop();
}

const takes = { teacher, phone, candidate, results, landing };
if (!takes[take]) { console.error('unknown take', take); process.exit(1); }
await takes[take]();
await browser.close();
