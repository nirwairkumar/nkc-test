// Probe the candidate exam page (guest, desktop): how options, navigation and Submit are built.
import { launch, session, sleep, state } from './rec-lib.mjs';
import { writeFileSync } from 'node:fs';

const browser = await launch();
const { page } = await session(browser, 'desktop');
const { link } = state.read();
await page.goto(link, { waitUntil: 'load', timeout: 60000 });
await page.getByText('Candidate Details').waitFor({ timeout: 60000 });
const inputs = page.locator('input[type=text], input:not([type])').filter({ visible: true });
await inputs.nth(0).fill('Probe Candidate');
await inputs.nth(1).fill('JM-99');
await page.getByRole('button', { name: /start test/i }).click();
await page.getByText(/QUESTION 1/i).first().waitFor({ timeout: 60000 });
await sleep(2500);
await page.screenshot({ path: 'capture/probe/exam-desktop.png' });
const info = await page.evaluate(() => {
  const out = {};
  out.buttons = [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean);
  // Elements whose own first text is a single option letter.
  const letters = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^[A-D]$/.test(e.textContent.trim()) && e.offsetParent);
  out.letters = letters.slice(0, 8).map((e) => {
    let p = e; const chain = [];
    for (let i = 0; i < 4 && p; i++, p = p.parentElement) chain.push(`${p.tagName.toLowerCase()}${p.getAttribute('role') ? '[role=' + p.getAttribute('role') + ']' : ''}.${(p.className || '').toString().slice(0, 60)}`);
    return chain;
  });
  return out;
});
writeFileSync('capture/probe/exam-desktop.json', JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2).slice(0, 3000));
await page.getByRole('button', { name: /submit test/i }).first().click().catch((e) => console.log('submit click', e.message));
await sleep(1500);
await page.screenshot({ path: 'capture/probe/exam-submit-dialog.png' });
console.log('dialog:', await page.getByRole('dialog').or(page.getByRole('alertdialog')).last().innerText().catch(() => 'none'));
await browser.close();
