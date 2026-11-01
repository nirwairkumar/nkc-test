// Renders the YouTube channel banners:
//   1. wordmark.png — the site logo's exact construction, trimmed to its ink
//   2. banner-*.html at 2560 x 1440 → ../youtube-banner-*.png (JPEG if a PNG passes YouTube's 6 MB cap)
//   3. guide overlays (crop lines) → guides/  and a preview sheet → ../banner-preview.png
// Run: node videos/channel/banner-src/build.mjs
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { mkdirSync, statSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = new URL('./', import.meta.url);
const out = new URL('../', src);
const fsPath = (u) => fileURLToPath(u);
const BANNERS = [
  ['banner-a.html', 'youtube-banner-a-signature'],
  ['banner-b.html', 'youtube-banner-b-product'],
  ['banner-c.html', 'youtube-banner-c-paper'],
];
const only = process.argv[2];  // e.g. "b" renders just banner-b

const browser = await chromium.launch();
const ready = async (p) => { await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250); };

// 1. Wordmark, trimmed to the first and last non-transparent pixel.
if (!only) {
  const p = await browser.newPage({ viewport: { width: 4800, height: 960 } });
  await p.goto(new URL('wordmark.html', src).href);
  await ready(p);
  const shot = await p.screenshot({ omitBackground: true });
  const clip = await p.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    let t = height, l = width, r = 0, b = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 4) { if (y < t) t = y; if (y > b) b = y; if (x < l) l = x; if (x > r) r = x; }
    }
    return { x: l, y: t, width: r - l + 1, height: b - t + 1 };
  }, shot.toString('base64'));
  await p.screenshot({ path: fsPath(new URL('wordmark.png', src)), clip, omitBackground: true });
  console.log('wordmark', clip.width + 'x' + clip.height);
  await p.close();
}

// 2. Banners, plus a copy with the crop lines drawn on.
mkdirSync(new URL('guides/', src), { recursive: true });
for (const [html, name] of BANNERS) {
  if (only && !html.includes('-' + only + '.')) continue;
  const p = await browser.newPage({ viewport: { width: 2560, height: 1440 } });
  await p.goto(new URL(html, src).href);
  await ready(p);
  const png = fsPath(new URL(name + '.png', out));
  await p.screenshot({ path: png });
  let file = png, size = statSync(png).size;
  if (size > 6e6) {
    file = png.replace(/\.png$/, '.jpg');
    await p.screenshot({ path: file, type: 'jpeg', quality: 93 });
    unlinkSync(png);
    size = statSync(file).size;
  }
  console.log(name, (size / 1e6).toFixed(2) + ' MB', file.endsWith('.jpg') ? '(jpg)' : '(png)');
  await p.goto(new URL(html + '?guides', src).href);
  await ready(p);
  await p.screenshot({ path: fsPath(new URL('guides/' + name + '-guides.png', src)) });
  await p.close();
}

// 3. Preview sheet: how YouTube crops each banner on desktop, phone and TV.
if (!only) {
  const p = await browser.newPage({ viewport: { width: 1500, height: 800 } });
  await p.goto(new URL('preview.html', src).href);
  await ready(p);
  await p.screenshot({ path: fsPath(new URL('banner-preview.png', out)), fullPage: true });
  console.log('preview written');
  await p.close();
}
await browser.close();
