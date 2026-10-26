// Probe: signs in as the demo educator and saves a screenshot + visible controls of each page.
// Usage: TZ_EMAIL=… TZ_PASSWORD=… node capture/probe.mjs [path,path…]
import { launch, session, login, sleep, APP } from './rec-lib.mjs';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const paths = (process.argv[2] || '/generate-with-ai,/my-tests,/create-test').split(',');
const browser = await launch();
const { page } = await session(browser, 'desktop');
await login(page);
for (const p of paths) {
  await page.goto(APP + p, { waitUntil: 'load', timeout: 60000 });
  await sleep(5000);
  const name = p.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home';
  const png = `capture/probe/${name}.png`;
  await page.screenshot({ path: png });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', 'scale=1152:-1', '-q:v', '4', png.replace('.png', '.jpg')]);
  const ctl = await page.evaluate(() => [...document.querySelectorAll('button, a, [role=switch], [role=tab], input, select, textarea')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => `${e.tagName.toLowerCase()}${e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''} "${(e.innerText || e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 60)}"`)
    .filter((s, i, a) => a.indexOf(s) === i));
  writeFileSync(`capture/probe/${name}.txt`, page.url() + '\n' + ctl.join('\n'));
  console.log(p, '→', page.url(), ctl.length, 'controls');
}
await browser.close();
