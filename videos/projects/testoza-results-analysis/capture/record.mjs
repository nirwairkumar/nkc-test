// Recording takes for "Understanding Results". Mark ids = the {cue} names in SCRIPT-en.md; ids that
// start with "x-" are in-between moves (no cue). Real app.testoza.com, signed in as the demo educator,
// with the class staged in this browser only (stage.mjs).
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/record.mjs panel|report|all
//   panel  — L07–L15: My Tests → Results panel → tiles, Dropped, Submitted, Rank, filter, Excel, search, Jyoti's answer sheet → Full report
//   report — L16–L28: the Full report from the top: class, spread, rank list, Teach these again (Q13, Q15, Q9), sections, sending
//   all    — L29: All Submissions: four mocks, the climb, Mock 13 waiting
import { launch, session, login, Recorder, act, appear, sleep, state, APP } from './rec-lib.mjs';
import { stage } from './stage.mjs';

const take = process.argv[2];
const browser = await launch();
let page, context, rec = null;
const fail = async (e) => { await page.screenshot({ path: `capture/rec/FAIL-${take}.png` }).catch(() => {}); console.error('FAIL', e.message.split('\n').slice(0, 3).join(' | ')); };

/** Action helpers: on camera (rec set) every move leaves a mark; off camera they just happen. */
const X = {
  async click(id, loc, o = {}) {
    if (!rec) { await loc.click(); await sleep(o.fastSettle ?? 300); return null; }
    return act(page, rec, id, loc, o);
  },
  async hover(id, loc, o = {}) { if (rec) return act(page, rec, id, loc, { settle: 900, ...o, hover: true }); },
  async see(id, loc, o = {}) { if (rec) return appear(page, rec, id, loc, o); if (loc) await loc.waitFor({ timeout: o.timeout ?? 20000 }); },
  async typed(id, text, delay = 90) {
    const m = rec.mark(id, { pre: 0, slow: true });
    await m.flagged;
    await page.keyboard.type(text, { delay });
    await sleep(500);
    m.end = +rec.now().toFixed(3);
  },
  /** Smooth scroll so `loc` sits `ratio` of the way down the window (or inside its scroller); a mark when it lands. */
  async show(id, loc, ratio = 0.15) {
    const t1 = rec ? rec.now() : 0;
    await loc.evaluate((el, r) => {
      let sc = el.parentElement;
      while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      if (sc && sc !== document.body && sc !== document.documentElement) {
        const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - sc.clientHeight * r;
        sc.scrollTo({ top, behavior: 'smooth' });
      } else {
        const top = el.getBoundingClientRect().top + window.scrollY - Math.max(window.innerHeight * r, 80);
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, ratio);
    await sleep(rec ? 1200 : 500);
    if (rec && id) { const m = rec.mark(id, { pre: +(rec.now() - t1).toFixed(3), box: await loc.boundingBox() }); await m.flagged; await sleep(500); m.end = +rec.now().toFixed(3); }
  },
};
const vis = (loc) => loc.filter({ visible: true }).first();

async function open() {
  ({ context, page } = await session(browser, 'desktop'));
  await context.addInitScript('window.print = () => {};');
  await context.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
  context.on('page', (p) => { if (p !== page) setTimeout(() => p.close().catch(() => {}), 300); });
  await login(page);
  const s = state.read();
  await stage(context, { testId: s.testId, userId: s.userId });
  return s;
}
async function start(name, x = 1180, y = 300) {
  await page.mouse.move(x, y); page.__pos = { x, y };
  rec = new Recorder(page, name);
  await rec.start();
  await sleep(900);
}

/* ── Page 1: the Results panel ─────────────────────────────────────────── */
async function panel() {
  await open();
  await page.goto(APP + '/my-tests', { waitUntil: 'load', timeout: 60000 });
  await page.getByRole('heading', { name: 'All tests' }).waitFor({ timeout: 60000 });
  await sleep(5000);
  const gotIt = page.getByRole('button', { name: /^got it$/i }).first();
  if (await gotIt.isVisible().catch(() => false)) { await gotIt.click(); await sleep(800); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(800);
  await start('panel', 900, 420);
  try {
    await X.see('mytests', page.getByRole('heading', { name: 'My Tests' }), { settle: 1200 });
    await X.click('ended', page.getByText('Ended exams').first(), { settle: 1500 });
    await X.hover('sidebar', vis(page.getByText('All Submissions')), { settle: 1400 });
    await X.hover('start', vis(page.getByText('SSC CGL Weekly Mock 12')).first(), { settle: 900 });
    await X.click('results', vis(page.getByRole('button', { name: /^results/i })), { settle: 300 });
    await page.getByText(/fetching results/i).first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await sleep(1500);
    const header = page.getByText(/^test results$/i).first();
    await X.hover('header', page.getByText('Exam ended').first(), { settle: 1100 });
    await X.hover('facts', page.getByText('20 questions · 40 marks · 20 min').first(), { settle: 1100 });
    const tile = (re) => page.getByRole('tab', { name: re }).first();
    await X.hover('tiles', page.getByRole('tablist', { name: 'Candidates' }), { settle: 900, fx: 0.5, fy: 0.9 });
    await X.hover('started', tile(/started/i), { settle: 1000 });
    await X.hover('writing', tile(/writing now/i), { settle: 1000 });
    await X.hover('submitted', tile(/submitted/i), { settle: 1000 });
    await X.hover('dropped', tile(/dropped/i), { settle: 1000 });
    // Who dropped
    await X.click('droptab', tile(/dropped/i), { settle: 1400 });
    await X.hover('answered', page.getByText('14/20').first(), { settle: 1100 });
    await X.hover('akash', page.getByText('Akash Jat').first(), { settle: 1200 });
    await X.hover('sonal', page.getByText('Sonal Mehra').first(), { settle: 1200 });
    await X.hover('x-sonalbar', page.getByText(/no activity since/i).first(), { settle: 900 });
    // The list (newest first: blue and red badges side by side)
    await X.click('subtab', tile(/submitted/i), { settle: 1500 });
    await X.hover('avgline', page.getByText(/^average$/i).first(), { settle: 1100 });
    const rows = page.locator('table tbody tr');
    await X.hover('score', rows.first().locator('td').nth(1), { settle: 1100 });
    const red = page.locator('table tbody .bg-destructive').first();
    await X.hover('colour', red, { settle: 1300 });
    await X.hover('answers', page.locator('table div[title="Correct · Wrong · Skipped"]').first(), { settle: 1200 });
    await X.hover('time', rows.first().locator('td').nth(3), { settle: 1100 });
    // Ranks and ties
    await X.click('rank', vis(page.getByRole('switch')), { settle: 1300 });
    await X.hover('info', page.locator('label[for="rank-mode"] + svg').first(), { settle: 2600 });
    await X.hover('x-rules', page.locator('label[for="rank-mode"] + svg').first(), { settle: 1500, fx: 0.6 });
    await page.mouse.move(1100, 300); await page.keyboard.press('Escape'); await sleep(500); // close the rules tooltip
    await X.hover('tie', page.getByRole('row', { name: /Sneha Patil/ }).locator('td').nth(2), { settle: 1500 });
    await X.hover('sneha', page.getByRole('row', { name: /Sneha Patil/ }).locator('td').nth(5), { settle: 1100 });
    await X.hover('x-rahul', page.getByRole('row', { name: /Rahul Verma/ }).locator('td').nth(5), { settle: 1300 });
    // Filter, Excel, search
    await X.click('filter', page.getByRole('button', { name: 'Filter by submitted' }), { settle: 1800 });
    await page.keyboard.press('Escape'); await sleep(600);
    const dl = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    await X.click('excel', vis(page.getByRole('button', { name: /^excel$/i })), { settle: 2200 });
    console.log('download', (await dl)?.suggestedFilename() ?? 'none');
    await X.hover('reg2', vis(page.getByRole('button', { name: /^excel$/i })), { settle: 900, fx: 0.3 });
    await X.click('search', page.getByLabel('Search candidates'), { settle: 300 });
    await X.typed('x-jyoti', 'Jyoti', 120);
    await sleep(800);
    // Jyoti's answer sheet
    await X.click('open', page.getByRole('row', { name: /Jyoti Bisht/ }).getByRole('button', { name: 'View result' }), { settle: 300 });
    await page.getByText(/analyzing results/i).first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await sleep(1200);
    const dlg = page.getByRole('dialog');
    await X.hover('jyoti', dlg.getByText('Total Marks Obtained').first(), { settle: 1500, fy: 2.2 });
    await X.show('subjects', dlg.getByText('Subject Breakdown'), 0.08);
    // A subject card: the innermost div holding both its name and the Correct/Wrong/Skipped boxes.
    const subj = async (name) => {
      await page.evaluate((name) => {
        const all = [...document.querySelectorAll('[role=dialog] div')].filter((d) => d.textContent.trim().startsWith(name) && /correct/i.test(d.textContent));
        all.sort((a, b) => a.textContent.length - b.textContent.length);
        if (all[0]) all[0].setAttribute('data-tz', name);
      }, name);
      return page.locator(`[data-tz="${name}"]`);
    };
    await X.hover('english', await subj('English'), { settle: 1300 });
    await X.hover('quant', await subj('Quantitative Aptitude'), { settle: 1500 });
    await X.click('topics', dlg.getByRole('button', { name: 'Topic Performance' }), { settle: 200 });
    await dlg.locator('.overflow-y-auto').first().evaluate((el) => el.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(1700);
    await X.click('qb', dlg.getByRole('button', { name: 'Questions breakdown' }), { settle: 1300 });
    await X.hover('secs', dlg.getByText(/^\d+m?\s?\d*s$/).nth(1), { settle: 1500 });
    await X.hover('likecopy', dlg.getByText(/^-0\.5 \/ 2$/).first(), { settle: 1500 });
    // → Full report
    await X.click('who', vis(dlg.getByRole('button', { name: /^close$/i })), { settle: 1300 });
    await X.hover('whyq', page.locator('table tbody tr').first().locator('td').nth(2), { settle: 900 });
    await page.getByLabel('Search candidates').fill(''); await sleep(500);
    await X.click('full', vis(page.getByRole('button', { name: /full report/i })), { settle: 300 });
    await page.getByText('How the class did').waitFor({ timeout: 60000 });
    await X.see('x-report', null, { settle: 1500 });
  } catch (e) { await fail(e); }
  await rec.stop();
}

/* ── Page 2: the Full report ───────────────────────────────────────────── */
async function report() {
  const { testId } = await open();
  await page.goto(`${APP}/analytics/full?testId=${testId}`, { waitUntil: 'load', timeout: 60000 });
  await page.getByText('How the class did').waitFor({ timeout: 60000 });
  await sleep(4000);
  await start('report', 1300, 300);
  try {
    await X.see('report', page.getByRole('heading', { name: 'SSC CGL Weekly Mock 12' }), { settle: 1200 });
    await X.hover('meta', page.getByText(/48 candidates · Written/).first(), { settle: 1300 });
    const stat = (label) => page.locator('dl > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).first();
    await X.hover('class', page.getByRole('heading', { name: 'How the class did' }), { settle: 1000 });
    await X.hover('avg', stat('Average'), { settle: 1300 });
    await X.hover('high', stat('Highest'), { settle: 1100 });
    await X.hover('low', stat('Lowest'), { settle: 1000 });
    await X.hover('help', stat('Needs help'), { settle: 1300 });
    const chart = page.getByRole('img', { name: /0–19%/ });
    await X.hover('spread', page.getByText('How the marks spread'), { settle: 1100 });
    const bar = (i) => chart.locator(':scope > div').nth(i);
    await X.hover('bars', bar(0), { settle: 900 });
    await X.hover('x-bar1', bar(1), { settle: 700 });
    await X.hover('colours', bar(1), { settle: 700, fy: 0.8 });
    await X.hover('x-bar2', bar(2), { settle: 700 });
    await X.hover('x-bar4', bar(3), { settle: 900 });
    // (L19 is a 2D scene; the take continues on the same page)
    await X.hover('ours', chart, { settle: 1500 });
    await X.hover('plain', page.locator('ul').filter({ hasText: 'came first' }).first(), { settle: 1600 });
    // Rank list
    await X.show('ranklist', page.locator('#ranks-heading'), 0.1);
    await X.click('below', page.getByRole('tab', { name: /Below 40%/ }), { settle: 1500 });
    await X.hover('callthem', page.locator('ol > li').nth(1), { settle: 1500 });
    await X.click('roll', page.getByPlaceholder('Search name or roll no'), { settle: 300 });
    await X.typed('x-roll', 'CGL-2', 140);
    await sleep(900);
    await X.click('tap', page.locator('ol > li button').first(), { settle: 300 });
    await page.getByText(/analyzing results/i).first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await X.see('x-sheet', page.getByText('Total Marks Obtained').first(), { settle: 1800 });
    await page.keyboard.press('Escape'); await sleep(700);
    await page.getByPlaceholder('Search name or roll no').fill(''); await sleep(300);
    await page.getByRole('tab', { name: /Everyone/ }).click(); await sleep(500);
    // Teach these again (the right column is sticky)
    await X.show('teach', page.locator('h1'), 0.3);
    const aside = page.locator('aside');
    await X.hover('again', aside.getByRole('heading', { name: 'Teach these again' }), { settle: 1300 });
    await X.hover('monday', aside.getByText('Fewer than half got these right'), { settle: 1000 });
    await X.hover('five', aside.locator('ul').first(), { settle: 1300 });
    // Q13: the trap
    await X.click('q13', aside.getByRole('button', { name: /^Q13/ }), { settle: 1700 });
    const opt = (q, k) => page.locator(`#report-q-${q} ul > li`).nth(k);
    await X.hover('answer', opt(13, 0), { settle: 1300 });
    await X.hover('trap', opt(13, 1), { settle: 1600 });
    await X.hover('added', opt(13, 1), { settle: 1000, fx: 0.9 });
    await X.hover('concept', page.locator('#report-q-13').getByText(/^A shopkeeper/), { settle: 1300 });
    await X.hover('example', page.locator('#report-q-13').getByText(/11 right/), { settle: 1200 });
    // Q15: left blank
    // Q15 and Q9 from the question list itself (the tall right column would make the page jump twice).
    const qrow = (n) => page.locator(`#report-q-${n} > button`);
    await X.show('x-q15', qrow(14), 0.35);
    await X.click('q15', qrow(15), { settle: 1500 });
    await X.show('x-q15b', qrow(15), 0.2);
    await X.hover('grey', page.locator('#report-q-15 > button span.bg-slate-300').first(), { settle: 1500 });
    await X.hover('never', page.locator('#report-q-15').getByText(/left blank/).last(), { settle: 1500 });
    await X.hover('two', page.locator('#report-q-15').getByText(/^A can finish/), { settle: 1300 });
    // Q9: guessing
    await X.show('x-q9', qrow(9), 0.2);
    await X.click('q9', qrow(9), { settle: 1700 });
    await X.hover('even', page.locator('#report-q-9 ul'), { settle: 1500 });
    await X.hover('guess', opt(9, 2), { settle: 1100 });
    await X.hover('revise', page.locator('#report-q-9').getByText(/14 right/), { settle: 1200 });
    // (L26 is a 2D scene) Hardest first, by section
    await X.show('x-qhead', page.locator('#questions-heading'), 0.12);
    await X.click('hardest', page.getByRole('tab', { name: 'Hardest first' }), { settle: 1600 });
    const sec = (name) => aside.locator('li').filter({ hasText: name }).first();
    await X.hover('section', aside.getByRole('heading', { name: 'By section' }), { settle: 1100 });
    await X.hover('reasoning', sec('Reasoning'), { settle: 900 });
    await X.hover('eng2', sec('English'), { settle: 900 });
    await X.hover('ga', sec('General Awareness'), { settle: 900 });
    await X.hover('quant2', sec('Quantitative Aptitude'), { settle: 1300 });
    await X.hover('extra', sec('Quantitative Aptitude'), { settle: 1000, fx: 0.85 });
    // Sending it out
    await X.show('share', page.locator('h1'), 0.3);
    await X.click('send', page.getByRole('link', { name: /send rank list/i }), { settle: 1500 });
    await X.hover('choose', page.getByRole('link', { name: /send rank list/i }), { settle: 900, fx: 0.2 });
    await X.click('copyb', page.getByRole('button', { name: /^copy$/i }), { settle: 1500 });
    await X.click('excel2', page.getByRole('button', { name: /^excel$/i }), { settle: 1800 });
    await X.click('print', page.getByRole('button', { name: /^print$/i }), { settle: 1800 });
  } catch (e) { await fail(e); }
  await rec.stop();
}

/* ── All Submissions ───────────────────────────────────────────────────── */
async function all() {
  const { testId } = await open();
  await page.goto(`${APP}/analytics/full?testId=${testId}`, { waitUntil: 'load', timeout: 60000 });
  await page.getByText('How the class did').waitFor({ timeout: 60000 });
  await sleep(3000);
  await start('all', 900, 300);
  try {
    await X.click('allsub', vis(page.getByText('All Submissions')), { settle: 300 });
    await page.getByText('Exams your candidates wrote').waitFor({ timeout: 60000 });
    await sleep(1200);
    await X.see('list', page.getByText('Exams your candidates wrote'), { settle: 1300 });
    const row = (n) => page.locator('li').filter({ hasText: `SSC CGL Weekly Mock ${n}` }).first();
    const badge = (n) => row(n).locator('span.rounded-\\[13px\\]').first();
    await X.hover('badge', badge(12), { settle: 1300 });
    await X.hover('bar', row(12).locator('span[aria-hidden="true"]').first(), { settle: 1400 });
    await X.hover('trend', row(9), { settle: 900, fx: 0.25 });
    await X.hover('t46', badge(9), { settle: 700 });
    await X.hover('t48', badge(10), { settle: 700 });
    await X.hover('t50', badge(11), { settle: 700 });
    await X.hover('t54', badge(12), { settle: 1100 });
    await X.hover('up', page.getByText(/answer sheets from 4 exams/), { settle: 1200 });
    await X.hover('proof', page.locator('aside dl').first(), { settle: 1300 });
    await X.hover('next', page.getByRole('button', { name: /start exam/i }).first(), { settle: 1800 });
  } catch (e) { await fail(e); }
  await rec.stop();
}

const TAKES = { panel, report, all };
if (!TAKES[take]) { console.error('take?', Object.keys(TAKES).join('|')); process.exit(1); }
await TAKES[take]();
await browser.close();
