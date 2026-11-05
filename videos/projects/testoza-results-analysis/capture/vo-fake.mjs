// Placeholder voice: silent clips with estimated word timings, in the same shape the real voice
// (vo-eleven.mjs) writes. Lets the edit, the 2D scenes and the sync check run before the voice exists.
// Never rendered for delivery. Usage: node capture/vo-fake.mjs [wordsPerSecond=2.6]
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { lines } from './script.mjs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const WPS = Number(process.argv[2] || 2.6);
mkdirSync(ROOT + 'assets/vo-en', { recursive: true });
const vo = [];
for (const L of lines()) {
  const words = [];
  let t = 0.08;
  for (const w of L.text.split(/\s+/).filter(Boolean)) {
    const d = Math.max(0.16, (w.replace(/[^a-z0-9]/gi, '').length / 5.2) / WPS * 1.15);
    words.push({ id: `w${words.length}`, text: w, start: +t.toFixed(3), end: +(t + d).toFixed(3) });
    t += d + 0.04;
    if (/[.?!]$/.test(w)) t += 0.42; else if (/[,;:]$/.test(w)) t += 0.2; else if (/(…|—)$/.test(w) || w === '—') t += 0.32;
  }
  const duration = +(t + 0.15).toFixed(3);
  const file = `assets/vo-en/${L.id}.wav`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=mono`, '-t', String(duration), ROOT + file]);
  writeFileSync(ROOT + `assets/vo-en/${L.id}.words.json`, JSON.stringify(words, null, 1));
  vo.push({ id: L.id, file, duration, text: L.text, raw: L.raw, placeholder: true });
}
writeFileSync(ROOT + 'assets/vo-en/vo.json', JSON.stringify(vo, null, 2));
console.log(`${vo.length} placeholder lines, ${vo.reduce((s, v) => s + v.duration, 0).toFixed(1)} s of voice`);
