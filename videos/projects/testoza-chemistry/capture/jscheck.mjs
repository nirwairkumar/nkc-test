// Load index.html and report runtime errors from the scene script (diagnostic).
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.addInitScript(() => { window.__timelines = {}; });
await p.goto('file:///D:/Yuga%20Yatra/nkc-Test-platform/videos/projects/testoza-chemistry/index.html');
await p.waitForTimeout(4000);
const ok = await p.evaluate(() => !!window.__timelines.main && window.__timelines.main.duration());
console.log('timeline duration', ok);
console.log(errs.slice(0, 8).join('\n') || 'no errors');
await b.close();
