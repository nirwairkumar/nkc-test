// Board v2: run the tutorial's steps on the real app.testoza.com builder and take the stills.
// Usage: node board.mjs [firstStep] [lastStep]   (credentials via TZ_EMAIL / TZ_PASSWORD). Nothing is saved.
import { open, shot } from './lib.mjs';
import * as S from './steps.mjs';
import { writeFileSync } from 'node:fs';

const ORDER = ['details', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'sectionsOn', 'q7', 'mathsSection', 'splitMerge'];
const last = process.argv[3] || ORDER[ORDER.length - 1];
const { browser, page } = await open();
page.setDefaultTimeout(12000);
const log = [];
for (const name of ORDER.slice(0, ORDER.indexOf(last) + 1)) {
  try { await S[name](page); log.push('ok   ' + name); }
  catch (e) {
    const at = (e.stack || '').split('\n').find((l) => l.includes('steps.mjs')) || '';
    log.push('FAIL ' + name + ' :: ' + e.message.split('\n')[0] + ' @ ' + at.trim());
    await shot(page, 'fail-' + name);
    break;
  }
}
writeFileSync(new URL('./shots/board-log.txt', import.meta.url), log.join('\n'));
console.log(log.join('\n'));
await browser.close();
