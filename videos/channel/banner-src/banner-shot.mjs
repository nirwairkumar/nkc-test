import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
const dir = new URL('./', import.meta.url);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 2560, height: 1440 } });
await p.goto(new URL('banner.html', dir).href);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await p.screenshot({ path: decodeURIComponent(new URL('banner.png', dir).pathname.slice(1)) });
await b.close();
