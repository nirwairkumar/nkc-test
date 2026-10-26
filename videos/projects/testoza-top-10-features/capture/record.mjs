// Recording takes for "Top 10 Features". Mark ids = the {cue} names in SCRIPT-en.md; ids that start
// with "x-" are in-between actions (no cue). Real app.testoza.com, signed in as the demo educator.
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/record.mjs ai|build|conduct|phone|results
//   ai      — #1 Generate with AI: the DPP PDF → Extract → questions stream in → review → Save (one new test)
//   build   — #2–#4 on that test: Sy Pad formula, Hindi typing, marking, sections + section timers, save
//   conduct — #5–#7: Conduct → live → copy/share link → join code → anti-cheating settings → candidate inputs
//   phone   — #8: a candidate on a phone: testoza.com/join → code → details → exam → tab-switch warning → submit
//   results — #9–#10: dashboard live numbers + Results panel (staged in this browser), ranks, Excel
import { launch, session, login, Recorder, act, appear, sleep, state, APP, DIR } from './rec-lib.mjs';
import { card, box, pad, key, padInsert } from './builder.mjs';
import { stage } from './stage.mjs';

const take = process.argv[2];
const PDF = 'DPP-07-Motion-in-a-Straight-Line.pdf';
const browser = await launch();
let page, rec = null;
const fail = async (e) => { await page.screenshot({ path: `capture/rec/FAIL-${take}.png` }).catch(() => {}); console.error('FAIL', e.message.split('\n').slice(0, 3).join(' | ')); };

/** Action helpers: on camera (rec set) every move leaves a mark; off camera they just happen. */
const X = {
  async click(id, loc, o = {}) {
    if (!rec) { await loc.click(); await sleep(o.fastSettle ?? 300); return null; }
    return act(page, rec, id, loc, o);
  },
  async hover(id, loc, o = {}) { if (rec) return act(page, rec, id, loc, { settle: 900, ...o, hover: true }); },
  async see(id, loc, o = {}) { if (rec) return appear(page, rec, id, loc, o); if (loc) await loc.waitFor({ timeout: o.timeout ?? 20000 }); },
  /** Type with a mark at the first key; the mark's result runs to the last key (never sped up when slow). */
  async typed(id, text, delay, { slow = true, boxOf, tag = {} } = {}) {
    if (!rec) { await page.keyboard.type(text, { delay: 6 }); return; }
    const b = boxOf ? await boxOf.boundingBox() : undefined;
    const m = rec.mark(id, { pre: 0, box: b, slow, ...tag });
    await m.flagged;
    await page.keyboard.type(text, { delay });
    await sleep(350);
    m.end = +rec.now().toFixed(3);
  },
  /** Smooth scroll so `loc` sits `ratio` of the way down the window; a mark when it lands. */
  async show(id, loc, ratio = 0.15) {
    const t1 = rec ? rec.now() : 0;
    await loc.evaluate((el, r) => {
      const top = el.getBoundingClientRect().top + window.scrollY - Math.max(window.innerHeight * r, 80);
      window.scrollTo({ top, behavior: 'smooth' });
    }, ratio);
    await sleep(rec ? 1100 : 400);
    if (rec && id) { const m = rec.mark(id, { pre: +(rec.now() - t1).toFixed(3), box: await loc.boundingBox() }); await m.flagged; await sleep(500); m.end = +rec.now().toFixed(3); }
  },
};

