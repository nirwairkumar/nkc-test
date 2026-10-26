// Renders thumb-vertical.html → ../thumbnail-en.png (1080x1920, the Short) and thumb-wide.html →
// ../thumbnail-en-wide.png (1280x720), plus JPGs under 2 MB for YouTube.
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
const b = await chromium.launch();
for (const [src, out, width, height] of [['thumb-vertical.html', 'thumbnail-en', 1080, 1920], ['thumb-wide.html', 'thumbnail-en-wide', 1280, 720]]) {
  const p = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await p.goto(pathToFileURL(DIR + src).href);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${DIR}../${out}.png` });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${DIR}../${out}.png`, '-q:v', '2', `${DIR}../${out}.jpg`]);
}
await b.close();
console.log('ok');
