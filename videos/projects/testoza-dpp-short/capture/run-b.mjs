// Real run B (prod, demo student): My Tests → DPP card Preview → start → answer → submit → Result Hub.
// RUN_DIR=runB1/ STOP=start node capture/run-b.mjs   (STOP ends early while exploring)
import { start } from './rec.mjs';
const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
const OUT = DIR + (process.env.RUN_DIR || 'runB1/');
const STOP = process.env.STOP || '';
const R = await start(OUT);
const { page, mark, wait, tap, scrollTo, scrollBy, dump } = R;
// Until the Preview fix (UserTestManager viewTest: slug || id) is deployed, the app asks for
// /api/tests/unlisted-<custom_id>, which 404s for a test that was never conducted. Answer that one
// call with the same request by id, which is what the fixed code asks for.
if (process.env.TEST_UUID && process.env.TEST_CID) {
  await page.route(`**/api/tests/unlisted-${process.env.TEST_CID}**`, async (route) => {
    const url = route.request().url().replace(`unlisted-${process.env.TEST_CID}`, process.env.TEST_UUID);
    route.fulfill({ response: await route.fetch({ url }) });
  });
}
try {
  await page.goto('https://app.testoza.com/my-tests', { waitUntil: 'load' });
  const title = page.getByText(/^DPP 07/).first();
  await title.waitFor({ timeout: 30000 });
  await wait(2500);
  await R.rec();
  await wait(1500);
  const card = page.locator('div', { has: title }).filter({ has: page.getByRole('button', { name: 'Preview' }) }).last();
  await tap(card.getByRole('button', { name: 'Preview' }).first(), 'preview');
  await wait(4500);
  await dump('b-test');
  if (STOP === 'test') throw new Error('stop');
  const box = page.locator('input[type="checkbox"]:visible').first();
  await tap(box, 'ready');
  await wait(400);
  mark('checked', { v: await box.isChecked() });
  if (!(await box.isChecked())) { await box.check({ force: true }); mark('checked2', { v: await box.isChecked() }); }
  await wait(600);
  const startBtn = page.getByRole('button', { name: /Start Test Now/i }).first();
  await tap(startBtn, 'start');
  await wait(3500);
  await dump('b-exam');
  if (STOP === 'start') throw new Error('stop');

  const letter = (L) => page.getByText(L, { exact: true }).filter({ visible: true }).first();
  const next = () => page.getByRole('button', { name: /Save & Next/ }).first();
  // Q1–Q6: one pick each (Q3 wrong on purpose: 2 s, the key says 4 s)
  // seconds of thinking per question, like a real attempt (Q3 is the time trap, Q4 slow but right)
  const THINK = { 1: 48, 2: 33, 3: 168, 4: 128, 5: 13, 6: 53 };
  for (const [q, L] of [[1, 'B'], [2, 'A'], [3, 'A'], [4, 'A'], [5, 'C'], [6, 'D']]) {
    await wait(+process.env.FAST ? 900 : THINK[q] * 1000);
    await tap(letter(L), `q${q}-${L}`);
    await wait(750);
    await tap(next(), `next${q}`);
    mark('q', { q });
  }
  await wait(1200);
  // palette: jump to Q9
  const fab = page.locator('button:has(svg.lucide-menu), button[aria-label*="alette" i], button[aria-label*="uestion" i]').filter({ visible: true }).last();
  await tap(fab, 'palette');
  await wait(1500);
  await dump('b-palette');
  await tap(page.getByRole('button', { name: '9', exact: true }).filter({ visible: true }).first(), 'jump9');
  await wait(+process.env.FAST ? 1300 : 23000);
  await tap(letter('A'), 'q9-A');
  await wait(750);
  await tap(next(), 'next9');
  await wait(1400);
  await tap(page.getByRole('button', { name: /Submit Test/ }).first(), 'submit');
  await wait(1500);
  await dump('b-submit');
  const dlg = page.getByRole('alertdialog').or(page.getByRole('dialog')).first();
  await tap(dlg.getByRole('button', { name: /submit/i }).last(), 'confirm');
  mark('submitted');
  await page.waitForURL((u) => !/\/live\//.test(u.href), { timeout: 30000 }).catch(() => {});
  mark('nav', { url: page.url() });
  await wait(6000);
  await dump('b-result');
  for (let i = 0; i < 6; i++) { await scrollBy(560, 1500); await wait(1300); }
  await dump('b-result-end');

} catch (e) {
  mark('end', { msg: String(e.message || e).slice(0, 300) });
  await dump('b-end').catch(() => {});
} finally {
  await R.finish();
}
