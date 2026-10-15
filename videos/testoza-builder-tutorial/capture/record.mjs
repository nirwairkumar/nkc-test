// Final recording: the whole tutorial on the real app.testoza.com, as one continuous video with
// a mark at the start of every step (seconds since the video began). Saves ONE real test on the
// demo account (owner accepted). Credentials via TZ_EMAIL / TZ_PASSWORD.
import { open, shot, setMark } from './lib.mjs';
import * as S from './steps.mjs';
import { writeFileSync, mkdirSync, renameSync } from 'node:fs';

const OUT = decodeURIComponent(new URL('./rec/', import.meta.url).pathname.slice(1));
mkdirSync(OUT, { recursive: true });
process.env.TZ_FAST = process.env.TZ_FAST || '28';
process.env.TZ_PAUSE = process.env.TZ_PAUSE || '1500';

// Full desktop size: at 1280x720 Sy Pad covers half the page and option boxes slide under the top bar.
const { browser, context, page } = await open({ recordVideo: OUT, viewport: { width: 1920, height: 1080 }, scale: 1, cursor: true });
page.setDefaultTimeout(15000);
const marks = {};
const at = () => +((Date.now() - page.__t0) / 1000).toFixed(2);
setMark((name) => { marks[name] = at(); console.log('mark', name, marks[name]); });

const log = [];
async function run(name, fn) {
  setMark((n) => { marks[n] = at(); });
  marks[name] = at();
  try { await fn(); log.push('ok   ' + name); }
  catch (e) {
    const where = (e.stack || '').split('\n').find((l) => l.includes('steps.mjs')) || '';
    log.push('FAIL ' + name + ' :: ' + e.message.split('\n')[0] + ' @ ' + where.trim());
    await shot(page, 'rec-fail-' + name);
    throw e;
  }
  await page.waitForTimeout(2500); // a beat to breathe at the end of every step
}

try {
  // Start like a teacher: the dashboard, then Create Test from the menu.
  await run('open', async () => {
    await page.goto('https://app.testoza.com/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const link = page.getByRole('link', { name: /create test/i }).first();
    if (await link.isVisible().catch(() => false)) await link.click();
    else await page.goto('https://app.testoza.com/create-test');
    await page.waitForURL(/create-test/);
    await page.waitForTimeout(2000);
  });
  for (const name of ['details', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'sectionsOn', 'q7', 'mathsSection', 'splitMerge', 'saveAndCandidate']) {
    await run(name, () => S[name](page));
  }
  marks.end = at();
} finally {
  writeFileSync(OUT + 'marks.json', JSON.stringify(marks, null, 2));
  writeFileSync(OUT + 'log.txt', log.join('\n'));
  const video = page.video();
  await context.close();
  if (video) { const p = await video.path(); renameSync(p, OUT + 'recording.webm'); }
  await browser.close();
  console.log(log.join('\n'));
}
