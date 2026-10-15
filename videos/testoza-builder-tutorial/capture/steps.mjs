// Every action of the tutorial, in film order, on the real builder. Each step takes the stills the
// board needs. The same steps drive the final recording (slower typing, no stills).
import { shot, frameOn, type, clipImage, card, editBox, syPadInsert, CROPS, mark } from './lib.mjs';

// Typing speed (ms per key). The recording types slower so viewers can follow; the edit retimes it.
const T = { fast: Number(process.env.TZ_FAST || 8), human: 35 };

async function openSyPad(page, n) {
  await card(page, n).getByRole('button', { name: 'Maths & symbols' }).first().click();
  await page.waitForTimeout(700);
}
async function addQuestion(page, n) {
  await page.getByRole('button', { name: 'Add question' }).last().click();
  await page.waitForTimeout(800);
  await frameOn(page, card(page, n), 0.08);
}
async function english(page, n) {
  await card(page, n).getByTitle('Type in English', { exact: true }).click().catch(() => {});
}
async function inlinePicture(page, n, file) {
  // Picture → cloud button: "Put a picture inside the text" — placed where the cursor is.
  await card(page, n).getByRole('button', { name: 'Picture' }).first().click();
  await page.waitForTimeout(400);
  await card(page, n).getByTitle('Put a picture inside the text (cloud upload)').first().click();
  await page.waitForTimeout(600);
  await page.locator('#cloud-modal-upload').setInputFiles(CROPS + file);
  await page.waitForTimeout(3500);
  await closePicker(page, n);
}
/** Close a card's picture strip so its buttons can't catch later clicks. */
async function closePicker(page, n) {
  await card(page, n).getByLabel('Close picture options').first().click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(300);
}
const pad = (page) => page.getByLabel('Sy Pad — maths and chemistry keyboard');
async function correct(page, n, letter) {
  await card(page, n).getByLabel(`Mark option ${letter} as correct`).click();
}
async function options(page, n, latexList) {
  await openSyPad(page, n);
  for (let i = 0; i < latexList.length; i++) {
    await editBox(page, n, 1 + i);
    await syPadInsert(page, latexList[i]);
  }
}
const closePad = async (page) => { await page.keyboard.press('Escape'); await page.waitForTimeout(500); };

export async function details(page) {
  await page.getByPlaceholder('e.g. Class 10 Science').waitFor({ timeout: 20000 });
  await page.getByPlaceholder('e.g. Class 10 Science').fill('JEE Main Mini Mock — TestoZa Demo');
  await page.getByPlaceholder('One line students see before they start').fill('Physics, Chemistry, Maths — 8 selected questions');
  await page.getByRole('button', { name: '3h', exact: true }).click();
  await page.getByText('JEE / NEET (+4, −1)').click();
  await page.waitForTimeout(400);
  await shot(page, 'f04-details');
}

/** Q1 — English, then Hindi from the language menu, √ options, D correct. */
export async function q1(page) {
  await frameOn(page, card(page, 0), 0.08);
  await editBox(page, 0, 0);
  await type(page, 'A stone is tied to a string of length L is whirled in a vertical circle with the other end of the string at the centre. At a certain instant of time, the stone is at its lowest position and has a speed u. The magnitude of the change in its velocity as it reaches a position where the string is horizontal is :', T.fast);
  await shot(page, 'f05-q1-english');
  await page.waitForTimeout(Number(process.env.TZ_PAUSE || 0));
  mark('q1-hindi');

  await card(page, 0).getByRole('button', { name: 'Choose another typing language' }).first().click();
  await page.waitForTimeout(500);
  await page.getByLabel('Search languages').fill('Hindi');
  await page.waitForTimeout(500);
  await shot(page, 'f06a-language-menu');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);

  await editBox(page, 0, 0);
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  // A word converts when a space follows it, so punctuation goes in after the converted word;
  // "L" stays Latin (typed in English mode), as in the paper.
  for (const tok of 'ek patthar ko L lambai ki ek dori se bandh kar aur dori ke dusre sire ko sthir rakhkar, urdhvadhar vrittakar path mein ghumaya jata hai.'.split(' ')) {
    if (tok === 'L') {
      await english(page, 0);
      await editBox(page, 0, 0); await page.keyboard.press('Control+End');
      await type(page, 'L ', 60);
      await card(page, 0).getByRole('button', { name: 'Type in Hindi' }).click();
      await editBox(page, 0, 0); await page.keyboard.press('Control+End');
      continue;
    }
    const m = tok.match(/^(.*?)([,.:;?]*)$/);
    await type(page, m[1] + ' ', 55);
    await page.waitForTimeout(350);
    if (m[2]) { await page.keyboard.press('Backspace'); await type(page, m[2] + ' ', 55); }
  }
  await page.waitForTimeout(1200);
  await shot(page, 'f06b-q1-hindi');

  await openSyPad(page, 0);
  const opts = ['\\sqrt{u^2-2gL}', '\\sqrt{2gL}', '\\sqrt{u^2-gL}', '\\sqrt{2(u^2-gL)}'];
  for (let i = 0; i < 4; i++) {
    await editBox(page, 0, 1 + i);
    if (i === 0) {
      await syPadInsert(page, opts[0], { keepOpen: true });
      await shot(page, 'f06c-sypad-sqrt');
      await page.getByRole('button', { name: /^Insert$/ }).click();
      await page.waitForTimeout(400);
    } else await syPadInsert(page, opts[i]);
  }
  await correct(page, 0, 'D');
  await closePad(page);
  await frameOn(page, card(page, 0), 0.08);
  await shot(page, 'f06d-q1-done');
}

