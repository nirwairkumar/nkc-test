// Recording takes for the chemistry tutorial. Mark ids = the {cue} names in SCRIPT-en.md; ids that
// start with "x-" are in-between actions (no cue). Each take first rebuilds the earlier questions
// off camera at full speed, so a take can be redone on its own.
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/record.mjs a|b|c|d|e|f
//   a = details + Q1 + Q2 · b = Q3 · c = Q4 · d = Q5 · e = Q6 (photo) · f = save + candidate view
// Nothing is saved to the account except by take f (one test, "JEE 2026 Chemistry — Practice Test").
import { launch, session, login, Recorder, act, appear, sleep, state, APP, TITLE } from './rec-lib.mjs';
import { card, box, pad, code, key, tab, padInsert, tableInsert, arrowInsert, slots, CROPS } from './builder.mjs';

const take = process.argv[2];
const browser = await launch();
const { page } = await session(browser, 'desktop');
const fail = async (e) => { await page.screenshot({ path: `capture/rec/FAIL-${take}.png` }).catch(() => {}); console.error('FAIL', e.message.split('\n').slice(0, 3).join(' | ')); };

/** Action helpers: on camera (rec set) every move glides and leaves a mark; off camera they just happen. */
let rec = null;
const X = {
  async click(id, loc, o = {}) {
    if (!rec) { await loc.click(); await sleep(o.fastSettle ?? 250); return null; }
    return act(page, rec, id, loc, o);
  },
  async hover(id, loc, o = {}) { if (rec) return act(page, rec, id, loc, { settle: 900, ...o, hover: true }); },
  /** Mark (no cursor move) at the moment something shows. */
  async see(id, loc, o = {}) { if (rec) return appear(page, rec, id, loc, o); },
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
  async type(text, delay = 30) { await page.keyboard.type(text, { delay: rec ? delay : 6 }); },
  async wait(ms) { await sleep(rec ? ms : Math.min(ms, 400)); },
  /** Click into a text box and put the caret at its end. */
  async into(id, loc, o = {}) {
    await X.click(id, loc, { settle: 250, ...o });
    const ta = loc.locator('textarea, input').first();
    await ta.focus().catch(() => {});
    await page.keyboard.press('Control+End');
    await sleep(150);
  },
  /** Bring a card into view (smoothly on camera). */
  async show(loc, ratio = 0.12) {
    await loc.evaluate((el, r) => {
      const top = el.getBoundingClientRect().top + window.scrollY - Math.max(window.innerHeight * r, 80);
      window.scrollTo({ top, behavior: 'smooth' });
    }, ratio);
    await sleep(rec ? 1000 : 400);
  },
};
const padBox = () => code(page).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
const done = () => X.click('x-done', pad(page).getByRole('button', { name: 'Done', exact: true }), { settle: 600 });
const right = (id = 'x-right', o = {}) => X.click(id, pad(page).getByRole('button', { name: 'Move cursor right' }), { settle: 250, ms: 380, ...o });
const formulaKey = () => key(page, /^Chemical formula or reaction/);
const arrowKey = () => key(page, /^Arrow with conditions/);
const TIP = (tip) => ({ tag: { tip } });
async function openPad(id, n, chemId = 'x-chemtab') {
  await X.click(id, card(page, n).getByRole('button', { name: /Maths & symbols/ }), { settle: 700 });
  if (chemId) await X.click(chemId, tab(page, 'Chemistry'), { settle: chemId === 'chem' ? 700 : 300, ms: 420 });
}
async function addQuestion(id, n) {
  await X.click(id, page.getByRole('button', { name: 'Add question' }).last(), { settle: 600 });
  await X.show(card(page, n));
}
async function options(id, n, list, delay = 32) {
  for (const [i, text] of list.entries()) {
    await X.into(i === 0 ? id : `x-opt${i}`, box(page, n, 1 + i), { ms: 420 });
    await X.type(text, delay);
  }
}
const correct = (id, n, L) => X.click(id, card(page, n).getByLabel(`Mark option ${L} as correct`), { settle: 900 });
/** One reaction arrow with a single line on top (box below removed). */
async function conditionsArrow(ids = {}) {
  await X.click(ids.key || 'x-arrowkey', arrowKey(), { settle: 700, ...TIP('Arrow with conditions above and below (Δ, catalyst)') });
  if (ids.rows) await X.hover(ids.rows, page.getByText('Reaction Arrow Reagents'), { settle: 1400 });
  await X.click(ids.minus || 'x-rowminus', page.getByTitle('Remove reagent row below'), { settle: 500 });
  await X.click(ids.ins || 'x-rowins', arrowInsert(page), { settle: 600 });
}
async function wordsOnArrow(id, text, delay, slow = true) {
  await X.click(id, pad(page).getByRole('button', { name: /Words/ }), { settle: 300, ...TIP('Normal words inside a formula') });
  await X.typed(id === 'words' ? 'flame' : `x-${id}-t`, text, delay, { boxOf: padBox(), slow });
  await right('x-r1', { ms: 300 });
  await right('x-r2', { ms: 200 });
}