/* ── #1 Generate with AI ───────────────────────────────────────────────── */
async function ai() {
  ({ page } = await session(browser, 'desktop'));
  await login(page);
  await page.goto(APP + '/generate-with-ai', { waitUntil: 'load', timeout: 60000 });
  await page.getByRole('button', { name: 'Choose File' }).waitFor({ timeout: 60000 });
  await sleep(2500);
  await page.mouse.move(1200, 640); page.__pos = { x: 1200, y: 640 };
  // The saved test's id + title, from the create call's response.
  page.on('response', async (r) => {
    if (r.request().method() !== 'POST' || state.read().aiAt !== stamp) return;
    try {
      const j = await r.json();
      const walk = (o) => { if (!o || typeof o !== 'object') return; if (o.id && typeof o.title === 'string' && Array.isArray(o.questions ?? o.sections ?? null)) { state.write({ testId: o.id, title: o.title, customId: o.custom_id }); return; } Object.values(o).forEach(walk); };
      walk(j);
    } catch {}
  });
  const stamp = new Date().toISOString();
  state.write({ aiAt: stamp, testId: null, title: null });
  rec = new Recorder(page, 'ai');
  await rec.start();
  try {
    await sleep(1200);
    await X.hover('upload', page.getByText('Upload Question Paper, Notes or Chapter'), { settle: 1300, ms: 800 });
    const chooser = page.waitForEvent('filechooser', { timeout: 15000 });
    await X.click('choose', page.getByRole('button', { name: 'Choose File' }), { settle: 100, tag: { filedialog: PDF } });
    const fc = await chooser;
    await sleep(3200); // the Open dialog is drawn here in the edit
    await rec.mark('x-pick', { pre: 0, filedialogEnd: true }).flagged;
    await fc.setFiles(DIR + 'paper/' + PDF);
    await X.see('modes', page.getByText(/How do you want to process/), { settle: 1400 });
    await X.click('extract', page.getByRole('button', { name: /Extract Questions/ }), { settle: 300 });
    await X.see('reading', page.locator('#aix-status-title'), { settle: 300, timeout: 60000, tag: { maxRate: 20 } });
    await X.see('q1', page.locator('article.aix-fq').first(), { settle: 300, timeout: 180000, tag: { maxRate: 6 } });
    await X.see('q6', page.locator('article.aix-fq').nth(5), { settle: 300, timeout: 180000, tag: { maxRate: 6 } });
    await X.see('preview', page.getByRole('button', { name: /Save & continue/ }), { settle: 1500, timeout: 240000 });
    const ok = page.getByText('Every answer is set');
    console.log('answers set:', await ok.isVisible().catch(() => false), '·', await page.locator('.aix-actionbar-sum b').innerText().catch(() => '?'));
    await X.hover('answers', page.locator('.aix-actionbar-sum'), { settle: 1500 });
    await X.show('x-scroll', page.locator('article.aix-qc').nth(2), 0.2);
    await X.hover('qcard', page.locator('article.aix-qc').nth(2), { settle: 1500, fx: 0.3, fy: 0.3 });
    await X.click('save', page.getByRole('button', { name: /Save & continue/ }), { settle: 300 });
    await page.waitForURL(/my-tests/, { timeout: 60000 });
    await X.see('mytests', page.getByRole('heading', { name: 'All tests' }), { settle: 2500, timeout: 60000 });
    const { title } = state.read();
    if (title) await X.hover('newcard', page.getByRole('heading', { name: title }).filter({ visible: true }).first(), { settle: 2200 });
    console.log('saved', JSON.stringify(state.read()));
  } catch (e) { await fail(e); }
  await rec.stop();
}

/* ── My Tests helpers ──────────────────────────────────────────────────── */
async function openMyTests() {
  await page.goto(APP + '/my-tests', { waitUntil: 'load', timeout: 60000 });
  await page.getByRole('heading', { name: 'All tests' }).waitFor({ timeout: 60000 });
  // The cards arrive a few seconds after the heading, and only once the list is in view.
  // The live section above can load later and push the list down again, so keep scrolling to it.
  const anyCard = page.getByRole('button', { name: /Conduct exam/ }).filter({ visible: true }).first();
  for (let i = 0; i < 30 && !(await anyCard.isVisible().catch(() => false)); i++) {
    await page.getByRole('heading', { name: 'All tests' }).scrollIntoViewIfNeeded().catch(() => {});
    await sleep(2000);
  }
  await anyCard.waitFor({ timeout: 5000 });
  await sleep(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  for (const name of [/hide creator rewards/i, /^got it$/i]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.isVisible().catch(() => false)) { await b.click(); await sleep(600); }
  }
}
/** Tags the My Tests card of `title`: the nearest container holding the title and exactly one Conduct button. */
async function tagCard(title) {
  await page.evaluate((title) => {
    document.querySelectorAll('[data-tz=card]').forEach((e) => e.removeAttribute('data-tz'));
    const isConduct = (b) => b.offsetParent !== null && /Conduct exam/.test(b.innerText);
    for (const b of [...document.querySelectorAll('button')].filter(isConduct)) {
      let el = b;
      while (el && !(el.innerText || '').includes(title)) el = el.parentElement;
      if (el && [...el.querySelectorAll('button')].filter(isConduct).length === 1) { el.setAttribute('data-tz', 'card'); return; }
    }
  }, title);
  return page.locator('[data-tz=card]');
}
/** Click into a builder text box and put the caret at its end. */
async function into(id, loc, o = {}) {
  await X.click(id, loc, { settle: 250, ...o });
  await loc.locator('textarea, input').first().focus().catch(() => {});
  await page.keyboard.press('Control+End');
  await sleep(150);
}
const menuItem = (re) => page.getByRole('menuitem').or(page.getByRole('option')).or(page.getByRole('menuitemradio')).filter({ hasText: re }).filter({ visible: true }).first();

