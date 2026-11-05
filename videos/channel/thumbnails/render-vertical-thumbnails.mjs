import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const baseDir = 'D:/Yuga Yatra/nkc-Test-platform/videos/channel/thumbnails';
const srcDir = path.join(baseDir, 'src');
const distDir = path.join(baseDir, 'dist-vertical');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const thumbs = [
  { file: 'vert-1-cbt.html', baseName: 'vert-1-cbt', videoId: 'lavITk04xgM', title: 'NTA-Style CBT Practice' },
  { file: 'vert-2-proctor.html', baseName: 'vert-2-proctor', videoId: 'SsvByTgk-QA', title: 'Can Students Cheat?' },
  { file: 'vert-3-sched.html', baseName: 'vert-3-sched', videoId: 'lG0tHZCOqjY', title: 'Make Your Exam Open & Close' },
  { file: 'vert-4-dpp-hi.html', baseName: 'vert-4-dpp-hi', videoId: 'Jd-AYSjA9F8', title: 'अपने DPP को 2 मिनट में (Hindi)' },
  { file: 'vert-5-dpp-en.html', baseName: 'vert-5-dpp-en', videoId: '4xKXBG6W9Ug', title: 'Turn your DPP into online test (English)' },
  { file: 'vert-6-pdf.html', baseName: 'vert-6-pdf', videoId: '6uLrstwyL1g', title: 'PDF से Online Test 2 मिनट में' },
  { file: 'vert-7-photo.html', baseName: 'vert-7-photo', videoId: 'J41o0W63udA', title: 'Book की Photo से Online Test 17s' }
];

async function render() {
  console.log('Launching browser for 1080x1920 vertical renders...');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });

  for (const t of thumbs) {
    const srcPath = path.join(srcDir, t.file);
    const pngPath = path.join(distDir, `${t.baseName}.png`);
    const jpgPath = path.join(distDir, `${t.baseName}.jpg`);
    const fileUrl = pathToFileURL(srcPath).href;

    console.log(`Rendering ${t.file} -> ${t.baseName}.png (1080x1920)...`);
    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    await page.screenshot({ path: pngPath, type: 'png' });

    // Generate high quality JPG under 2MB
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', pngPath, '-q:v', '2', jpgPath]);

    const pngSize = fs.statSync(pngPath).size;
    const jpgSize = fs.statSync(jpgPath).size;
    console.log(`✓ ${t.baseName}: PNG=${(pngSize/1024).toFixed(0)}KB, JPG=${(jpgSize/1024).toFixed(0)}KB`);
  }

  await browser.close();
  console.log('All 7 vertical thumbnails rendered successfully!');
}

render().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});