/* ── the paper, step by step ──────────────────────────────────────────── */

async function details() {
  if (rec) {
    await X.click('create', page.getByText('Create Test', { exact: true }).filter({ visible: true }).first(), { settle: 1500 });
    await page.getByPlaceholder(/e\.g\. Class 10 Science/).waitFor({ timeout: 60000 });
  } else {
    await page.goto(APP + '/create-test', { waitUntil: 'load', timeout: 60000 });
    await page.getByPlaceholder(/e\.g\. Class 10 Science/).waitFor({ timeout: 60000 });
    await sleep(1200);
  }
  await X.click('name', page.getByPlaceholder(/e\.g\. Class 10 Science/), { settle: 200 });
  await X.type(`${TITLE} — Practice Test`, 45);
  await X.click('marking', page.getByText('JEE / NEET (+4, −1)'), { settle: 700 });
  if (rec) {
    const t1 = rec.now();
    await X.show(card(page, 0), 0.1);
    rec.mark('questions', { pre: +(rec.now() - t1).toFixed(3), box: await card(page, 0).boundingBox() });
    await sleep(600);
  } else await X.show(card(page, 0), 0.1);
}

async function q1() {
  await X.into('q1text', box(page, 0, 0));
  await X.type('The correct increasing order of spin-only magnetic moment values of the following complex ions is:', 26);
  await page.keyboard.press('Enter');
  await openPad('sypad', 0, 'chem');
  await X.click('formula', formulaKey(), { settle: 2200, ...TIP('Formula — type H2O or 2H2 + O2 -> 2H2O') });
  await X.typed('mn', '[MnBr4', 240, { boxOf: padBox() });
  await X.see('sub', padBox(), { settle: 900, tag: { slow: true } });
  await X.typed('charge', ']^2-', 280, { boxOf: padBox() });
  // The pad's preview doesn't scroll with the caret, so the four ions go in as two formulas.
  await X.typed('rest', ' (A), [Cu(H2O)6]^2+ (B),', 130, { boxOf: padBox() });
  await X.click('ins1a', padInsert(page), { settle: 600 });
  await X.into('x-back1', box(page, 0, 0), { ms: 420 });
  await X.type(' ', 100);
  await X.click('f1b', formulaKey(), { settle: 300, ...TIP('Formula') });
  await X.typed('x-rest2', '[Ni(CN)4]^2- (C) and [Ni(H2O)6]^2+ (D)', 120, { boxOf: padBox() });
  await X.click('ins1', padInsert(page), { settle: 900 });
  await X.hover('lands1', box(page, 0, 0), { settle: 1200, fy: 0.6 });
  await done();
  await options('opts1', 0, ['A = B < C < D', 'A = B < D < C', 'C = D < B < A', 'C < B < D < A']);
  await correct('correct1', 0, 'D');
}

