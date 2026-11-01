// Renders the DPP booklet pages (flat PNG, for the film) and phone-style photos of page 1, page 2
// and the answer key (JPG, for the real upload). Run: node capture/dpp/render.mjs
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
mkdirSync(DIR + 'pages', { recursive: true });
mkdirSync(DIR + 'photos', { recursive: true });
const url = (f, q) => pathToFileURL(DIR + f).href + (q ? '?' + new URLSearchParams(q) : '');

const COVERS = {
  'cover-neet': { exam: 'NEET 2027', subj: 'PHYSICS', topic: 'DPP 01 – 12 · Kinematics', tone: '#1f2a44' },
  'cover-jee': { exam: 'JEE MAIN 2027', subj: 'MATHS', topic: 'DPP 01 – 15 · Calculus', tone: '#7a1f2b' },
  'cover-ssc': { exam: 'SSC CGL', subj: 'QUANT', topic: 'DPP 01 – 20 · Arithmetic', tone: '#1d5c4a' },
  'cover-bank': { exam: 'BANK PO', subj: 'REASONING', topic: 'DPP 01 – 20 · Puzzles', tone: '#6b3fa0' },
};

const browser = await chromium.launch();
const flat = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
for (const [name, q] of Object.entries(COVERS)) {
  await flat.goto(url('booklet.html', { p: 'cover', ...q }));
  await flat.waitForTimeout(300);
  await flat.screenshot({ path: `${DIR}pages/${name}.png` });
}
for (const p of ['1', '2', 'key']) {
  await flat.goto(url('booklet.html', { p }));
  await flat.waitForTimeout(300);
  await flat.screenshot({ path: `${DIR}pages/page-${p}.png` });
  console.log('page', p);
}

const cam = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });
const SHOTS = { 'IMG_3104': ['page-1', -1.6, 7, 0], 'IMG_3105': ['page-2', 1.2, 8, 1], 'IMG_3107': ['page-key', -0.8, 6, 2] };
for (const [name, [src, rz, rx, v]] of Object.entries(SHOTS)) {
  await cam.goto(url('photo.html', { src: `pages/${src}.png`, rz, rx, v }));
  await cam.waitForTimeout(500);
  await cam.screenshot({ path: `${DIR}photos/${name}.jpg`, type: 'jpeg', quality: 86 });
  console.log('photo', name);
}
await browser.close();