/** Off camera: the builder autosaves every edit (2 s debounce), so a failed take leaves its changes in
 *  the test. Back to the 12 imported questions, sections off. */
async function resetTest(testId) {
  await page.goto(`${APP}/edit-test/${testId}`, { waitUntil: 'load', timeout: 60000 });
  await card(page, 11).waitFor({ timeout: 60000 });
  await sleep(2500);
  const confirm = async () => {
    const d = page.getByRole('alertdialog').or(page.getByRole('dialog')).filter({ visible: true }).last();
    if (await d.isVisible().catch(() => false)) { await d.getByRole('button').filter({ hasText: /delete|remove|yes|turn off|merge|continue|ok/i }).last().click(); await sleep(800); }
  };
  const sw = page.getByRole('switch', { name: 'Split into sections' });
  if ((await sw.getAttribute('aria-checked')) === 'true') { await sw.click(); await sleep(800); await confirm(); }
  while ((await page.locator('article:has(.group\\/ime-container)').count()) > 12) {
    await page.locator('article:has(.group\\/ime-container)').last().getByRole('button', { name: 'Delete question' }).click();
    await sleep(700); await confirm();
  }
  await sleep(3500); // autosave
  console.log('reset:', await page.locator('article:has(.group\\/ime-container)').count(), 'questions, sections', await sw.getAttribute('aria-checked'));
}

