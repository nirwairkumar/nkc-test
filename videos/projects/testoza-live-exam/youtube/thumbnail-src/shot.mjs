// Renders thumb.html → ../thumbnail-en.png (1280×720) plus a small preview at YouTube's list size.
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
const dir = new URL('./', import.meta.url);
const path = (u) => decodeURIComponent(new URL(u, dir).pathname.slice(1));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(new URL('thumb.html', dir).href);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await p.screenshot({ path: path('../thumbnail-en.png') });
await b.close();
