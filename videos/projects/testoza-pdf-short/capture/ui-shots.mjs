// Real TestoZa screens for the Short: the launch film's server-rendered UI fragments
// (../testoza-launch/ui/ssr, the app's own components with sample data), wrapped in the app's
// own CSS and screenshot sharp — phones at 3x, desktop screens at 2x — into capture/ui/.
// Run from the project root: node capture/ui-shots.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('D:/Yuga Yatra/nkc-Test-platform/frontend/package.json');
const { chromium } = require('playwright');

const LAUNCH = 'D:/Yuga Yatra/nkc-Test-platform/videos/projects/testoza-launch/';
const OUT = 'D:/Yuga Yatra/nkc-Test-platform/videos/projects/testoza-pdf-short/capture/ui/';
mkdirSync(OUT, { recursive: true });

const PHONE = ['phone-join-0', 'phone-join-1', 'phone-join-2', 'phone-join-3', 'phone-join-4', 'phone-join-5', 'phone-join-6',
    'phone-gateway', 'phone-exam-0', 'phone-exam-1', 'phone-exam-sub', 'phone-done'];
const DESK = ['upload-1', 'upload-2', 'processing-0', 'processing-1', 'processing-2', 'processing-3', 'processing-4', 'processing-done',
    'preview', 'mytests', 'conduct', 'toast-code', 'results', 'results-2'];

const css = ['assets/fonts.css', 'assets/app.css'].map((p) => `<link rel="stylesheet" href="file:///${LAUNCH}${p}">`).join('');
const page = (body, phone) => `<!doctype html><html><head><meta charset="utf-8">${css}
<style>html,body{margin:0;background:${phone ? '#f2f2f7' : '#f5f5f7'}}${phone ? 'body{min-height:100vh}#r{min-height:100vh;display:flex;flex-direction:column}' : '#r{padding:0}'}</style>
</head><body><div id="r">${body}</div></body></html>`;

const browser = await chromium.launch();
for (const [list, phone] of [[PHONE, true], [DESK, false]]) {
    const ctx = await browser.newContext(phone ? { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 } : { viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    for (const name of list) {
        const html = readFileSync(`${LAUNCH}ui/ssr/${name}.html`, 'utf8');
        const file = `${OUT}${name}.src.html`;
        writeFileSync(file, page(html, phone));
        await p.goto('file:///' + file);
        await p.evaluate(() => document.fonts.ready);
        await p.waitForTimeout(250);
        await p.screenshot({ path: `${OUT}${name}.png`, fullPage: !phone });
        console.log(name);
    }
    await ctx.close();
}
await browser.close();
