// Recording takes for the "Branding Tests" Short. Mark ids = the {cue} names in SCRIPT-en.md; ids that
// start with "x-" are in-between actions (no cue). Real app.testoza.com, signed in as the demo educator.
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/record.mjs build|conduct|desk|phone
//   build   — new test: name → Institution branding (logo, name, colour, font) → 3 questions, fast → Save
//   conduct — My Tests → Conduct exam → live → copy link → join code
//   desk    — a candidate on a laptop opens the link → details → the exam, branded
//   phone   — a candidate on a phone: testoza.com/join → code → the branded check-in card → the exam
import { launch, session, login, Recorder, act, appear, sleep, state, APP } from './rec-lib.mjs';
import { card, box, openCreate } from './builder.mjs';

const take = process.argv[2];
const TITLE = 'Physics Weekly Test 5';
const LOGO = 'capture/paper/apex-academy-logo.png';
const browser = await launch();
let page, rec = null;
const fail = async (e) => { await page.screenshot({ path: `capture/rec/FAIL-${take}.png` }).catch(() => {}); console.error('FAIL', e.message.split('\n').slice(0, 3).join(' | ')); };
const visibleButtons = async () => (await page.getByRole('button').filter({ visible: true }).allInnerTexts()).map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' | ');

/** Action helpers: on camera (rec set) every move leaves a mark; off camera they just happen. */
const X = {
  async click(id, loc, o = {}) {
    if (!rec) { await loc.click(); await sleep(o.fastSettle ?? 300); return null; }
    return act(page, rec, id, loc, o);
  },
  async hover(id, loc, o = {}) { if (rec) return act(page, rec, id, loc, { settle: 900, ...o, hover: true }); },
  async see(id, loc, o = {}) { if (rec) return appear(page, rec, id, loc, o); if (loc) await loc.waitFor({ timeout: o.timeout ?? 20000 }); },
  /** Type with a mark at the first key; the mark's result runs to the last key. */
  async typed(id, text, delay, { slow = true, boxOf, tag = {} } = {}) {
    if (!rec) { await page.keyboard.type(text, { delay: 6 }); return; }
    const b = boxOf ? await boxOf.boundingBox() : undefined;
    const m = rec.mark(id, { pre: 0, box: b, slow, ...tag });
    await m.flagged;
    await page.keyboard.type(text, { delay });
    await sleep(250);
    m.end = +rec.now().toFixed(3);
  },
  /** Smooth scroll so `loc` sits `ratio` of the way down the window; a mark when it lands. */
  async show(id, loc, ratio = 0.15) {
    const t1 = rec ? rec.now() : 0;
    await loc.evaluate((el, r) => {
      const top = el.getBoundingClientRect().top + window.scrollY - Math.max(window.innerHeight * r, 80);
      window.scrollTo({ top, behavior: 'smooth' });
    }, ratio);
    await sleep(rec ? 1000 : 400);
    if (rec && id) { const m = rec.mark(id, { pre: +(rec.now() - t1).toFixed(3), box: await loc.boundingBox(), scroll: true }); await m.flagged; await sleep(300); m.end = +rec.now().toFixed(3); }
  },
};