/* ── #2–#4 in the builder ──────────────────────────────────────────────── */
async function build() {
  ({ page } = await session(browser, 'desktop'));
  const { title, testId } = state.read();
  await login(page);
  await resetTest(testId);
  await openMyTests();
  const c = await tagCard(title);
  await c.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await sleep(800);
  await page.mouse.move(1100, 300); page.__pos = { x: 1100, y: 300 };
  rec = new Recorder(page, 'build');
  await rec.start();
  const n = 12; // the new question (0-based): question 13
  const padBox = () => pad(page).locator('xpath=.//div[contains(@class,"rounded-2xl")][1]').first();
  try {
    await sleep(1000);
    await X.click('edit', c.getByRole('button', { name: /^Edit$/ }).filter({ visible: true }).first(), { settle: 300 });
    await X.see('builder', card(page, 11), { settle: 1500, timeout: 60000 });

    // #2 Sy Pad: a formula with a fraction and a power, typed on the pad's keys.
    const add = page.getByRole('button', { name: /^Add question/ }).filter({ visible: true }).last();
    await X.show('x-down', add, 0.62);
    await X.click('addq', add, { settle: 700 });
    await X.show(null, card(page, n), 0.1);
    await into('q13', box(page, n, 0));
    await X.typed('q13text', 'A ball is thrown straight up. Its height after t seconds is ', 26, { slow: false, boxOf: box(page, n, 0) });
    await X.click('sypad', card(page, n).getByRole('button', { name: /Maths & symbols/ }), { settle: 1000 });
    await X.typed('h', 'h=ut-', 170, { boxOf: padBox() });
    await X.click('frac', key(page, 'Fraction — top over bottom'), { settle: 450 });
    await X.typed('x-1', '1', 200, { boxOf: padBox() });
    // Typing fills the first blue blank; the bottom one is clicked (KaTeX spans cover it, so by position).
    await X.click('x-blank', pad(page).locator('.math-placeholder').first(), { settle: 300, ms: 380 });
    await X.typed('x-2', '2', 200, { boxOf: padBox() });
    await X.click('x-r2', pad(page).getByRole('button', { name: 'Move cursor right' }), { settle: 300, ms: 380 });
    await X.typed('x-gt', 'gt', 200, { boxOf: padBox() });
    await X.click('power', key(page, 'Power — x², 10³'), { settle: 450 });
    await X.typed('x-sq', '2', 200, { boxOf: padBox() });
    await X.hover('formula', padBox(), { settle: 1200, fy: 0.3 });
    await X.click('insert', padInsert(page), { settle: 900 });
    await X.click('x-done', pad(page).getByRole('button', { name: 'Done', exact: true }), { settle: 700 });
    await into('x-back', box(page, n, 0), { ms: 420 });
    await X.typed('x-rest', '. With u = 20 m/s and g = 10 m/s², find h at t = 2 s.', 24, { slow: false, boxOf: box(page, n, 0) });

    // #3 Hindi: the same question in Hindi, typed in English letters.
    await page.keyboard.press('Enter');
    const sw = card(page, n).getByRole('group', { name: 'Typing language' });
    await X.click('lang', sw.getByRole('button').nth(1), { settle: 1000 });
    await X.click('hindi', page.getByRole('button', { name: /Hindi/ }).filter({ visible: true }).first(), { settle: 1200 });
    await into('x-hiback', box(page, n, 0), { ms: 420 });
    await X.typed('hitype', 'do second baad gend ki oonchai kitni hogi ', 110, { boxOf: box(page, n, 0) });
    await X.hover('hindone', box(page, n, 0), { settle: 1300, fy: 0.7 });
    for (const [i, text] of ['20 m', '40 m', '30 m', '10 m'].entries()) {
      await into(i === 0 ? 'opts' : `x-opt${i}`, box(page, n, 1 + i), { ms: 400 });
      await X.typed(`x-optt${i}`, text, 40, { slow: false });
    }

    // #4 Exam patterns: marks, JEE Advanced partial marks, sections, a timer per section.
    // (Switching to Multiple correct clears the answer, so A is ticked after it.)
    await X.hover('marks', card(page, n).getByText(/^Marks/).first(), { settle: 1200 });
    await X.click('qtype', card(page, n).getByRole('combobox', { name: 'Question type' }), { settle: 900 });
    await X.click('multi', page.getByRole('option', { name: /Multiple/ }), { settle: 1000 });
    await X.click('jeeadv', card(page, n).getByRole('radio', { name: 'JEE Advanced' }), { settle: 1300 });
    await X.click('correct', card(page, n).getByLabel('Mark option A as correct'), { settle: 1000 });
    const split = page.getByRole('switch', { name: 'Split into sections' });
    await X.show('x-up', split, 0.35);
    await X.click('sections', split, { settle: 1300 });
    await X.click('timed', page.getByRole('switch', { name: 'Time each section' }), { settle: 1300 });
    const gap = page.getByRole('button', { name: 'Add a question or split the section here' }).nth(5);
    await X.show('x-gap', gap, 0.5);
    await X.click('gap', gap, { settle: 900 });
    await X.click('split', page.getByText('Split section here').filter({ visible: true }).first(), { settle: 1500 });
    for (const [id, s] of [['mina', 'A'], ['minb', 'B']]) {
      const m = page.getByLabel(new RegExp(`^Minutes for Section ${s}`)).first();
      if (id === 'minb') await X.show('x-secb', m, 0.3);
      await X.click(id, m, { settle: 200 });
      await page.keyboard.press('Control+A');
      await X.typed(`x-${id}`, '10', 220, { slow: false });
      await sleep(600);
    }
    await page.screenshot({ path: 'capture/probe/build-before-save.png' });
    if (!process.env.TZ_DRY) {
      await X.click('save', page.getByRole('button', { name: /Save test|Update test|Save changes/ }).filter({ visible: true }).last(), { settle: 300, tag: { maxRate: 10 } });
      await page.waitForURL(/my-tests/, { timeout: 60000 });
      await X.see('saved', page.getByRole('heading', { name: 'All tests' }), { settle: 2500, timeout: 60000 });
    }
  } catch (e) { await fail(e); }
  await rec.stop();
}

