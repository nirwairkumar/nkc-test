// Probe: what My Tests → Preview shows (read-only).
import { launch, session, login, sleep, APP } from './rec-lib.mjs';
const OUT = decodeURIComponent(new URL('./probe/', import.meta.url).pathname.slice(1));
const browser = await launch();
const { page } = await session(browser, 'desktop');
try {
  await login(page);
  await page.goto(APP + '/my-tests', { waitUntil: 'load', timeout: 60000 });
  await page.getByRole('heading', { name: 'All tests' }).waitFor({ timeout: 60000 });
  await sleep(6000);
  await page.getByRole('heading', { name: 'All tests' }).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 400); await sleep(2500);
  await page.screenshot({ path: OUT + '59-mytests.png' });
  const prev = page.getByText('Preview', { exact: true }).filter({ visible: true }).first();
  console.log('preview buttons', await page.getByText('Preview', { exact: true }).count());
  const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 5000 }).catch(() => null), prev.click()]);
  const p = popup || page;
  await sleep(4000);
  console.log('url', p.url(), popup ? '(new tab)' : '(same tab)');
  await p.screenshot({ path: OUT + '60-preview.png' });
  await p.mouse.wheel(0, 700); await sleep(1200);
  await p.screenshot({ path: OUT + '61-preview-scroll.png' });
  console.log((await p.locator('body').innerText()).slice(0, 600));
} catch (e) { console.log('FAIL', e.message.split('\n')[0]); }
await browser.close();
