// Hindi voice on the English picture: every Hindi sentence starts where its English sentence
// starts (so it plays over the same shots), flows on when the line before ran long, never
// crosses a hard picture boundary, and is squeezed (pitch kept) by at most MAX_TEMPO.
//   node tools/dub-hi.mjs gen/vo/take-hi-s33 [--dry]
// Writes assets/audio/vo-hi.wav and assets/audio/dub-hi.json (the placement, per sentence).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { words as enWords, filmTime } from './timing.mjs';

const take = process.argv[2];
const dry = process.argv.includes('--dry');
const END = 89.8;
const MAX_TEMPO = 1.08;
const GAP = 0.12;  // least breath between two sentences of one paragraph
const EARLY = { 20: 0.45 };  // may start this much before the English line (its shot is already up)

// English sentences on the film clock (the anchors)
const en = [];
let cur = null;
enWords.forEach((w, i) => {
  if (!cur) cur = { from: i };
  if (/[.?!]$/.test(w.w)) { cur.to = i; en.push(cur); cur = null; }
});
const anchors = en.map(s => filmTime(s.from).start);
// where a sentence must be finished: the next picture world (cut, the turn, results, end card)
const HARD = { 2: 12.45, 7: 33.25, 8: 39.3, 13: 59.9, 17: 71.4, 18: 75.2, 19: 80.3, 20: 82.6 };

// Hindi sentences from the take's alignment (performance tags dropped)
const hiTake = JSON.parse(fs.readFileSync(`${take}.json`, 'utf8'));
const hw = hiTake.words.filter(w => !/^\[|\]$/.test(w.w));
const hi = [];
cur = null;
hw.forEach((w, i) => {
  if (!cur) cur = { from: i, text: [] };
  cur.text.push(w.w);
  if (/[।?!.]$/.test(w.w)) { cur.to = i; hi.push(cur); cur = null; }
});
if (hi.length !== en.length) throw new Error(`Hindi has ${hi.length} sentences, English ${en.length}`);

// decode the take once to find where speech really ends (alignment folds silence into the last word)
const SR = 48000;
const pcm = spawnSync('ffmpeg', ['-v', 'error', '-i', `${take}.mp3`, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 }).stdout;
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
const db = (t0, t1) => {
  let e = 0, n = 0;
  for (let i = Math.max(0, Math.floor(t0 * SR)); i < Math.min(x.length, Math.floor(t1 * SR)); i++) { e += x[i] * x[i]; n++; }
  return 10 * Math.log10(e / Math.max(n, 1) + 1e-12);
};
const speechEnd = (from, limit) => {  // first 120 ms window under -42 dB after `from`
  for (let t = from; t < limit; t += 0.02) if (db(t, t + 0.12) < -42) return t + 0.04;
  return limit;
};
const speechStart = (to, floor) => {  // walk back from the first word's start while still voiced
  let t = to;
  while (t - 0.02 > floor && db(t - 0.02, t) > -42) t -= 0.02;
  return t;
};

// cut each sentence out of the take (with its in-breath and its real tail)
const cutsrc = hi.map((s, k) => {
  const first = hw[s.from], last = hw[s.to];
  const nextStart = hi[k + 1] ? hw[hi[k + 1].from].start : last.end + 1;
  const prevEnd = k ? hw[hi[k - 1].to].end : 0;
  const a = Math.max(0, speechStart(first.start, prevEnd) - 0.06);
  const b = Math.min(speechEnd(last.start + 0.1, Math.min(last.end + 0.6, nextStart)) + 0.08, nextStart);
  return { a, b, gap: k ? first.start - hw[hi[k - 1].to].end : 0 };
});