async function q2() {
  await addQuestion('q2add', 1);
  await X.into('q2text', box(page, 1, 0));
  await X.type('Observe the following equilibrium in a 1 L flask.', 28);
  await page.keyboard.press('Enter');
  await openPad('x-sypad2', 1);
  await X.click('formula2', formulaKey(), { settle: 600, ...TIP('Formula') });
  await X.typed('a', 'A', 200, { boxOf: padBox() });
  await X.click('gas', key(page, 'Gas'), { settle: 500, ...TIP('Gas') });
  await X.click('rev', key(page, 'Reversible reaction'), { settle: 500, ...TIP('Reversible reaction') });
  await X.typed('b', ' B', 220, { boxOf: padBox() });
  await X.click('gas2', key(page, 'Gas'), { settle: 900, ...TIP('Gas') });
  // Key tour: hover each key long enough for its label.
  const tour = [['up', 'Gas given off'], ['down', 'Precipitate'], ['heat', 'Heat (Delta)'], ['deg', 'Degree Celsius'],
    ['aq', 'Dissolved in water'], ['x-solid', 'Solid'], ['x-liquid', 'Liquid'],
    ['consts', 'Acid constant'], ['x-kb', 'Base constant'], ['x-ph', 'pH'], ['x-mol', 'Mole']];
  for (const [id, hint] of tour) await X.hover(id, key(page, hint), { settle: 520, ms: 330, ...TIP(hint) });
  await X.click('ins2', padInsert(page), { settle: 800 });
  await done();
  await X.into('rest2', box(page, 1, 0));
  await page.keyboard.press('Enter');
  await X.type('At T(K), the equilibrium concentrations of A and B are 0.5 M and 0.375 M respectively. 0.1 moles of A is added into the flask and heated to T(K) to establish the equilibrium again. The new equilibrium concentrations (in M) of A and B are respectively', 14);
  await options('opts2', 1, ['0.367, 0.275', '0.53, 0.4', '0.742, 0.557', '0.557, 0.418']);
  await correct('correct2', 1, 'D');
}

async function q3() {
  await addQuestion('q3add', 2);
  await X.into('x-q3text', box(page, 2, 0));
  await X.type('Consider the following reactions.', 28);
  await page.keyboard.press('Enter');
  await openPad('x-sypad3', 2);
  await X.click('formula3', formulaKey(), { settle: 400, ...TIP('Formula') });
  await X.typed('x-na', 'Na2B4O7 ', 170, { boxOf: padBox() });
  await conditionsArrow({ key: 'arrowkey', rows: 'rows', minus: 'rowminus', ins: 'rowins' });
  await X.hover('qmark', pad(page).locator('.katex').first(), { settle: 1000, fx: 0.93, fy: 0.35 });
  await X.click('delta', key(page, 'Heat (Delta)'), { settle: 600, ...TIP('Heat (Delta)') });
  await right('step', TIP('Move right'));
  await X.typed('prod', ' 2X + Y', 190, { boxOf: padBox() });
  await X.click('ins3a', padInsert(page), { settle: 800 });

  await X.into('line2', box(page, 2, 0));
  await page.keyboard.press('Enter');
  await X.click('x-f2', formulaKey(), { settle: 300, ...TIP('Formula') });
  await X.typed('x-cu', 'CuSO4 + Y ', 150, { boxOf: padBox() });
  await conditionsArrow({ key: 'arrow2' });
  await wordsOnArrow('words', 'Non-Luminous flame', 120);
  await X.typed('x-zso3', ' Z + SO3', 150, { boxOf: padBox() });
  await X.click('ins3b', padInsert(page), { settle: 800 });

  await X.into('line3', box(page, 2, 0));
  await page.keyboard.press('Enter');
  await X.click('x-f3', formulaKey(), { settle: 300, ...TIP('Formula') });
  await X.typed('x-2z', '2Z + 2X + Carbon ', 110, { boxOf: padBox(), slow: false });
  await conditionsArrow({});
  await wordsOnArrow('x-lum', 'Luminous flame', 100, false);
  await X.typed('x-2q', ' 2Q + Na2B4O7 + CO', 110, { boxOf: padBox(), slow: false });
  await X.click('ins3c', padInsert(page), { settle: 900 });
  await done();
  await X.into('q3rest', box(page, 2, 0));
  await page.keyboard.press('Enter');
  await X.type('The oxidation states of Cu in Z and Q, respectively are :', 22);
  await options('opts3', 2, ['+2 and +2', '+2 and +1', '+1 and +2', '+1 and +1']);
  await correct('correct3', 2, 'B');
}

