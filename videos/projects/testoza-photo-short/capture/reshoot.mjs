// Re-shoot the launch film's real screens (copied .src.html from ../testoza-pdf-short/capture/ui)
// with this test's text: the photo run's title, 10 questions, +1 / -0 marks, question 1.
// Same viewport + scale as the PDF Short. Run from the project root: node capture/reshoot.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('D:/Yuga Yatra/nkc-Test-platform/frontend/package.json');
const { chromium } = require('playwright');
const OUT = 'D:/Yuga Yatra/nkc-Test-platform/videos/projects/testoza-photo-short/capture/ui/';
const FIX = [
  ['JEE Main 2026 · Physics Mock Test 01', 'Science Class 10 - Chapter 5 Practice Exercise 5.3'],
  ['30 questions', '10 questions'], ['60 min', '15 min'],
  ['59:41', '14:41'], ['59:38', '14:38'], ['Question 2', 'Question 1'],
  ['text-emerald-700">+4<', 'text-emerald-700">+1<'], ['text-red-600">-1<', 'text-red-600">-0<'],
  ['Two resistors of 4 Ω and 12 Ω are connected in parallel. Their equivalent resistance is:', 'The SI unit of force is'],
  ['>3 Ω<', '>joule<'], ['>8 Ω<', '>newton<'], ['>16 Ω<', '>watt<'], ['>48 Ω<', '>pascal<'],
];
const OLD = ['JEE Main', 'Two resistors', '48 Ω', 'Question 2'];
const browser = await chromium.launch();
for (const f of readdirSync(OUT).filter((n) => n.endsWith('.src.html'))) {
  const name = f.replace('.src.html', '');
  const phone = name.startsWith('phone');
  let html = readFileSync(OUT + f, 'utf8');
  for (const [a, b] of FIX) html = html.split(a).join(b);
  const left = OLD.filter((s) => html.includes(s));
  if (left.length) console.warn(`! ${name} still has: ${left.join(', ')}`);
  writeFileSync(OUT + f, html);
  const ctx = await browser.newContext(phone ? { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 } : { viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('file:///' + OUT + f);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${OUT}${name}.png`, fullPage: !phone });
  await ctx.close();
  console.log(name);
}
await browser.close();