/** Q2 — English again, figure via snip (Win+Shift+S → Ctrl+V) below the text, fraction options, B. */
export async function q2(page) {
  await addQuestion(page, 1);
  await english(page, 1);
  await editBox(page, 1, 0);
  await type(page, "If the ratio of lengths, radii and Young's modulus of steel and brass wires in the figure are a, b and c respectively, then the corresponding ratio of increase in their lengths would be :", T.fast);
  await shot(page, 'f07a-q2-text');
  await card(page, 1).getByRole('button', { name: 'Picture' }).first().click();
  await page.waitForTimeout(500);
  await card(page, 1).getByTitle('Paste a screen snip (Win+Shift+S, then Ctrl+V)').first().click();
  await page.waitForTimeout(700);
  await clipImage(page, 'q2-steel-brass.png');
  await page.keyboard.press('Control+V');
  await page.waitForTimeout(1200);
  await shot(page, 'f07b-snip-modal');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await closePicker(page, 1);
  await options(page, 1, ['\\frac{2a^2c}{b}', '\\frac{3a}{2b^2c}', '\\frac{2ac}{b^2}', '\\frac{3c}{2ab^2}']);
  await correct(page, 1, 'B');
  await closePad(page);
  await frameOn(page, card(page, 1), 0.08);
  await shot(page, 'f07c-q2-done');
}

/** Q3 — structure inline at the cursor, ozonolysis arrow from Sy Pad, numerical answer 1. */
export async function q3(page) {
  await addQuestion(page, 2);
  await editBox(page, 2, 0);
  await inlinePicture(page, 2, 'q3-but-2-ene.png');
  await openSyPad(page, 2);
  await editBox(page, 2, 0);
  await page.keyboard.press('Control+End');
  await syPadInsert(page, '\\ce{->[(i) O3][(ii) Zn/H2O]} (P)');
  await closePad(page);
  await editBox(page, 2, 0);
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await type(page, 'Consider the given reaction. The total number of oxygen atoms present per molecule of the product (P) is', T.fast);
  await card(page, 2).getByRole('combobox', { name: 'Question type' }).or(card(page, 2).getByLabel('Question type')).first().click();
  await page.getByRole('option', { name: 'Numerical answer' }).click();
  await page.waitForTimeout(500);
  await card(page, 2).getByRole('radio', { name: 'Exact value(s)' }).click();
  await card(page, 2).getByLabel('Correct number(s)').fill('1');
  await page.locator('body').click({ position: { x: 200, y: 600 } });
  await page.waitForTimeout(600);
  await frameOn(page, card(page, 2), 0.08);
  await shot(page, 'f08-q3-done');
}

