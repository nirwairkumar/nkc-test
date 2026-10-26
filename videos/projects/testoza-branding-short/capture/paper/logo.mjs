import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const dir = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 512, height: 512 } });
await p.setContent(`<html><body style="margin:0;background:transparent">${readFileSync(dir + 'logo.svg', 'utf8')}</body></html>`);
await p.locator('svg').screenshot({ path: dir + 'apex-academy-logo.png', omitBackground: true });
await b.close();
