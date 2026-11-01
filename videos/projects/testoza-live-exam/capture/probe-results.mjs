// Look-only: log the data requests behind the dashboard live card and the Results panel, so
// stage.mjs can answer them with the tutorial's numbers in the same shape.
import { launch, session, login, sleep, state, APP } from './rec-lib.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'capture/probe/net/';
mkdirSync(OUT, { recursive: true });
const browser = await launch();
const { page } = await session(browser, 'desktop');
let n = 0;
page.on('response', async (r) => {
  const u = r.url();
  if (!/rest\/v1\/(user_tests|test_registrations|tests)|\/attempts\/|\/api\/tests/.test(u)) return;
  let body = '';
  try { body = await r.text(); } catch {}
  const file = `${OUT}${String(++n).padStart(2, '0')}-${r.request().method()}-${u.replace(/^https?:\/\/[^/]+/, '').replace(/[^a-z0-9]+/gi, '_').slice(0, 90)}.txt`;
  writeFileSync(file, `${r.request().method()} ${u}\nstatus ${r.status()}\n\n${body.slice(0, 20000)}`);
});
await login(page);
await page.goto(APP + '/dashboard', { waitUntil: 'load', timeout: 60000 });
await sleep(8000);
await page.screenshot({ path: 'capture/probe/dash-live.png' });
await page.screenshot({ path: 'capture/probe/dash-live-full.png', fullPage: true });
const btns = await page.evaluate(() => [...document.querySelectorAll('button,a')].filter((b) => b.offsetParent).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 60));
console.log(btns.join(' | '));
const res = page.getByRole('button', { name: /^results/i }).filter({ visible: true }).first();
if (await res.isVisible().catch(() => false)) {
  await res.click();
  await sleep(5000);
  await page.screenshot({ path: 'capture/probe/results-panel.png' });
}
console.log('testId', state.read().testId, 'responses', n);
await browser.close();
