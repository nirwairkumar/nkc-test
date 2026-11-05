import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const baseDir = 'D:/Yuga Yatra/nkc-Test-platform/videos/channel/thumbnails';
const srcDir = path.join(baseDir, 'src');
const distDir = path.join(baseDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const thumbs = [
  { file: 'thumb-1-cbt.html', out: 'thumb-1-cbt.png', videoId: 'lavITk04xgM' },
  { file: 'thumb-2-proctor.html', out: 'thumb-2-proctor.png', videoId: 'SsvByTgk-QA' },
  { file: 'thumb-3-dpp.html', out: 'thumb-3-dpp.png', videoId: 'Jd-AYSjA9F8' },
  { file: 'thumb-4-pdf.html', out: 'thumb-4-pdf.png', videoId: '6uLrstwyL1g' },
  { file: 'thumb-5-photo.html', out: 'thumb-5-photo.png', videoId: 'J41o0W63udA' },
  { file: 'thumb-6-results.html', out: 'thumb-6-results.png', videoId: 'RWaYA4YlRYY' },
  { file: 'thumb-7-sched.html', out: 'thumb-7-sched.png', videoId: 'lG0tHZCOqjY' }
];

async function render() {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

  for (const t of thumbs) {
    const srcPath = path.join(srcDir, t.file);
    const outPath = path.join(distDir, t.out);
    const fileUrl = pathToFileURL(srcPath).href;

    console.log(`Rendering ${t.file} -> ${t.out}...`);
    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`✓ Rendered ${t.out} (${fs.statSync(outPath).size} bytes)`);
  }

  await browser.close();
  console.log('All thumbnails rendered successfully!');
}

render().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});