// blocks end at a hard picture boundary; inside a block the take keeps its own rhythm (its pauses),
// each line waits for its English line, and only if the block would cross its boundary is the
// whole block played a little faster, evenly
const blocks = [];
let open = [];
hi.forEach((_, k) => { open.push(k); if (HARD[k] !== undefined) { blocks.push(open); open = []; } });
if (open.length) blocks.push(open);
const segs = [];
let prevEnd = 0;
for (const block of blocks) {
  const limit = HARD[block.at(-1)] ?? END;
  let placed = null;
  for (let t = 1; t <= MAX_TEMPO + 1e-9; t += 0.005) {
    let end = prevEnd;
    const trial = block.map((k, j) => {
      const len = (cutsrc[k].b - cutsrc[k].a) / t;
      const pause = j === 0 ? 0.25 : Math.min(0.6, Math.max(GAP, cutsrc[k].gap / t));
      const start = Math.max(anchors[k] - (EARLY[k] ?? 0.05), end + pause);
      end = start + len;
      return { k, start, end, tempo: t };
    });
    placed = trial;
    if (end <= limit) break;
  }
  for (const p of placed) {
    const s = hi[p.k];
    segs.push({ k: p.k + 1, text: s.text.join(' '), srcA: cutsrc[p.k].a, srcB: cutsrc[p.k].b, start: p.start, end: p.end, tempo: p.tempo, anchor: anchors[p.k], limit, over: 0 });
  }
  const last = segs.at(-1);
  last.over = Math.max(0, last.end - limit);
  prevEnd = last.end;
}

for (const s of segs) {
  const flag = s.over > 0.01 ? `  OVER ${s.over.toFixed(2)} s` : '';
  console.log(`${String(s.k).padStart(2)} en ${s.anchor.toFixed(2).padStart(6)} | hi ${s.start.toFixed(2).padStart(6)}-${s.end.toFixed(2).padStart(6)} (+${(s.start - s.anchor).toFixed(2)})${s.tempo > 1.0001 ? ` x${s.tempo.toFixed(3)}` : ''}${flag}  ${s.text}`);
}
const late = segs.map(s => s.start - s.anchor);
console.log(`start offset vs English: median ${late.slice().sort((p, q) => p - q)[Math.floor(late.length / 2)].toFixed(2)} s, max ${Math.max(...late).toFixed(2)} s; fastest x${Math.max(...segs.map(s => s.tempo)).toFixed(3)}; over ${segs.filter(s => s.over > 0.01).length}`);
fs.writeFileSync('assets/audio/dub-hi.json', JSON.stringify({ take, segs }, null, 1));
if (dry) process.exit(0);

// the stem: same voice chain as English, then -16 LUFS, padded to the whole film
let g = `[0:a]aresample=${SR},aformat=channel_layouts=mono,highpass=f=70,equalizer=f=240:t=q:w=1.5:g=-1.5,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=140:makeup=2,asplit=${segs.length}` +
  segs.map((_, i) => `[s${i}]`).join('') + ';';
segs.forEach((s, i) => {
  const len = (s.srcB - s.srcA) / s.tempo;
  g += `[s${i}]atrim=start=${s.srcA.toFixed(3)}:end=${s.srcB.toFixed(3)},asetpts=PTS-STARTPTS` + (s.tempo > 1 ? `,atempo=${s.tempo.toFixed(4)}` : '') +
    `,afade=t=in:d=0.015,afade=t=out:st=${Math.max(0, len - 0.04).toFixed(3)}:d=0.04,adelay=${Math.round(s.start * 1000)}[p${i}];`;
});
g += segs.map((_, i) => `[p${i}]`).join('') + `amix=inputs=${segs.length}:normalize=0:duration=longest,loudnorm=I=-16:TP=-2:LRA=7,aresample=${SR},apad=whole_dur=${END},atrim=0:${END}[vo]`;
const r = spawnSync('ffmpeg', ['-hide_banner', '-y', '-i', `${take}.mp3`, '-filter_complex', g, '-map', '[vo]', '-ar', String(SR), '-c:a', 'pcm_s24le', 'assets/audio/vo-hi.wav'], { encoding: 'utf8' });
if (r.status !== 0) throw new Error(r.stderr.slice(-1500));
console.log('assets/audio/vo-hi.wav');
