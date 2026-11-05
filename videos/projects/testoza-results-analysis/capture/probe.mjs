// Off camera: stage the class and screenshot every screen the takes will use (capture/probe/*.png).
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/probe.mjs [panel|report|all|sheet]
import { mkdirSync } from 'node:fs';
import { launch, session, login, state, sleep, APP, DIR } from './rec-lib.mjs';
import { stage } from './stage.mjs';

const only = process.argv[2];
const OUT = DIR + 'probe/';
mkdirSync(OUT, { recursive: true });
const { testId, userId } = state.read();
const browser = await launch();
const { context, page } = await session(browser, 'desktop');
page.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 160)));
await login(page);
await stage(context, { testId, userId });
const shot = async (name, full = false) => { await page.screenshot({ path: OUT + name + '.png', fullPage: full }); console.log('shot', name); };

if (!only || only === 'panel' || only === 'sheet') {
  await page.goto(APP + '/my-tests', { waitUntil: 'load', timeout: 60000 });
  await page.getByRole('heading', { name: 'All tests' }).waitFor({ timeout: 60000 });
  await sleep(6000);
  await shot('mytests', true);
  await page.getByText('Ended exams').first().click();
  await sleep(2500);
  await shot('mytests-ended');
  const btn = page.getByRole('button', { name: /^results/i }).filter({ visible: true }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.getByText(/fetching results/i).first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await sleep(2500);
    await shot('panel-started');
    for (const t of ['Submitted', 'Dropped']) {
      await page.getByText(new RegExp('^' + t + '$', 'i')).filter({ visible: true }).last().click();
      await sleep(1500);
      await shot('panel-' + t.toLowerCase());
    }
    await page.getByText(/^Submitted$/i).filter({ visible: true }).last().click();
    await page.getByRole('switch').filter({ visible: true }).first().click();
    await sleep(1200);
    await shot('panel-ranked');
    if (only === 'sheet' || !only) {
      await page.getByRole('button', { name: 'View result' }).filter({ visible: true }).first().click();
      await sleep(6000);
      await shot('sheet-overview');
      for (const t of ['Topic Performance', 'Questions breakdown']) {
        await page.getByRole('button', { name: t }).click(); await sleep(1500); await shot('sheet-' + t.split(' ')[0].toLowerCase());
      }
      await page.keyboard.press('Escape'); await sleep(800);
    }
  } else console.log('no Results button visible');
}
if (!only || only === 'report') {
  await page.goto(`${APP}/analytics/full?testId=${testId}`, { waitUntil: 'load', timeout: 60000 });
  await page.getByText('How the class did').waitFor({ timeout: 60000 });
  await sleep(3000);
  await shot('report-top');
  await shot('report-full', true);
  await page.getByRole('button', { name: /^Q13/ }).first().click().catch((e) => console.log('Q13', e.message));
  await sleep(1500);
  await shot('report-q13');
}
if (!only || only === 'all') {
  await page.goto(APP + '/all-submissions', { waitUntil: 'load', timeout: 60000 });
  await page.getByText('Exams your candidates wrote').waitFor({ timeout: 60000 }).catch(() => console.log('no written list'));
  await sleep(3000);
  await shot('all', true);
}
await browser.close();