async function q4() {
  await addQuestion('q4add', 3);
  await X.into('x-q4text', box(page, 3, 0));
  await X.type('Match List-I with List-II according to shape.', 26);
  await page.keyboard.press('Enter');
  await openPad('x-sypad4', 3, null);
  if (!rec) {
    // Off camera: the finished table straight into Sy Pad (rapid clicks on the blue boxes get lost).
    const row = (l, a, r, b) => `${l} & \\ce{${a}} & ${r} & \\ce{${b}}`;
    await code(page).fill(`\\begin{array}{llll} \\textbf{\\,} & \\textbf{List-I} & \\textbf{\\,} & \\textbf{List-II} \\\\ ${row('A', 'XeO3', 'I', 'BrF5')} \\\\ ${row('B', 'XeF2', 'II', 'NH3')} \\\\ ${row('C', 'XeO2F2', 'III', '[I3]^-')} \\\\ ${row('D', 'XeOF4', 'IV', 'SF4')} \\end{array}`);
    await sleep(300);
    await padInsert(page).click();
    await sleep(400);
    await done();
    await X.into('x-q4rest', box(page, 3, 0));
    await page.keyboard.press('Enter');
    await X.type('Choose the correct answer from the options given below :');
    await options('opts4', 3, ['A-II, B-I, C-III, D-IV', 'A-II, B-III, C-IV, D-I', 'A-II, B-III, C-I, D-IV', 'A-III, B-II, C-IV, D-I']);
    await correct('correct4', 3, 'B');
    return;
  }
  await X.click('tables', tab(page, 'Tables'), { settle: 700, ms: 450 });
  await X.click('match', key(page, 'Match the columns'), { settle: 900, ...TIP('Match List') });
  const cells = page.locator('xpath=//*[contains(text(),"Table Configuration")]/following::input[@type="text"]');
  await cells.nth(0).fill('\\,');
  await cells.nth(2).fill('\\,');
  await X.hover('editor', page.getByText('Table Configuration'), { settle: 1300 });
  const labels = [[4, 'A'], [8, 'B'], [12, 'C'], [16, 'D'], [6, 'I'], [10, 'II'], [14, 'III'], [18, 'IV']];
  for (const [i, [n, v]] of labels.entries()) {
    await X.click(i === 0 ? 'labels' : `x-lab${i}`, cells.nth(n), { settle: 120, ms: 300 });
    await page.keyboard.press('Control+A');
    await X.type(v, 140);
  }
  await X.click('tins', tableInsert(page), { settle: 800 });
  await X.hover('blue', pad(page).locator('.math-placeholder').first(), { settle: 1200 });
  await X.click('x-chem4', tab(page, 'Chemistry'), { settle: 400, ms: 450 });
  const fills = [['XeO3', 'box1', 'f1', 'xe'], ['XeF2', 'box2'], ['XeO2F2', 'fill'], ['XeOF4'], ['BrF5'], ['NH3'], ['[I3]^-'], ['SF4']];
  for (const [i, [f, idBox, idF, idT]] of fills.entries()) {
    const slow = i < 2;
    await X.click(idBox || `x-box${i}`, slots(page).first(), { settle: 250, ms: slow ? 600 : 380 });
    await X.click(idF || `x-f${i}`, formulaKey(), { settle: 250, ms: slow ? 550 : 360, ...(slow ? TIP('Formula') : {}) });
    await X.typed(idT || `x-t${i}`, f, slow ? 230 : 120, { boxOf: padBox(), slow });
  }
  await X.click('tins2', padInsert(page), { settle: 900 });
  await done();
  await X.hover('table', box(page, 3, 0), { settle: 1500, fy: 0.55 });
  await X.into('x-q4rest', box(page, 3, 0));
  await page.keyboard.press('Enter');
  await X.type('Choose the correct answer from the options given below :', 20);
  await options('opts4', 3, ['A-II, B-I, C-III, D-IV', 'A-II, B-III, C-IV, D-I', 'A-II, B-III, C-I, D-IV', 'A-III, B-II, C-IV, D-I'], 26);
  await correct('correct4', 3, 'B');
}

