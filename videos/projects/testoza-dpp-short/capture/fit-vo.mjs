// Fits a dub language's voice lines onto the film's sync points (same slots as the Hindi track)
// and writes capture/vo-<lang>.json. A line too long for its slot is sped up (≤ 1.10×, pitch kept)
// in place; anything still overlapping is reported, not hidden.
// node capture/fit-vo.mjs ta
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, renameSync, readFileSync, existsSync } from 'node:fs';

const L = process.argv[2];
const dir = `assets/voice-${L}`;
// speed-ups already applied to each file, so re-running never stacks past 1.10×
const SPEEDS = `${dir}/speeds.json`;
const applied = existsSync(SPEEDS) ? JSON.parse(readFileSync(SPEEDS, 'utf8')) : {};
const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
function phrases(f) {
  const r = silences(f);
  const d = dur(f);
  const sil = [];
  let s = null;
  for (const m of r.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === 'start') s = +m[2]; else { sil.push([s ?? 0, +m[2]]); s = null; }
  }
  if (s !== null) sil.push([s, d]);
  const out = []; let t = 0;
  for (const [a, b] of sil) { if (a - t > 0.05) out.push([t, a]); t = b; }
  if (d - t > 0.05) out.push([t, d]);
  return out;
}
// silencedetect log (ffmpeg writes it to stderr)
function silences(f) {
  return spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'silencedetect=n=-35dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
}
function speedUp(f, k) {
  const tmp = f.replace(/\.wav$/, '.tmp.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-af', `atempo=${k.toFixed(4)}`, '-ar', '44100', tmp]);
  renameSync(tmp, f);
}

// [id, default start, latest end allowed, anchor: [phrase index, film time] | null]
const PLAN = [
  ['e01', 0.0, 6.6, null],
  ['e02', 6.7, 11.35, null],
  ['e03', 11.9, 19.3, null],
  ['e04', 21.3, null, null],
  ['e05', 24.3, 28.75, [1, 25.76]],   // "plus four" on the +4 tap
  ['e06', 28.8, 37.8, null],
  ['e07', 37.95, 43.5, null],
  ['e08', 43.7, 48.35, null],
  ['e09', 48.45, 51.5, null],
  ['e10', 51.6, 60.5, null],
  ['e11', 60.6, 64.0, null],
  ['e12', 64.1, 71.1, null],
  ['e13', 71.2, 76.3, null],
];
const GAP = 0.12;
const rows = [];
let prevEnd = 0;
for (let i = 0; i < PLAN.length; i++) {
  const [id, def, latest, anchor] = PLAN[i];
  const f = `${dir}/${id}.wav`;
  let d = dur(f);
  let start = def;
  if (anchor) { const p = phrases(f); if (p[anchor[0]]) start = anchor[1] - p[anchor[0]][0]; }
  start = Math.max(start, prevEnd + GAP);
  const limit = latest ?? (PLAN[i + 1][1] - GAP);
  if (start + d > limit) {
    // first try starting earlier (not before the previous line ends)
    start = Math.max(prevEnd + GAP, limit - d);
  }
  if (start + d > limit) {
    const done = applied[id] || 1;
    const k = Math.min(1.1 / done, d / (limit - start));
    if (k > 1.005) {
      speedUp(f, k);
      applied[id] = +(done * k).toFixed(4);
      d = dur(f);
      console.log(`${id}: sped up ×${k.toFixed(3)} (total ×${applied[id]})`);
    }
  }
  const end = start + d;
  if (end > limit + 0.01) console.log(`!! ${id} still runs ${(end - limit).toFixed(2)} s past its slot`);
  rows.push([id, +start.toFixed(2)]);
  prevEnd = end;
  console.log(`${id} ${start.toFixed(2)} → ${end.toFixed(2)} (${d.toFixed(2)} s, slot ends ${limit.toFixed(2)})`);
}
writeFileSync(`capture/vo-${L}.json`, JSON.stringify(rows));
writeFileSync(SPEEDS, JSON.stringify(applied));
console.log(`wrote capture/vo-${L}.json`);
