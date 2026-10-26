// Delete the "JEE 2026 Chemistry — Practice Test" copies this project saved on the demo teacher
// account (so the re-recorded save shows exactly one). Only exact-title matches are touched.
// TZ_EMAIL=… TZ_PASSWORD=… node capture/cleanup-tests.mjs [--dry]
import { launch, session, login, sleep, APP, TITLE } from './rec-lib.mjs';
const NAME = `${TITLE} — Practice Test`;
const dry = process.argv.includes('--dry');
const browser = await launch();
const { page } = await session(browser, 'desktop');
await login(page);
await page.goto(APP + '/my-tests', { waitUntil: 'load', timeout: 60000 });
await page.getByRole('heading', { name: 'All tests' }).waitFor({ timeout: 60000 });
for (let round = 0; round < 5; round++) {
  await page.getByRole('heading', { name: 'All tests' }).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 300); await sleep(2500);
  const title = page.getByText(NAME).filter({ visible: true }).first();
  if (!(await title.waitFor({ timeout: round === 0 ? 40000 : 8000 }).then(() => true).catch(() => false))) { console.log('none left'); break; }
  const cardEl = title.locator('xpath=ancestor::*[.//*[normalize-space()="Conduct exam"]][1]');
  console.log('found', (await cardEl.innerText()).split('\n').slice(0, 4).join(' | '));
  await cardEl.getByRole('button', { name: /more|options|menu/i }).first().click().catch(async () => { await cardEl.locator('button').filter({ hasText: '' }).first().click(); });
  await sleep(700);
  const items = await page.getByRole('menuitem').allInnerTexts();
  console.log('menu', items.join(' / '));
  if (dry) break;
  await page.getByRole('menuitem', { name: /delete/i }).click();
  await sleep(800);
  const dlg = page.getByRole('alertdialog').or(page.getByRole('dialog')).last();
  console.log('confirm dialog', (await dlg.innerText()).slice(0, 160).replace(/\n/g, ' | '));
  await dlg.getByRole('button', { name: /delete/i }).last().click();
  await sleep(3000);
}
await browser.close();
