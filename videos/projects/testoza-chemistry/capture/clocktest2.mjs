// Diagnostic: screencast timestamps vs arrival vs barcode on the real builder (nothing saved).
import { launch, session, login, Recorder, sleep, APP } from './rec-lib.mjs';
const browser = await launch();
const { page } = await session(browser, 'desktop');
await login(page);
await page.goto(APP + '/create-test', { waitUntil: 'load', timeout: 60000 });
await page.getByPlaceholder(/e\.g\. Class 10 Science/).waitFor({ timeout: 60000 });
await sleep(1500);
const rec = new Recorder(page, 'clock');
const origPush = rec.frames.push.bind(rec.frames);
rec.frames.push = (x) => origPush({ ...x, arr: Date.now() / 1000 });
await rec.start();
await page.getByPlaceholder(/e\.g\. Class 10 Science/).click();
for (let i = 0; i < 12; i++) {
  const m = rec.mark('m' + i, { pre: 0 });
  await m.flagged;
  await page.keyboard.type(`step ${i} — chemistry `, { delay: 60 });
  await sleep(800);
}
const f = rec.frames;
const rel = f.map((x) => ({ ts: x.t - rec.t0, arr: x.arr - rec.t0 }));
console.log('frames', f.length, 'first', JSON.stringify(rel[0]), 'last', JSON.stringify(rel.at(-1)));
console.log('sample', rel.filter((_, i) => i % Math.ceil(rel.length / 8) === 0).map((r) => `${r.ts.toFixed(2)}/${r.arr.toFixed(2)}`).join('  '));
await rec.stop();
const j = JSON.parse((await import('node:fs')).readFileSync(decodeURIComponent(new URL('./rec/clock.marks.json', import.meta.url).pathname.slice(1)), 'utf8'));
console.log(j.marks.map((m) => `${m.id} t ${m.t} tv ${m.tv}`).join(' | '));
await browser.close();
