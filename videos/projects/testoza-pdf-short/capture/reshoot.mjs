// Re-shoot single screens from their capture/ui/*.src.html after a small text fix
// (same viewport + scale as ui-shots.mjs). Usage: node capture/reshoot.mjs mytests phone-gateway
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('D:/Yuga Yatra/nkc-Test-platform/frontend/package.json');
const { chromium } = require('playwright');
const OUT = 'D:/Yuga Yatra/nkc-Test-platform/videos/projects/testoza-pdf-short/capture/ui/';
const FIX = [['31 questions', '30 questions'], ['text-slate-800">31<', 'text-slate-800">30<']];
const browser = await chromium.launch();
for (const name of process.argv.slice(2)) {
  const phone = name.startsWith('phone');
  const file = `${OUT}${name}.src.html`;
  let html = readFileSync(file, 'utf8');
  for (const [a, b] of FIX) html = html.split(a).join(b);
  writeFileSync(file, html);
  const ctx = await browser.newContext(phone ? { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 } : { viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('file:///' + file);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${OUT}${name}.png`, fullPage: !phone });
  await ctx.close();
  console.log(name);
}
await browser.close();
