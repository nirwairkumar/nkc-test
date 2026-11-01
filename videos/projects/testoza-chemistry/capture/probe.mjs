// Probe: how the real builder renders each chemistry move (nothing is saved).
// TZ_EMAIL=… TZ_PASSWORD=… node capture/probe.mjs [part]   parts: pad | table | picture | photo
import { launch, session, login, sleep } from './rec-lib.mjs';
import { card, box, pad, code, key, tab, padInsert, tableInsert, arrowInsert, slots, openCreate, editAt, frameOn, CROPS } from './builder.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = decodeURIComponent(new URL('./probe/', import.meta.url).pathname.slice(1));
mkdirSync(OUT, { recursive: true });
const part = process.argv[2] || 'pad';
const log = [];
const note = (...a) => { const s = a.join(' '); console.log(s); log.push(s); };
const browser = await launch();
const { page } = await session(browser, 'desktop');
const shot = (name) => page.screenshot({ path: OUT + name + '.png' });
const codeVal = async (label) => note(label, '→', JSON.stringify(await code(page).inputValue()));
const clear = async () => { await pad(page).getByRole('button', { name: 'Clear' }).click(); await sleep(200); };

try {
  await login(page);
  await openCreate(page);
  await page.getByPlaceholder(/e\.g\. Class 10 Science/).fill('Probe — chemistry');
  await page.getByText('JEE / NEET (+4, −1)').click();
  await frameOn(page, card(page, 0), 0.12);
  await shot('01-details');

  if (part === 'pad') {
    await editAt(page, 0, 0);
    await page.keyboard.type('Probe ', { delay: 20 });
    await card(page, 0).getByRole('button', { name: /Maths & symbols/ }).click();
    await sleep(800);
    await shot('02-pad');
    await tab(page, 'Chemistry').click();
    await sleep(500);
    await shot('03-chem');
    await key(page, /^Chemical formula or reaction/).click();
    await sleep(1600);
    await shot('04-formula-hint');
    await page.keyboard.type('[MnBr4]^2- (A), [Cu(H2O)6]^2+ (B)', { delay: 60 });
    await sleep(600);
    await shot('05-formula-typed');
    await codeVal('formula');
    // Keys pressed while the caret is inside the formula.
    await page.keyboard.type(' A', { delay: 60 });
    await key(page, 'Gas').click(); await sleep(300);
    await key(page, 'Reversible reaction').click(); await sleep(300);
    await page.keyboard.type(' B', { delay: 60 });
    await key(page, 'Gas').click(); await sleep(500);
    await codeVal('keys inside ce');
    await shot('06-keys-inside');
    await clear();
    // Keys pressed outside any formula.
    await page.keyboard.type('A', { delay: 60 });
    await key(page, 'Gas').click(); await sleep(250);
    await key(page, 'Reversible reaction').click(); await sleep(250);
    await page.keyboard.type('B', { delay: 60 });
    await key(page, 'Gas').click(); await sleep(500);
    await codeVal('keys outside');
    await shot('07-keys-outside');
    await clear();
    // Conditions arrow inside a formula.
    await key(page, /^Chemical formula or reaction/).click(); await sleep(300);
    await page.keyboard.type('Na2B4O7 ', { delay: 60 });
    await key(page, /^Arrow with conditions/).click(); await sleep(800);
    await shot('08-arrow-editor');
    await page.getByTitle('Remove reagent row below').click(); await sleep(300);
    await arrowInsert(page).click(); await sleep(600);
    await codeVal('arrow inside ce');
    await shot('09-arrow-inside');
    note('slots', await slots(page).count());
    await slots(page).first().click(); await sleep(300);
    await key(page, 'Heat (Delta)').click(); await sleep(400);
    await page.keyboard.press('End');
    await page.keyboard.type(' 2X + Y', { delay: 60 });
    await sleep(500);
    await codeVal('after delta');
    await shot('10-delta');
    // Words on an arrow, outside any formula.
    await clear();
    await key(page, /^Chemical formula or reaction/).click(); await sleep(300);
    await page.keyboard.type('CuSO4 + Y', { delay: 60 });
    await pad(page).getByRole('button', { name: 'Move cursor right' }).click(); await sleep(200);
    await key(page, /^Arrow with conditions/).click(); await sleep(500);
    await page.getByTitle('Remove reagent row below').click(); await sleep(200);
    await arrowInsert(page).click(); await sleep(400);
    await slots(page).first().click(); await sleep(300);
    await pad(page).getByRole('button', { name: /Words/ }).click(); await sleep(300);
    await page.keyboard.type('Non-Luminous flame', { delay: 60 });
    await pad(page).getByRole('button', { name: 'Move cursor right' }).click(); await sleep(200);
    await pad(page).getByRole('button', { name: 'Move cursor right' }).click(); await sleep(200);
    await key(page, /^Chemical formula or reaction/).click(); await sleep(300);
    await page.keyboard.type('Z + SO3', { delay: 60 });
    await sleep(500);
    await codeVal('words arrow');
    await shot('11-words-arrow');
    await padInsert(page).click(); await sleep(800);
    await shot('12-inserted');
    await page.mouse.click(200, 300); await sleep(800);
    await shot('13-preview');
    note('question text', JSON.stringify(await card(page, 0).locator('textarea').first().inputValue().catch(() => '(preview)')));
  }

  if (part === 'arrow') {
    await editAt(page, 0, 0);
    await card(page, 0).getByRole('button', { name: /Maths & symbols/ }).click(); await sleep(700);
    await tab(page, 'Chemistry').click(); await sleep(300);
    // A: the arrow inside the formula; its blank is the selected "?".
    await key(page, /^Chemical formula or reaction/).click(); await sleep(300);
    await page.keyboard.type('Na2B4O7 ', { delay: 60 });
    await key(page, /^Arrow with conditions/).click(); await sleep(600);
    await page.getByTitle('Remove reagent row below').click(); await sleep(300);
    await arrowInsert(page).click(); await sleep(500);
    await key(page, 'Heat (Delta)').click(); await sleep(300);
    await pad(page).getByRole('button', { name: 'Move cursor right' }).click(); await sleep(200);
    await page.keyboard.type(' 2X + Y', { delay: 60 });
    await sleep(500);
    await codeVal('A inside');
    await shot('50-arrow-inside');
    await padInsert(page).click(); await sleep(600);
    await page.keyboard.press('Enter').catch(() => {});
    // B: step out of the formula, blue box above the arrow, Words.
    await editAt(page, 0, 0);
    await page.keyboard.press('Enter');
    await key(page, /^Chemical formula or reaction/).click(); await sleep(300);
    await page.keyboard.type('CuSO4 + Y', { delay: 60 });
    await pad(page).getByRole('button', { name: 'Move cursor right' }).click(); await sleep(200);
    await key(page, /^Arrow with conditions/).click(); await sleep(500);
    await page.getByTitle('Remove reagent row below').click(); await sleep(200);
    await arrowInsert(page).click(); await sleep(500);
    await codeVal('B arrow');
    note('slots', await slots(page).count());
    await shot('51-arrow-outside-slot');
    await pad(page).getByRole('button', { name: /Words/ }).click(); await sleep(300);
    await page.keyboard.type('Non-Luminous flame', { delay: 60 });
    await pad(page).getByRole('button', { name: 'Move cursor right' }).click(); await sleep(200);
    await pad(page).getByRole('button', { name: 'Move cursor right' }).click(); await sleep(200);
    await key(page, /^Chemical formula or reaction/).click(); await sleep(300);
    await page.keyboard.type('Z + SO3', { delay: 60 });
    await sleep(500);
    await codeVal('B words');
    await shot('52-arrow-words');
    await padInsert(page).click(); await sleep(600);
    // Plain reaction arrow key and the state keys, inside one formula.
    await editAt(page, 0, 0);
    await page.keyboard.press('Enter');
    await key(page, /^Chemical formula or reaction/).click(); await sleep(300);
    await page.keyboard.type('CaCO3 + 2HCl ', { delay: 60 });
    await key(page, 'Reaction arrow').click(); await sleep(200);
    await page.keyboard.type(' CaCl2 + H2O + CO2', { delay: 60 });
    await key(page, 'Gas given off').click(); await sleep(400);
    await codeVal('C plain');
    await shot('53-plain-arrow');
    await padInsert(page).click(); await sleep(600);
    await page.keyboard.press('Escape'); await sleep(400);
    await page.mouse.click(1450, 120); await sleep(1000);
    await frameOn(page, card(page, 0), 0.1);
    await shot('54-preview');
    note('question text', JSON.stringify(await card(page, 0).locator('textarea').first().inputValue().catch(() => '(preview)')));
  }

  if (part === 'table') {
    await editAt(page, 0, 0);
    await page.keyboard.type('Match List-I with List-II according to shape.', { delay: 10 });
    await page.keyboard.press('Enter');
    await card(page, 0).getByRole('button', { name: /Maths & symbols/ }).click(); await sleep(700);
    await tab(page, 'Tables').click(); await sleep(400);
    await shot('20-tables');
    await key(page, 'Match the columns').click(); await sleep(600);
    await shot('21-match-editor');
    const cells = page.locator('xpath=//*[contains(text(),"Table Configuration")]/following::input[@type="text"]');
    note('cells', await cells.count());
    const labels = { 0: '\\,', 2: '\\,', 4: 'A', 6: 'I', 8: 'B', 10: 'II', 12: 'C', 14: 'III', 16: 'D', 18: 'IV' };
    for (const [i, v] of Object.entries(labels)) await cells.nth(+i).fill(v);
    await shot('22-match-filled');
    await tableInsert(page).click(); await sleep(600);
    await codeVal('match');
    await shot('23-match-slots');
    note('slots', await slots(page).count());
    await slots(page).first().click(); await sleep(300);
    await tab(page, 'Chemistry').click(); await sleep(300);
    await key(page, /^Chemical formula or reaction/).click(); await sleep(300);
    await page.keyboard.type('XeO3', { delay: 120 });
    await sleep(600);
    await codeVal('match + formula');
    await shot('24-match-formula');
    // Next box straight away: does the second blue box still work after Formula?
    await slots(page).first().click(); await sleep(300);
    await key(page, /^Chemical formula or reaction/).click(); await sleep(300);
    await page.keyboard.type('BrF5', { delay: 120 });
    await sleep(500);
    await shot('25-match-second');
    await codeVal('second');
    // Data table: bordered grid.
    await clear();
    await tab(page, 'Tables').click(); await sleep(300);
    await key(page, 'Table with every border').click(); await sleep(500);
    await shot('26-grid-editor');
  }

  if (part === 'picture') {
    await editAt(page, 0, 0);
    await page.keyboard.type('The sum of total number of carbonyl groups present in X and Y is', { delay: 10 });
    await page.keyboard.press('Enter');
    await card(page, 0).getByRole('button', { name: 'Picture', exact: true }).click(); await sleep(500);
    await shot('30-picture-strip');
    await card(page, 0).getByTitle('Put a picture inside the text (cloud upload)').click(); await sleep(700);
    await shot('31-cloud-modal');
    const chooser = page.waitForEvent('filechooser', { timeout: 10000 });
    await page.getByText('Choose a picture', { exact: true }).click();
    const fc = await chooser;
    await fc.setFiles(CROPS + 'q11-s1.png');
    await sleep(600);
    await shot('32-uploading');
    await sleep(5000);
    await shot('33-uploaded');
    note('question text', JSON.stringify(await card(page, 0).locator('textarea').first().inputValue().catch(() => '(preview)')));
    await page.mouse.click(200, 300); await sleep(1200);
    await shot('34-preview');
  }

  if (part === 'photo') {
    const file = process.argv[3] || 'photo-adv1-q6.png';
    const type = process.argv[4];
    if (type) {
      await card(page, 0).getByLabel('Question type').click(); await sleep(400);
      await page.getByRole('option', { name: type }).click(); await sleep(400);
    }
    await card(page, 0).getByRole('button', { name: /Fill from photo/ }).click(); await sleep(900);
    await shot('40-photo-sheet');
    const chooser = page.waitForEvent('filechooser', { timeout: 10000 });
    await page.getByRole('button', { name: /Choose a photo/ }).click();
    await (await chooser).setFiles(CROPS + file);
    const t0 = Date.now();
    await sleep(1500);
    await shot('41-reading');
    await page.getByText('Filled from your photo').waitFor({ timeout: 120000 }).catch(() => note('no banner'));
    note('read took', ((Date.now() - t0) / 1000).toFixed(1), 's');
    await sleep(1200);
    await frameOn(page, card(page, 0), 0.08);
    await shot('42-filled');
    await page.mouse.click(1450, 120); await sleep(800);
    await shot('43-filled-preview');
    const tas = card(page, 0).locator('textarea');
    note('texts', JSON.stringify(await tas.evaluateAll((els) => els.map((e) => e.value))));
  }
} catch (e) {
  note('FAIL', e.message.split('\n').slice(0, 4).join(' | '));
  await shot('FAIL-' + part).catch(() => {});
}
writeFileSync(OUT + `log-${part}.txt`, log.join('\n'));
await browser.close();