/** Q4 — the integral, fully on Sy Pad; log / root / π options; B. */
export async function q4(page) {
  await addQuestion(page, 3);
  await english(page, 3);
  await editBox(page, 3, 0);
  await type(page, 'If ', T.fast);
  await openSyPad(page, 3);
  await editBox(page, 3, 0);
  await page.keyboard.press('Control+End');
  await syPadInsert(page, 'f(x)=\\int\\frac{x^2\\,dx}{(1+x^2)(1+\\sqrt{1+x^2})}', { keepOpen: true, delay: 30 });
  await shot(page, 'f09-sypad-integral');
  await page.getByRole('button', { name: /^Insert$/ }).click();
  await page.waitForTimeout(400);
  await editBox(page, 3, 0);
  await page.keyboard.press('Control+End');
  await type(page, ' and f(0) = 0, then f(1) is equal to', T.fast);
  for (const [i, l] of ['\\log(1+\\sqrt{2})', '\\log(1+\\sqrt{2})-\\frac{\\pi}{4}', '\\log(1+\\sqrt{2})+\\frac{\\pi}{4}'].entries()) {
    await editBox(page, 3, 1 + i);
    await syPadInsert(page, l);
  }
  await closePad(page);
  await editBox(page, 3, 4);
  await type(page, 'None of these', T.fast);
  await correct(page, 3, 'B');
  await page.locator('body').click({ position: { x: 200, y: 600 } });
  await page.waitForTimeout(500);
  await frameOn(page, card(page, 3), 0.08);
  await shot(page, 'f09-q4-done');
}

/** Q5 — bromobenzene inline, three reagents stacked on the arrow, four structure pictures as options; B. */
export async function q5(page) {
  await addQuestion(page, 4);
  await english(page, 4);
  await editBox(page, 4, 0);
  await type(page, 'The final product A, formed in the following multistep reaction sequence is:', T.fast);
  await page.keyboard.press('Enter');
  await inlinePicture(page, 4, 'q5-bromobenzene.png');
  await openSyPad(page, 4);
  await editBox(page, 4, 0);
  await page.keyboard.press('Control+End');
  await pad(page).getByRole('button', { name: 'Chemistry', exact: true }).click();
  await page.waitForTimeout(300);
  await pad(page).getByTitle(/Arrow with conditions above and below/).first().click();
  await page.waitForTimeout(500);
  await page.getByTitle('Add reagent row above').click();
  await page.getByTitle('Add reagent row above').click();
  await page.getByTitle('Remove reagent row below').click();
  await page.waitForTimeout(400);
  await shot(page, 'f10a-reagents-editor');
  await page.locator('xpath=//*[contains(text(),"Reaction Arrow Reagents")]/following::button[normalize-space()="Insert"][1]').click();
  await page.waitForTimeout(400);
  const code = page.getByLabel('Formula code');
  const reagents = ['\\text{(i) Mg, ether then CO}_2\\text{, H}^+', '\\text{(ii) NH}_3\\text{, }\\Delta', '\\text{(iii) Br}_2\\text{, NaOH}'];
  let v = await code.inputValue();
  for (const r of reagents) v = v.replace('?', r);
  await code.fill(v + '\\ \\text{A}');
  await page.waitForTimeout(500);
  await shot(page, 'f10b-reagents-code');
  await page.getByRole('button', { name: /^Insert$/ }).last().click();
  await page.waitForTimeout(400);
  await closePad(page);
  for (const L of 'ABCD') {
    await card(page, 4).getByLabel(`Add picture to option ${L}`).click();
    await page.waitForTimeout(300);
    await card(page, 4).locator('input[type="file"][accept="image/*"]').last().setInputFiles(CROPS + `q5-opt-${L.toLowerCase()}.png`);
    await page.waitForTimeout(2500);
  }
  await correct(page, 4, 'B');
  await page.locator('body').click({ position: { x: 200, y: 600 } });
  await page.waitForTimeout(600);
  await frameOn(page, card(page, 4), 0.06);
  await shot(page, 'f10c-q5-done');
}