/* ── Builder: branding, then questions in a fast flow ─────────────────── */
const QS = [
  { q: 'The SI unit of force is', o: ['newton', 'joule', 'watt', 'pascal'], a: 'A' },
  { q: 'Which of these is a vector quantity?', o: ['Mass', 'Speed', 'Velocity', 'Time'], a: 'C' },
  { q: 'Speed of light in vacuum is about', o: ['3 × 10⁶ m/s', '3 × 10⁸ m/s', '3 × 10⁵ m/s', '3 × 10¹⁰ m/s'], a: 'B' },
];
async function into(id, loc, o = {}) {
  await X.click(id, loc, { settle: 200, ms: 380, ...o });
  await loc.locator('textarea, input').first().focus().catch(() => {});
  await page.keyboard.press('Control+End');
  await sleep(120);
}
async function build() {
  ({ page } = await session(browser, 'desktop'));
  await login(page);
  await openCreate(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(1000, 420); page.__pos = { x: 1000, y: 420 };
  rec = new Recorder(page, 'build');
  await rec.start();
  try {
    await sleep(900);
    const titleBox = page.getByPlaceholder(/e\.g\. Class 10 Science/);
    await X.click('title', titleBox, { settle: 250 });
    await X.typed('titletype', TITLE, 34, { slow: false, boxOf: titleBox, tag: { maxRate: 3 } });

    // Branding.
    const row = page.getByText('Institution branding').first();
    await X.show('x-down', row, 0.3);
    await X.click('branding', row, { settle: 1100 });
    const drop = page.locator('label:has(input[type=file][accept="image/*"])').first();
    await X.hover('x-logo', drop, { settle: 250 });
    const lg = rec.mark('logo', { pre: 0, box: await drop.boundingBox(), drop: true });
    await lg.flagged;
    await page.locator('input[type=file][accept="image/*"]').first().setInputFiles(LOGO);
    await page.locator('label:has(input[type=file]) img').first().waitFor({ timeout: 10000 });
    await sleep(1100);
    lg.end = +rec.now().toFixed(3);
    const nameBox = page.getByLabel('Institution name');
    await X.click('name', nameBox, { settle: 200 });
    await X.typed('nametype', 'Apex Academy', 75, { slow: true, boxOf: nameBox });
    await sleep(400);
    await X.click('color', page.getByLabel('Colour #2563eb'), { settle: 1000 });
    const font = page.locator('select').filter({ has: page.locator('option[value="serif"]') });
    const fm = await X.hover('font', font, { settle: 120 });
    if (fm) fm.hover = false; // drawn as a click; the native list never paints in a screencast
    await font.selectOption("'Georgia', serif");
    await sleep(1300);
    if (fm) fm.end = +rec.now().toFixed(3);
    await X.hover('branded', page.getByText('Institution branding').first(), { settle: 900, fx: 0.15 });

    // Questions, fast.
    await X.show('x-qs', page.locator('#questions-heading'), 0.12);
    for (const [n, Q] of QS.entries()) {
      if (n > 0) {
        const add = page.getByRole('button', { name: /^Add question/ }).filter({ visible: true }).last();
        await X.click(`add${n + 1}`, add, { settle: 500, ms: 380 });
        await X.show(null, card(page, n), 0.16);
      }
      await into(`q${n + 1}`, box(page, n, 0));
      await X.typed(`q${n + 1}t`, Q.q, 22, { slow: false, boxOf: box(page, n, 0), tag: { maxRate: 3.5 } });
      for (let k = 0; k < 4; k++) {
        await into(`x-o${n + 1}${k}`, box(page, n, k + 1), { settle: 120 });
        await X.typed(`x-ot${n + 1}${k}`, Q.o[k], 22, { slow: false, tag: { maxRate: 3.5 } });
      }
      await X.click(`right${n + 1}`, card(page, n).getByLabel(`Mark option ${Q.a} as correct`), { settle: 650, ms: 380 });
    }
    await sleep(400);
    await X.click('save', page.getByRole('button', { name: /^Save test$/ }).filter({ visible: true }).last(), { settle: 300, tag: { maxRate: 10 } });
    await X.see('mytests', page.getByRole('heading', { name: 'All tests' }), { settle: 2200, timeout: 60000 });
    const t = page.getByRole('heading', { name: TITLE }).filter({ visible: true }).first();
    if (await t.isVisible().catch(() => false)) await X.hover('newcard', t, { settle: 2000 });
    state.write({ title: TITLE, builtAt: new Date().toISOString() });
  } catch (e) { await fail(e); }
  await rec.stop();
}

/* ── Conduct: go live, link, join code ─────────────────────────────────── */
async function openMyTests() {
  await page.goto(APP + '/my-tests', { waitUntil: 'load', timeout: 60000 });
  await page.getByRole('heading', { name: 'All tests' }).waitFor({ timeout: 60000 });
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
const liveCard = (title) => page.locator('li', { has: page.getByRole('button', { name: /stop exam/i }) }).filter({ hasText: title }).first();
async function conduct() {
  ({ page } = await session(browser, 'desktop'));
  const { title } = state.read();
  await login(page);
  await openMyTests();
  const c = await tagCard(title);
  await c.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await sleep(800);
  await page.mouse.move(1150, 260); page.__pos = { x: 1150, y: 260 };
  rec = new Recorder(page, 'conduct');
  await rec.start();
  try {
    await sleep(900);
    await X.click('conduct', c.getByRole('button', { name: /conduct exam/i }).filter({ visible: true }).first(), { settle: 1300 });
    const dlg = page.getByRole('dialog').filter({ hasText: 'Conduct Online Exam' });
    await X.click('start', dlg.getByRole('button', { name: /start conducting/i }), { settle: 200 });
    await X.see('live', page.getByText('Exam is now live.'), { settle: 1400 });
    const live = liveCard(title);
    await X.show(null, live, 0.1);
    await X.click('copy', live.getByRole('button', { name: /copy link/i }), { settle: 1100 });
    const link = await page.evaluate(() => navigator.clipboard.readText());
    await X.click('menu', live.getByRole('button', { name: /more options/i }).first(), { settle: 900 });
    await X.click('getcode', page.getByRole('menuitem', { name: /join code/i }), { settle: 300 });
    const codeEl = live.getByText(/^\d{3} \d{3}$/).first();
    await codeEl.waitFor();
    await X.hover('code', codeEl, { settle: 2200 });
    const code = (await codeEl.innerText()).trim();
    state.write({ code, link: (link.match(/https?:\/\/\S+/) || [])[0], liveAt: new Date().toISOString() });
    console.log('code', code, 'link', link);
  } catch (e) { await fail(e); }
  await rec.stop();
}

/* ── Candidates ────────────────────────────────────────────────────────── */
const opt = (L) => page.locator('div.cursor-pointer.rounded-lg.border').filter({ has: page.locator('div.h-7.w-7', { hasText: new RegExp(`^${L}$`) }) }).filter({ visible: true }).first();
const KEY = [[/SI unit of force/, 'A'], [/vector quantity/, 'C'], [/Speed of light/, 'B']];
const keyHere = async () => {
  const body = (await page.locator('body').innerText()).split(/OPTIONS/i)[0].replace(/\s+/g, ' ');
  return KEY.find(([re]) => re.test(body))?.[1] ?? 'A';
};
/** Fill every visible candidate input (Name first) and start. */
async function details(name, roll) {
  const inputs = page.locator('input[type=text], input:not([type])').filter({ visible: true });
  const n = await inputs.count();
  for (let i = 0; i < n; i++) {
    await X.click(i === 0 ? 'cname' : `x-in${i}`, inputs.nth(i), { settle: 220 });
    await X.typed(i === 0 ? 'cnametype' : `x-int${i}`, i === 0 ? name : roll, 60, { slow: false, tag: { maxRate: 3 } });
  }
  await page.keyboard.press('Tab').catch(() => {});
  await sleep(300);
  const tick = page.getByRole('checkbox').first();
  if (await tick.isVisible().catch(() => false) && !(await tick.isChecked().catch(() => true))) await X.click('x-tick', tick, { settle: 400 });
}
async function answer(k) {
  await X.click(`ans${k}`, opt(await keyHere()), { settle: 700, fx: 0.15 });
  await X.click(`next${k}`, page.getByRole('button', { name: /save & next/i }).filter({ visible: true }).first(), { settle: 1100 });
}

async function desk() {
  ({ page } = await session(browser, 'desktop'));
  const { link } = state.read();
  await page.goto(link, { waitUntil: 'load', timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: 'capture/probe/desk-0.png' });
  console.log('desk buttons:', await visibleButtons());
  await page.mouse.move(900, 500); page.__pos = { x: 900, y: 500 };
  rec = new Recorder(page, 'desk');
  await rec.start();
  try {
    await sleep(900);
    await X.see('dopen', null, { settle: 900 });
    await details('Rohan Mehta', 'AA-17');
    await page.screenshot({ path: 'capture/probe/desk-1.png' });
    console.log('before start:', await visibleButtons());
    await X.click('dgo', page.getByRole('button', { name: /start (test|exam)/i }).filter({ visible: true }).first(), { settle: 300 });
    await X.see('dexam', page.getByText(/QUESTION 1/i).first(), { settle: 1500, timeout: 60000 });
    await page.screenshot({ path: 'capture/probe/desk-2.png' });
    await X.hover('dbrand', page.getByAltText('Institution Logo').first(), { settle: 1800 });
    await answer(1);
    await answer(2);
    await sleep(900);
  } catch (e) { console.log('buttons at failure:', await visibleButtons().catch(() => '?')); await fail(e); }
  await rec.stop();
}

async function phone() {
  ({ page } = await session(browser, 'phone'));
  const { code } = state.read();
  await page.goto('https://testoza.com/join', { waitUntil: 'load', timeout: 60000 });
  await page.locator('input').first().waitFor({ timeout: 60000 });
  await sleep(2000);
  rec = new Recorder(page, 'phone');
  await rec.start();
  try {
    await sleep(1000);
    await X.see('join', null, { settle: 500 });
    await X.click('typecode', page.locator('input').first(), { settle: 350 });
    await X.typed('code6', code.replace(/\D/g, ''), 200);
    // A join code opens the test's start page (no branding there yet: the brand shows in the exam).
    await X.see('pdetails', page.getByText('Candidate Details'), { settle: 900, timeout: 45000 });
    await details('Ananya Verma', 'AA-21');
    await X.click('pgo', page.getByRole('button', { name: /start test/i }), { settle: 300 });
    await X.see('pexam', page.getByText(/QUESTION 1/i).first(), { settle: 600, timeout: 60000 });
    await X.hover('pbrand', page.getByAltText('Institution Logo').first(), { settle: 1800 });
    await page.screenshot({ path: 'capture/probe/phone-2.png' });
    await answer(1);
    await answer(2);
    await sleep(800);
  } catch (e) { console.log('buttons at failure:', await visibleButtons().catch(() => '?')); await fail(e); }
  await rec.stop();
}

try {
  await ({ build, conduct, desk, phone })[take]();
} finally {
  await browser.close();
}
