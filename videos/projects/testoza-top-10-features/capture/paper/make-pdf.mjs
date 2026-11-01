// The original NEET-style DPP (testoza-dpp-short/capture/dpp, no real institute) as one 3-page PDF
// for the AI-import take. Run: node capture/paper/make-pdf.mjs
import { chromium } from 'file:///D:/Yuga%20Yatra/nkc-Test-platform/frontend/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
const b = await chromium.launch();
const p = await b.newPage();
const img = (f) => `<div class="pg"><img src="data:image/png;base64,${readFileSync(DIR + f).toString('base64')}"></div>`;
await p.setContent(`<style>@page{size:1240px 1754px;margin:0}html,body{margin:0}.pg{width:1240px;height:1754px;page-break-after:always}.pg img{width:1240px;height:1754px;display:block}</style>${img('page-1.png')}${img('page-2.png')}${img('page-key.png')}`);
await p.waitForTimeout(500);
await p.pdf({ path: DIR + 'DPP-07-Motion-in-a-Straight-Line.pdf', width: '1240px', height: '1754px', printBackground: true });
await b.close();
console.log('ok');