/** Q6 — Sy Pad → Tables → Match List; C. */
export async function q6(page) {
  await addQuestion(page, 5);
  await english(page, 5);
  await editBox(page, 5, 0);
  await type(page, 'Match List - I with List - II.', T.fast);
  await openSyPad(page, 5);
  await editBox(page, 5, 0);
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await pad(page).getByRole('button', { name: 'Tables', exact: true }).click();
  await page.waitForTimeout(300);
  await pad(page).getByText('Match List', { exact: true }).first().click();
  await page.waitForTimeout(500);
  const grid = [
    // Blank cells must hold something: Sy Pad refuses to insert while a "?" box is empty.
    ['\\,', 'List-I (Reactants)', '\\,', 'List-II (Products)'],
    ['\\text{(A)}', '\\text{Phenol, Zn/}\\Delta', '\\text{(I)}', '\\text{Salicylaldehyde}'],
    ['\\text{(B)}', '\\text{Phenol, CHCl}_3\\text{, NaOH, HCl}', '\\text{(II)}', '\\text{Salicylic acid}'],
    ['\\text{(C)}', '\\text{Phenol, CO}_2\\text{, NaOH, HCl}', '\\text{(III)}', '\\text{Benzene}'],
    ['\\text{(D)}', '\\text{Phenol, Conc. HNO}_3', '\\text{(IV)}', '\\text{Picric acid}'],
  ];
  const cells = page.locator('xpath=//*[contains(text(),"Table Configuration")]/following::input[@type="text"]');
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) await cells.nth(r * 4 + c).fill(grid[r][c]);
  await shot(page, 'f11a-match-editor');
  await page.locator('xpath=//*[contains(text(),"Table Configuration")]/following::button[normalize-space()="Insert"][1]').click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Insert$/ }).last().click();
  await page.waitForTimeout(400);
  await closePad(page);
  await editBox(page, 5, 0);
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await type(page, 'Choose the correct answer from the options given below.', T.fast);
  const o = ['(A)-(IV), (B)-(II), (C)-(I), (D)-(III)', '(A)-(IV), (B)-(I), (C)-(II), (D)-(III)', '(A)-(III), (B)-(I), (C)-(II), (D)-(IV)', '(A)-(III), (B)-(IV), (C)-(I), (D)-(II)'];
  for (let i = 0; i < 4; i++) { await editBox(page, 5, 1 + i); await type(page, o[i], T.fast); }
  await correct(page, 5, 'C');
  await page.locator('body').click({ position: { x: 200, y: 600 } });
  await page.waitForTimeout(600);
  await frameOn(page, card(page, 5), 0.06);
  await shot(page, 'f11b-q6-done');
}

/* ── Part 2: sections ─────────────────────────────────────────────── */

const gapBefore = (page, n) =>
  card(page, n).locator('xpath=preceding::button[@aria-label="Add a question or split the section here" or @aria-label="Add a question here"][1]');

async function topOfQuestions(page) {
  await frameOn(page, page.getByRole('heading', { name: 'Questions' }).or(page.getByText('Questions', { exact: true })).first(), 0.05);
}

