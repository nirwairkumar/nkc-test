import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
const dir = new URL('./', import.meta.url);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
for (const l of ['en', 'hi']) {
  await p.goto(new URL('thumb.html', dir).href + '#' + l);
  await p.reload();
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: new URL(`thumb-${l}.png`, dir).pathname.slice(1).replace(/%20/g, ' ') });
}
await b.close();