/* ── #5–#7 conduct ─────────────────────────────────────────────────────── */
/** Switch on the settings row whose label contains `label` (visible copy only). */
const sw = (label) => page.locator(`xpath=//label[contains(normalize-space(.), "${label}")]/ancestor::div[.//button[@role="switch"]][1]//button[@role="switch"] >> visible=true`).first();
const lab = (text) => page.locator(`xpath=//label[contains(normalize-space(.), "${text}")] >> visible=true`).first();
const liveCard = (title) => page.locator('li', { has: page.getByRole('button', { name: /stop exam/i }) }).filter({ hasText: title }).first();
/** Stops this test's exam if an earlier take left it live (other live exams on the account are left alone). */
async function stopOurs(title) {
  for (let i = 0; i < 3 && await liveCard(title).isVisible().catch(() => false); i++) {
    // Candidate inputs outlive a stop: back to Name only, so the take can add Roll No again.
    for (const rm of await liveCard(title).getByRole('button', { name: /^Remove / }).all()) { await rm.click().catch(() => {}); await sleep(800); }
    await liveCard(title).getByRole('button', { name: /stop exam/i }).filter({ visible: true }).first().click();
    await sleep(1000);
    await page.getByRole('alertdialog').or(page.getByRole('dialog')).last().getByRole('button', { name: /stop exam/i }).last().click();
    await sleep(2500);
  }
}
async function conduct() {
  ({ page } = await session(browser, 'desktop'));
  const { title } = state.read();
  await login(page);
  await openMyTests();
  await stopOurs(title);
  await openMyTests();
  const c = await tagCard(title);
  await c.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await sleep(800);
  await page.mouse.move(1150, 260); page.__pos = { x: 1150, y: 260 };
  rec = new Recorder(page, 'conduct');
  await rec.start();
  try {
    await sleep(1200);
    // #5 One click to go live, then the anti-cheating exam room (the app's own tip points at Settings).
    await X.hover('card', c.getByRole('heading').first(), { settle: 1300, ms: 900 });
    await X.click('conduct', c.getByRole('button', { name: /conduct exam/i }).filter({ visible: true }).first(), { settle: 1500 });
    const dlg = page.getByRole('dialog').filter({ hasText: 'Conduct Online Exam' });
    await X.hover('link', dlg.getByText(/https:\/\/app\.testoza\.com\/test\//), { settle: 1400 });
    await X.click('start', dlg.getByRole('button', { name: /start conducting/i }), { settle: 200 });
    await X.see('live', page.getByText('Exam is now live.'), { settle: 1600 });
    const live = liveCard(title);
    await X.hover('tip1', page.getByText('Set up the exam room').filter({ visible: true }).first(), { settle: 1300 });
    await X.click('settings', live.getByRole('button', { name: /^settings$/i }), { settle: 1500 });
    await X.click('fs', sw('Force Full Screen'), { settle: 1300 });
    await X.click('tab', sw('Tab/App Switch Detection'), { settle: 1300 });
    await X.hover('warn', lab('No limit (Warn only)'), { settle: 900 });
    await X.click('count', page.locator('input[type=radio][name^="violation_limit"] >> visible=true').nth(2), { settle: 1000 });
    await X.click('three', page.getByRole('combobox').filter({ visible: true }).first(), { settle: 700 });
    await X.click('threepick', page.getByRole('option', { name: '3', exact: true }), { settle: 1200, ms: 450 });
    await X.click('copyoff', sw('Disable Copy/Paste'), { settle: 1100 });
    await X.click('right', sw('Disable Right Click'), { settle: 1100 });
    await X.show(null, sw('Block Back Button'), 0.5);
    await X.click('back', sw('Block Back Button'), { settle: 1200 });
    await X.click('results', page.getByRole('tab', { name: /results/i }), { settle: 1300 });
    // (#10 uses this: what candidates see after the exam.)
    await X.hover('resultview', lab('Result Visibility'), { settle: 2200, fx: 0.3 });
    await X.click('shuffle', sw('Randomize Questions'), { settle: 1400 });
    await X.click('saveset', page.getByRole('button', { name: /save settings/i }).last(), { settle: 2000 });

    // #6 Share: link, WhatsApp text, 6-digit join code (the tip now points at Copy/Share).
    await page.evaluate(() => { navigator.share = undefined; });
    await X.show(null, live, 0.1); // saving scrolls the page; the card's top row (⋯ menu) must clear the header
    await X.hover('tip2', page.getByText('Send it to your candidates').filter({ visible: true }).first(), { settle: 1200 });
    await X.click('copy', live.getByRole('button', { name: /copy link/i }), { settle: 1300 });
    await X.click('share', live.getByRole('button', { name: /share link/i }), { settle: 1600 });
    const shareText = await page.evaluate(() => navigator.clipboard.readText());
    for (const p of page.context().pages()) if (p !== page) await p.close().catch(() => {});
    await X.click('menu', live.getByRole('button', { name: /more options/i }).first(), { settle: 1000 });
    await X.click('getcode', page.getByRole('menuitem', { name: /join code/i }), { settle: 300 });
    const codeEl = live.getByText(/^\d{3} \d{3}$/).first();
    await codeEl.waitFor();
    await X.hover('code', codeEl, { settle: 2200 });
    const code = (await codeEl.innerText()).trim();
    const link = (shareText.match(/https?:\/\/\S+/) || [])[0];
    state.write({ code, link, shareText, liveAt: new Date().toISOString() });
    console.log('code', code, 'link', link);

    // #7 What candidates fill in before they start.
    await X.hover('inputs', live.getByText(/Candidate inputs — what candidates fill in/), { settle: 1300, fx: 0.2 });
    await X.click('roll', live.getByRole('textbox', { name: 'Input 2' }), { settle: 300 });
    await X.typed('rolltype', 'Roll No', 90, { slow: false });
    await page.keyboard.press('Tab');
    await sleep(1400);
    await X.hover('inputsdone', live.getByText(/Candidate inputs — what candidates fill in/), { settle: 1500, fx: 0.5 });
  } catch (e) { await fail(e); }
  await rec.stop();
}

/* ── #8 a candidate on a phone ─────────────────────────────────────────── */
// The DPP's answer key (questions are shuffled per candidate, so they are told apart by their text).
const KEY = [[/x-axis/, 'B'], [/accelerates uniformly/, 'A'], [/dropped from a height/, 'C'], [/first half/, 'A'], [/slope of a velocity/, 'C'],
  [/thrown vertically upward/, 'D'], [/A train/, 'B'], [/uniform acceleration/, 'A'], [/area under/, 'A'], [/Two cars/, 'D'], [/velocity of a particle/, 'C'],
  [/ratio of the distances/, 'C'], [/thrown straight up/, 'A']];
async function phone() {
  ({ page } = await session(browser, 'phone'));
  const { code } = state.read();
  await page.goto('https://testoza.com/join', { waitUntil: 'load', timeout: 60000 });
  await page.locator('input').first().waitFor({ timeout: 60000 });
  await sleep(2000);
  rec = new Recorder(page, 'phone');
  await rec.start();
  const visibleButtons = async () => (await page.getByRole('button').filter({ visible: true }).allInnerTexts()).map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' | ');
  try {
    await sleep(1200);
    await X.see('join', null, { settle: 600 });
    await X.click('typecode', page.locator('input').first(), { settle: 400 });
    await X.typed('code6', code.replace(/\D/g, ''), 260);
    await X.see('details', page.getByText('Candidate Details'), { settle: 1200, timeout: 45000 });
    await X.show('x-scroll', page.getByText('Candidate Details'), 0.08);
    const inputs = page.locator('input[type=text], input:not([type])').filter({ visible: true });
    await X.click('name', inputs.nth(0), { settle: 250 });
    await X.typed('nametype', 'Ananya Verma', 85, { slow: false });
    await X.click('rollin', inputs.nth(1), { settle: 250 });
    await X.typed('rolltype2', 'NP-21', 110, { slow: false });
    await page.keyboard.press('Tab').catch(() => {});
    await sleep(500);
    const tick = page.getByRole('checkbox').first();
    if (await tick.isVisible().catch(() => false) && !(await tick.isChecked().catch(() => true))) await X.click('tick', tick, { settle: 600 });
    await X.click('go', page.getByRole('button', { name: /start test/i }), { settle: 300 });
    await X.see('exam', page.getByText(/QUESTION 1/i).first(), { settle: 1800, timeout: 60000 });
    console.log('exam buttons:', await visibleButtons());

    const opt = (L) => page.locator('div.cursor-pointer.rounded-lg.border').filter({ has: page.locator('div.h-7.w-7', { hasText: new RegExp(`^${L}$`) }) }).filter({ visible: true }).first();
    const next = () => page.getByRole('button', { name: /save & next/i }).filter({ visible: true }).first();
    const keyHere = async () => {
      const body = (await page.locator('body').innerText()).split(/OPTIONS/i)[0].replace(/\s+/g, ' '); // KaTeX breaks lines
      const hit = KEY.find(([re]) => re.test(body));
      if (!hit) console.log('no key for:', body.slice(-160));
      return hit?.[1] ?? 'A';
    };
    for (let k = 1; k <= 2; k++) {
      await X.click(`ans${k}`, opt(await keyHere()), { settle: 900, fx: 0.15 });
      await X.click(`next${k}`, next(), { settle: 1300 });
    }

    // Leaves for another app: the page reports hidden → visible, the exam counts a warning.
    const vis = (hidden) => page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await vis(true);
    await sleep(600);
    await vis(false);
    await X.see('violation', page.getByText(/Warning 1\/3/).filter({ visible: true }).first(), { settle: 2600 });
    const warnDlg = page.getByRole('dialog').or(page.getByRole('alertdialog')).filter({ hasText: /Warning 1\/3/ }).last();
    console.log('warning buttons:', await warnDlg.getByRole('button').allInnerTexts().catch(() => []));
    await X.click('warnok', warnDlg.getByRole('button').filter({ visible: true }).last(), { settle: 1200 });

    // The rest of the paper in one fast stretch (the edit plays it sped up): 10 right, 1 wrong,
    // 2 skipped in all → 39 / 52 = 75%.
    if (rec) { const m = rec.mark('rush', { pre: 0, maxRate: 14 }); await m.flagged; }
    const WRONG = { A: 'B', B: 'C', C: 'D', D: 'A' };
    const stem = async () => ((await page.locator('body').innerText()).match(/QUESTION \d+([\s\S]*?)OPTIONS/i) || [])[1]?.trim() ?? '';
    for (let k = 3; k <= 13; k++) {
      const L = await keyHere();
      if (k !== 6 && k !== 10) await opt(k === 8 ? WRONG[L] : L).tap();
      await sleep(350);
      if (k < 13) {
        const was = await stem();
        await next().tap();
        // Answer only once the next question is on screen (else it gets the previous one's key).
        for (let i = 0; i < 25 && (await stem()) === was; i++) await sleep(200);
        await sleep(300);
        const dlg = page.getByRole('dialog').or(page.getByRole('alertdialog')).filter({ visible: true }).last();
        if (await dlg.isVisible().catch(() => false)) { console.log('dialog after next:', (await dlg.innerText()).slice(0, 120).replace(/\s+/g, ' ')); await dlg.getByRole('button').last().tap(); await sleep(700); }
      }
    }
    console.log('before submit:', await visibleButtons());
    await X.click('submit', page.getByRole('button', { name: /submit test/i }).filter({ visible: true }).first(), { settle: 1300 });
    console.log('confirm:', await visibleButtons());
    await X.click('yes', page.getByRole('button', { name: /yes, submit/i }).filter({ visible: true }).last(), { settle: 300 });
    await X.see('score', page.getByText('Test Completed Successfully').first(), { settle: 3500, timeout: 60000 });
    console.log('after submit:', page.url(), '|', await visibleButtons());
    await page.screenshot({ path: 'capture/probe/phone-result.png' });
    await X.click('solkey', page.getByRole('button', { name: /solution key/i }).filter({ visible: true }).first(), { settle: 3000 });
  } catch (e) { console.log('buttons at failure:', await visibleButtons().catch(() => '?')); await fail(e); }
  await rec.stop();
}

/* ── #9–#10 live results, ranks, Excel ─────────────────────────────────── */
async function results() {
  const { testId, liveAt } = state.read();
  let context;
  ({ context, page } = await session(browser, 'desktop'));
  await login(page);
  const st = await stage(context, { testId, liveAt });
  await page.goto(APP + '/dashboard', { waitUntil: 'load', timeout: 60000 });
  await page.getByText('Writing now').filter({ visible: true }).first().waitFor({ timeout: 60000 });
  await sleep(3000);
  await page.mouse.move(1180, 200); page.__pos = { x: 1180, y: 200 };
  rec = new Recorder(page, 'results');
  await rec.start();
  try {
    await sleep(1000);
    await X.see('dash', null, { settle: 1500 });
    await X.hover('writing', page.getByText('Writing now').filter({ visible: true }).first(), { settle: 1300 });
    await X.hover('subm', page.getByText(/^Submitted/).filter({ visible: true }).first(), { settle: 1300 });
    await X.click('panel', page.getByRole('button', { name: /^results/i }).filter({ visible: true }).first(), { settle: 300 });
    await X.see('panelopen', page.getByText(/^test results$/i).first(), { settle: 300 });
    await page.getByText(/fetching results/i).first().waitFor({ state: 'hidden', timeout: 30000 });
    await sleep(1200);
    rec.marks.at(-1).end = +rec.now().toFixed(3);
    const tile = (re) => page.getByText(re).filter({ visible: true }).last();
    await X.hover('started', tile(/^started$/i), { settle: 900, ms: 500 });
    await X.hover('writ', tile(/^writing now$/i), { settle: 900, ms: 500 });
    await X.hover('two', tile(/^submitted$/i), { settle: 900, ms: 500 });
    await X.hover('zero', tile(/^dropped$/i), { settle: 900, ms: 500 });
    await X.click('names', tile(/^writing now$/i), { settle: 2600 });
    await page.keyboard.press('Escape');
    await sleep(1200);

    // ── Later: everyone has submitted.
    st.setPhase('done');
    await X.click('reopen', page.getByRole('button', { name: /^results/i }).filter({ visible: true }).first(), { settle: 300 });
    await page.getByText(/fetching results/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await page.getByText(/fetching results/i).first().waitFor({ state: 'hidden', timeout: 30000 });
    await X.see('all', null, { settle: 2000 });
    await X.click('rank', page.getByRole('switch').filter({ visible: true }).first(), { settle: 1600 });
    const t1 = rec.now();
    await page.mouse.move(1100, 600); page.__pos = { x: 1100, y: 600 };
    await page.mouse.wheel(0, 500); await sleep(900); await page.mouse.wheel(0, 500);
    rec.mark('scrolllist', { pre: +(rec.now() - t1).toFixed(3) });
    await sleep(1500);
    await page.mouse.wheel(0, -1000); await sleep(800);
    const dl = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    await X.click('export', page.getByRole('button', { name: /excel/i }).filter({ visible: true }).first(), { settle: 3500 });
    const file = await dl;
    console.log('download', file ? file.suggestedFilename() : 'none');
  } catch (e) { await fail(e); }
  await rec.stop();
}

/** Off camera, after `build`: a timed section only opens when the one before runs out of time, so the
 *  phone candidate could never reach Section B. The sections stay; their own timers go off. */
async function untime() {
  ({ page } = await session(browser, 'desktop'));
  const { testId } = state.read();
  await login(page);
  await page.goto(`${APP}/edit-test/${testId}`, { waitUntil: 'load', timeout: 60000 });
  await card(page, 11).waitFor({ timeout: 60000 });
  await sleep(2500);
  const t = page.getByRole('switch', { name: 'Time each section' });
  if ((await t.getAttribute('aria-checked')) === 'true') { await t.click(); await sleep(1000); }
  console.log('time each section:', await t.getAttribute('aria-checked'));
  // Autosave doesn't fire for this switch alone (not in its dependency list), so save by hand.
  await page.getByRole('button', { name: /Save changes|Save test/ }).filter({ visible: true }).last().click();
  await page.waitForURL(/my-tests/, { timeout: 60000 }).catch(() => console.log('no redirect after save'));
  await sleep(2000);
}

const takes = { ai, build, conduct, phone, untime, results };
if (!takes[take]) { console.error('unknown take', take); process.exit(1); }
await takes[take]();
await browser.close();
