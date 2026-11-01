// Real run A (prod, demo student): pick 2 DPP page photos + answer-key photo → NEET marking →
// Extract → wait for the AI → preview scroll → Save & continue → My Tests.
// RUN_DIR=runA1/ node capture/run-a.mjs
import { start } from './rec.mjs';
const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
const OUT = DIR + (process.env.RUN_DIR || 'runA1/');
const R = await start(OUT);
const { page, mark, wait, tap, scrollTo, scrollBy, dump } = R;
try {
  await page.goto('https://app.testoza.com/generate-with-ai', { waitUntil: 'load' });
  await page.getByRole('button', { name: /Choose File/ }).first().waitFor({ timeout: 20000 });
  await wait(2000);
  await R.rec();
  await wait(1200);

  let fc = page.waitForEvent('filechooser');
  await tap(page.getByRole('button', { name: /Choose File/ }).first(), 'choose');
  await (await fc).setFiles([DIR + 'dpp/photos/IMG_3104.jpg', DIR + 'dpp/photos/IMG_3105.jpg']);
  mark('files');
  await wait(2200);

  const key = page.getByRole('button', { name: 'Upload key' });
  await scrollTo(key, 300);
  await wait(500);
  fc = page.waitForEvent('filechooser');
  await tap(key, 'key');
  await (await fc).setFiles(DIR + 'dpp/photos/IMG_3107.jpg');
  mark('keyfile');
  await wait(1600);

  const four = page.locator('main').getByRole('button', { name: '4', exact: true }).first();
  await scrollTo(four, 380);
  await wait(400);
  await tap(four, 'marks4');
  await wait(600);
  await tap(page.locator('main').getByRole('button', { name: '1', exact: true }).last(), 'neg1');
  await wait(900);
  await dump('a-settings');

  const ex = page.getByRole('button', { name: /Extract Questions/ }).first();
  await scrollTo(ex, 420, 1000);
  await wait(500);
  await tap(ex, 'extract');
  mark('extract');
  const tEx = Date.now();
  let last = '';
  let pills = 0;
  for (;;) {
    const body = await page.locator('body').innerText().catch(() => '');
    const qs = (body.match(/(\d+) questions? so far/) || [])[1] || '';
    if (qs !== last) { mark('count', { qs }); last = qs; }
    // the app's own "↓ N new questions" pill jumps down to the list as questions stream in
    const pill = page.locator('.aix-newpill');
    if (pills < 6 && await pill.isVisible().catch(() => false)) { await wait(700); await tap(pill, 'newpill'); pills++; }
    if (/Your questions are ready/.test(body)) { mark('ready'); break; }
    if (/connection closed|Please try again|Something went wrong|Processing failed/i.test(body)) { mark('error'); await dump('a-error'); throw new Error('AI run failed'); }
    if (Date.now() - tEx > 300000) throw new Error('timeout');
    await wait(250);
  }
  await wait(1500);
  await dump('a-ready');
  await page.getByRole('button', { name: /Save & continue/ }).waitFor({ timeout: 30000 });
  mark('preview');
  await wait(1800);
  await dump('a-preview');
  await scrollBy(900, 1600);
  await wait(900);
  await scrollBy(900, 1600);
  await wait(900);
  const save = page.getByRole('button', { name: /Save & continue/ });
  await scrollTo(save, 600, 900).catch(() => {});
  await wait(700);
  await tap(save, 'save');
  mark('save');
  await page.waitForURL((u) => !/generate-with-ai/.test(u.href), { timeout: 30000 });
  mark('nav', { url: page.url() });
  await wait(5000);
  await dump('a-after-save');
} catch (e) {
  mark('fail', { msg: String(e.message || e).slice(0, 300) });
  await dump('a-fail').catch(() => {});
} finally {
  await R.finish();
}