/** Picture → cloud → Choose a picture → (file dialog, drawn in the edit) → uploaded at the cursor. */
async function cloudPicture(n, file, ids) {
  const cloudBtn = card(page, n).getByTitle('Put a picture inside the text (cloud upload)');
  if (ids.pic) await X.click(ids.pic, card(page, n).getByRole('button', { name: 'Picture', exact: true }), { settle: 700 });
  else if (!(await cloudBtn.isVisible().catch(() => false))) await X.click('x-pic2', card(page, n).getByRole('button', { name: 'Picture', exact: true }), { settle: 600 });
  await X.click(ids.cloud, card(page, n).getByTitle('Put a picture inside the text (cloud upload)'), { settle: 900, ...TIP('Put a picture inside the text') });
  if (ids.why) await X.hover(ids.why, page.getByText('Put a picture in the text', { exact: true }), { settle: 1500 });
  const chooser = page.waitForEvent('filechooser', { timeout: 15000 });
  await X.click(ids.choose, page.getByText('Choose a picture', { exact: true }), { settle: 100, tag: { filedialog: file } });
  const fc = await chooser;
  await X.wait(3400); // the file dialog is on screen here (drawn in the edit)
  if (rec) await rec.mark(ids.pick, { pre: 0, filedialogEnd: true }).flagged;
  await fc.setFiles(CROPS + file);
  const img = card(page, n).locator('img[src*="cloudinary"]').nth(ids.nth || 0);
  await page.waitForFunction(([i, nth]) => {
    const a = document.querySelectorAll('article:has(.group\\/ime-container)')[i];
    const ta = a && a.querySelector('textarea');
    const imgs = a ? a.querySelectorAll('img[src*="cloudinary"]') : [];
    return (ta && (ta.value.match(/cloudinary/g) || []).length > nth) || imgs.length > nth;
  }, [n, ids.nth || 0], { timeout: 45000 });
  // Leave the box so it shows the rendered picture (no cursor move).
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await img.waitFor({ state: 'visible', timeout: 20000 });
  await sleep(rec ? 500 : 200);
  if (rec) await X.see(ids.placed || 'x-placed', img, { settle: 1400 });
  return img;
}

async function q5() {
  await addQuestion('q5add', 4);
  await X.click('qtype', card(page, 4).getByLabel('Question type'), { settle: 600 });
  await X.click('numerical', page.getByRole('option', { name: 'Numerical answer' }), { settle: 900 });
  await X.click('wrong', card(page, 4).getByLabel('Wrong', { exact: true }), { settle: 150 });
  await page.keyboard.press('Control+A');
  await X.type('0', 300);
  await X.wait(1200);
  await X.into('q5text', box(page, 4, 0));
  await X.type('The sum of total number of carbonyl groups (>C=O) present in the major products X and Y in the following reactions is ____.', 18);
  await page.keyboard.press('Enter');
  await cloudPicture(4, 'structure-1.png', { pic: 'pic', cloud: 'cloud', why: 'cloudwhy', choose: 'choose', pick: 'pick', placed: 'placed' });
  await openPad('x-sypad5', 4);
  await X.into('x-after1', box(page, 4, 0), { ms: 420 });
  await conditionsArrow({ key: 'arrow5' });
  await wordsOnArrow('heat5', 'heat', 200);
  await X.typed('x', ' X', 220, { boxOf: padBox() });
  await X.click('x-ins5a', padInsert(page), { settle: 700 });
  await done();
  await X.into('second', box(page, 4, 0));
  await page.keyboard.press('Enter');
  await cloudPicture(4, 'structure-2.png', { cloud: 'x-cloud2', choose: 'x-choose2', pick: 'x-pick2', placed: 'x-placed2', nth: 1 });
  await openPad('x-sypad5b', 4);
  await X.into('x-after2', box(page, 4, 0), { ms: 420 });
  await conditionsArrow({});
  await wordsOnArrow('x-heat2', 'heat', 140);
  await X.typed('y', ' Y', 220, { boxOf: padBox() });
  await X.click('ins5', padInsert(page), { settle: 700 });
  await done();
  await page.mouse.click(1450, 200);
  await X.wait(700);
  await X.show(card(page, 4), 0.08);
  await X.hover('seen', box(page, 4, 0), { settle: 1500, fy: 0.5 });
  await X.click('exact', card(page, 4).getByRole('radio', { name: 'Exact value(s)' }), { settle: 500 });
  await X.click('four', card(page, 4).getByLabel('Correct number(s)'), { settle: 150 });
  await X.type('4', 300);
  await X.wait(1500);
}