/** Drag the maths question (Q4) to the end, then switch on sections. */
export async function sectionsOn(page) {
  await frameOn(page, card(page, 3), 0.1);
  // Drag starts only from the card's handle ("Drag to move"). Headless Chromium doesn't turn mouse
  // moves into HTML5 drag-and-drop, so the same browser drag events are sent to the handle and card.
  await page.evaluate(([from, to]) => {
    const cards = [...document.querySelectorAll('article')].filter((a) => a.querySelector('.drag-handle'));
    const handle = cards[from].querySelector('.drag-handle');
    const dt = new DataTransfer();
    const fire = (el, type) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
    fire(handle, 'dragstart');
    fire(cards[to], 'dragenter');
    fire(cards[to], 'dragover');
    fire(cards[to], 'drop');
    fire(handle, 'dragend');
  }, [3, 5]);
  await page.waitForTimeout(800);
  await shot(page, 'f12-dragged');
  await page.waitForTimeout(Number(process.env.TZ_PAUSE || 0));
  mark('sections-switch');
  await page.getByRole('switch', { name: 'Split into sections' }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.getByRole('switch', { name: 'Split into sections' }).click();
  await page.waitForTimeout(900);
  await topOfQuestions(page);
  await shot(page, 'f13a-sections-on');
}

/** Add the cobalt-complex question inside Section A, before the maths question. */
export async function q7(page) {
  await gapBefore(page, 5).click();
  await page.waitForTimeout(400);
  await shot(page, 'f13b-gap-menu');
  await page.getByText('New question here', { exact: true }).click();
  await page.waitForTimeout(800);
  await frameOn(page, card(page, 5), 0.1);
  await english(page, 5);
  await editBox(page, 5, 0);
  await type(page, 'Which of the following has an optical isomer?', T.fast);
  await options(page, 5, ['\\ce{[Co(en)(NH3)2]^2+}', '\\ce{[Co(H2O)4(en)]^3+}', '\\ce{[Co(en)2(NH3)2]^3+}', '\\ce{[Co(NH3)3Cl]+}']);
  await correct(page, 5, 'C');
  await closePad(page);
  await frameOn(page, card(page, 5), 0.1);
  await shot(page, 'f13c-q7-done');
}

/** A new section at the end, "Bonus", with the R-and-K maths question. */
export async function mathsSection(page) {
  await page.getByRole('button', { name: 'Add a new section' }).click();
  await page.waitForTimeout(900);
  const name = page.getByLabel('Section name').last();
  await name.fill('Bonus');
  await page.waitForTimeout(300);
  const n = 7; // a new section starts with one empty question
  await frameOn(page, card(page, n), 0.25);
  await english(page, n);
  await editBox(page, n, 0);
  await type(page, 'If ', T.fast);
  await openSyPad(page, n);
  await editBox(page, n, 0);
  await page.keyboard.press('Control+End');
  await syPadInsert(page, 'R=\\int_0^1 x^{50}(2-x)^{50}\\,dx,\\quad K=\\int_0^1 x^{50}(1-x)^{50}\\,dx');
  await closePad(page);
  await editBox(page, n, 0);
  await page.keyboard.press('Control+End');
  await type(page, ', which of the following is true :', T.fast);
  await options(page, n, ['R=2^{50}K', 'R=2^{-50}K', 'R=2^{100}K', 'R=2^{-100}K']);
  await correct(page, n, 'C');
  // A new section's questions start at +1 / 0: set JEE marks on this one.
  await card(page, n).getByLabel('Marks', { exact: true }).fill('4');
  await card(page, n).getByLabel('Wrong', { exact: true }).fill('1');
  await closePad(page);
  await frameOn(page, name, 0.15);
  await shot(page, 'f14-maths-section');
}

/** Split Section A where chemistry starts (Physics | Chemistry), split the stray maths question out, merge it into Mathematics. */
export async function splitMerge(page) {
  await frameOn(page, card(page, 2), 0.35);
  await gapBefore(page, 2).click();
  await page.waitForTimeout(400);
  await shot(page, 'f15a-split-menu');
  await page.getByText('Split section here', { exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByLabel('Section name').nth(0).fill('Physics');
  await page.getByLabel('Section name').nth(1).fill('Chemistry');
  await page.waitForTimeout(400);
  await topOfQuestions(page);
  await shot(page, 'f15b-physics-chemistry');

  // The maths question is still the last one in Chemistry (card 6): split it out…
  await frameOn(page, card(page, 6), 0.4);
  await gapBefore(page, 6).click();
  await page.waitForTimeout(400);
  await page.getByText('Split section here', { exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByLabel('Section name').nth(2).fill('Mathematics');
  // …and merge the last section (Bonus) into Mathematics.
  const between = page.getByRole('button', { name: 'Add a section here or merge these two' }).last();
  await frameOn(page, between, 0.45);
  await between.click();
  await page.waitForTimeout(400);
  await shot(page, 'f15c-merge-menu');
  await page.getByText('Merge these two sections', { exact: true }).click();
  await page.waitForTimeout(1200);
  await topOfQuestions(page);
  await shot(page, 'f15d-final-sections');
}

/* ── Close: save, My Tests, the candidate's screen ───────────────── */

/** Save the paper (one real test on the demo account), see it on My Tests, open it as a candidate. */
export async function saveAndCandidate(page) {
  await page.getByRole('button', { name: 'Save test' }).click();
  await page.waitForURL(/my-tests/, { timeout: 45000 });
  await page.waitForTimeout(3500);
  await shot(page, 'f16a-my-tests');
  const cardEl = page.locator('xpath=//*[contains(normalize-space(.),"JEE Main Mini Mock")]/ancestor::*[.//*[@title="Test ID"]][1]').first();
  const id = (await cardEl.getByTitle('Test ID').first().innerText()).trim().replace(/^#/, '');
  mark('candidate');
  await page.goto(`https://app.testoza.com/test-intro/${id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shot(page, 'f16b-test-intro');
  const start = page.getByRole('button', { name: /start|begin|take/i }).first();
  if (await start.isVisible().catch(() => false)) {
    await start.click();
    await page.waitForTimeout(4000);
    for (const b of ['I agree', 'Continue', 'Start test', 'Start now']) {
      const x = page.getByRole('button', { name: b }).first();
      if (await x.isVisible().catch(() => false)) { await x.click(); await page.waitForTimeout(2500); }
    }
  }
  await shot(page, 'f16c-candidate');
  return id;
}
