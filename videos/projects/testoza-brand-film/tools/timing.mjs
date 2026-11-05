// Voice clock: where each paragraph of the chosen take sits in the film.
import fs from 'node:fs';
const take = JSON.parse(fs.readFileSync(new URL('../gen/vo/take-s11.json', import.meta.url)));
export const words = take.words.filter(w => !/^\[|\]$/.test(w.w));
// paragraph first words (source time) -> film time of that first word
export const PARAS = [
  { first: 0, film: 1.0 },     // One day ...
  { first: 31, film: 13.8 },   // Because until then ...
  { first: 0, film: 34.8, key: 'But' },
  { first: 0, film: 39.6, key: 'With' },
  { first: 0, film: 60.0, key: 'The', after: 'last.' },
  { first: 0, film: 72.3, key: 'Your' },
  { first: 0, film: 75.3, key: 'So' },
  { first: 0, film: 80.4, key: 'Because', after: 'new.' },
];
// paragraph starts = words that follow a gap > 0.35 s (plus the first word)
const starts = [0];
for (let i = 1; i < words.length; i++) if (words[i].start - words[i - 1].end > 0.35) starts.push(i);
export const paragraphs = starts.map((s, k) => {
  const e = (starts[k + 1] ?? words.length) - 1;
  return { from: s, to: e, srcStart: words[s].start, srcEnd: words[e].end, film: PARAS[k].film, offset: PARAS[k].film - words[s].start };
});
export function filmTime(i) { const p = paragraphs.find(p => i >= p.from && i <= p.to); return { start: words[i].start + p.offset, end: words[i].end + p.offset }; }
if (process.argv[1].endsWith('timing.mjs')) {
  for (const p of paragraphs) console.log(`para ${words[p.from].w}… src ${p.srcStart.toFixed(2)}-${p.srcEnd.toFixed(2)} film ${(p.srcStart + p.offset).toFixed(2)}-${(p.srcEnd + p.offset).toFixed(2)} (+${p.offset.toFixed(2)})`);
  console.log(words.map((w, i) => `${w.w}@${filmTime(i).start.toFixed(2)}`).join(' '));
}
