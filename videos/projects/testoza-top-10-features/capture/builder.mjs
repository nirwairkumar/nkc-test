// Locators and small moves on the real /create-test builder (from testoza-chemistry).
import { sleep, APP } from './rec-lib.mjs';


/** The n-th question card (0-based), in page order. */
export const card = (page, n) => page.locator('article:has(.group\\/ime-container)').nth(n);
/** Box idx in card n: 0 = question, 1–4 = options A–D (preview or textarea). */
export const box = (page, n, idx = 0) => card(page, n).locator('.group\\/ime-container').nth(idx);
export const pad = (page) => page.getByLabel('Sy Pad — maths and chemistry keyboard');
export const code = (page) => page.getByLabel('Formula code');
/** Sy Pad key by its tooltip (hint) — the keys carry it as aria-label. */
export const key = (page, hint) => pad(page).getByRole('button', { name: hint, exact: true }).first();
export const tab = (page, name) => pad(page).getByRole('button', { name, exact: true }).first();
export const padInsert = (page) => pad(page).getByRole('button', { name: /^(Insert|Added)$/ }).first();
export const tableInsert = (page) => page.locator('xpath=//*[contains(text(),"Table Configuration")]/following::button[normalize-space()="Insert"][1]');
export const arrowInsert = (page) => page.locator('xpath=//*[contains(text(),"Reaction Arrow Reagents")]/following::button[normalize-space()="Insert"][1]');
/** Blue "?" boxes in the pad's rendered preview. */
export const slots = (page) => pad(page).locator('.math-placeholder');

export async function openCreate(page) {
  await page.goto(APP + '/create-test', { waitUntil: 'load', timeout: 60000 });
  await page.getByPlaceholder(/e\.g\. Class 10 Science/).waitFor({ timeout: 60000 });
  await sleep(1500);
}

/** Put the box in edit mode and the caret at its end. */
export async function editAt(page, n, idx = 0) {
  const b = box(page, n, idx);
  await b.click();
  await sleep(250);
  const ta = b.locator('textarea, input').first();
  await ta.focus();
  await page.keyboard.press('Control+End');
  return ta;
}

export async function frameOn(page, locator, ratio = 0.2) {
  await locator.evaluate((el, r) => {
    const top = el.getBoundingClientRect().top + window.scrollY - Math.max(window.innerHeight * r, 90);
    window.scrollTo({ top, behavior: 'instant' });
  }, ratio);
  await sleep(350);
}