async function q6() {
  await addQuestion('q6add', 5);
  await X.click('qtype6', card(page, 5).getByLabel('Question type'), { settle: 600 });
  await X.click('multi', page.getByRole('option', { name: 'Multiple correct' }), { settle: 900 });
  await X.click('photo', card(page, 5).getByRole('button', { name: /Fill from photo/ }), { settle: 1300 });
  const chooser = page.waitForEvent('filechooser', { timeout: 15000 });
  await X.click('choose6', page.getByRole('button', { name: /Choose a photo/ }), { settle: 100, tag: { filedialog: 'jee-adv-2026-p1-q6.png' } });
  const fc = await chooser;
  await X.wait(3200);
  if (rec) await rec.mark('x-pick6', { pre: 0, filedialogEnd: true }).flagged;
  await fc.setFiles(CROPS + 'jee-adv-2026-p1-q6.png');
  await sleep(rec ? 1200 : 300);
  if (rec) await X.see('reading', page.getByText(/Reading the question|Finding the options|Looking for|Almost done/).first(), { settle: 300, tag: { maxRate: 40 } });
  // The AI read sometimes fails ("Failed to fetch"); off camera just try again.
  for (let attempt = 1; ; attempt++) {
    const r = await Promise.race([
      page.getByText('Filled from your photo').waitFor({ timeout: 150000 }).then(() => 'ok'),
      page.getByText(/Failed to fetch|Could not read/).waitFor({ timeout: 150000 }).then(() => 'err'),
    ]);
    if (r === 'ok') break;
    if (rec || attempt >= 3) throw new Error('photo read failed');
    console.log('photo read failed, retrying');
    const again = page.waitForEvent('filechooser', { timeout: 15000 });
    await page.getByRole('button', { name: /Choose a photo/ }).click();
    await (await again).setFiles(CROPS + 'jee-adv-2026-p1-q6.png');
  }
  await sleep(rec ? 700 : 300);
  await X.show(card(page, 5), 0.06);
  if (rec) await X.see('filled', card(page, 5), { settle: 2500 });
  await X.hover('ticked', card(page, 5).getByLabel('Option A is correct'), { settle: 1400 });
  await X.hover('check', page.getByText('Filled from your photo — please read it once.'), { settle: 1400 });
  await X.hover('partial', card(page, 5).getByText('Partial marks', { exact: true }), { settle: 900 });
  await X.click('jeeadv', card(page, 5).getByRole('radio', { name: 'JEE Advanced' }), { settle: 2200 });
}

async function save() {
  await X.click('save', page.getByRole('button', { name: 'Save test' }), { settle: 300 });
  await page.waitForURL(/my-tests/, { timeout: 60000 });
  // The new card sits under "All tests", below the live exams: scroll down to it.
  const all = page.getByRole('heading', { name: 'All tests' });
  await all.waitFor({ timeout: 60000 });
  await sleep(1500);
  await all.evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }));
  const title = page.getByText(`${TITLE} — Practice Test`).filter({ visible: true }).first();
  await title.waitFor({ timeout: 60000 });
  await sleep(1200);
  await X.see('saved', title, { settle: 1500 });
  const cardOf = title.locator('xpath=ancestor::*[.//*[normalize-space()="Conduct exam"]][1]');
  await X.hover('ready', cardOf.getByText('Conduct exam', { exact: true }).first(), { settle: 2500 });
  console.log('saved; url', page.url());
  await page.screenshot({ path: 'capture/rec/after-save.png' });
}

/* ── takes ─────────────────────────────────────────────────────────────── */

const STEPS = [details, q1, q2, q3, q4, q5, q6, save];
const FROM = { a: 0, b: 3, c: 4, d: 5, e: 6, f: 7 };
const UNTIL = { a: 3, b: 4, c: 5, d: 6, e: 7, f: 8 };
if (!(take in FROM)) { console.error('unknown take', take); process.exit(1); }

try {
  await login(page);
  if (take === 'a') {
    await page.goto(APP + '/my-tests', { waitUntil: 'load', timeout: 60000 });
    await page.getByRole('heading', { name: 'All tests' }).waitFor({ timeout: 60000 });
    await sleep(2500);
  }
  for (const step of STEPS.slice(0, FROM[take])) { console.log('prebuild', step.name); await step(); }
  await page.mouse.move(1180, 300); page.__pos = { x: 1180, y: 300 };
  rec = new Recorder(page, take);
  await rec.start();
  await rec.mark('x-start', { pre: 0, point: { ...page.__pos }, hover: true }).flagged;
  await sleep(1200);
  for (const step of STEPS.slice(FROM[take], UNTIL[take])) { console.log('record', step.name); await step(); }
  await sleep(1200);
} catch (e) { await fail(e); }
if (rec) await rec.stop();
await browser.close();
