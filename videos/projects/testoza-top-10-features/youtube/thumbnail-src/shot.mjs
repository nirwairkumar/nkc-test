// Renders thumb.html → ../thumbnail-en.png (1280x720) and a JPG under 2 MB for YouTube.
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(DIR + 'thumb.html').href);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(600);
await p.screenshot({ path: DIR + '../thumbnail-en.png' });
await b.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', DIR + '../thumbnail-en.png', '-q:v', '2', DIR + '../thumbnail-en.jpg']);
console.log('ok');
