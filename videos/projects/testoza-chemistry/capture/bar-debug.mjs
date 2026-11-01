// Debug: print barcode values over time in a take (node capture/bar-debug.mjs a).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const take = process.argv[2] || 'a';
const DIR = decodeURIComponent(new URL('./rec/', import.meta.url).pathname.slice(1));
const B = 9, W = 12 * B, H = 1296;
const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', DIR + take + '.mp4', '-vf', `crop=${W}:${B}:0:${H - B},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
const fs = W * B, n = Math.floor(buf.length / fs), mid = Math.floor(B / 2);
let last = null;
for (let f = 0; f < n; f++) {
  const px = (k) => buf[f * fs + mid * W + k * B + mid];
  const raw = Array.from({ length: 12 }, (_, k) => px(k));
  let v = 0; for (let k = 0; k < 10; k++) if (raw[2 + k] > 128) v |= 1 << k;
  const key = raw.map((x) => (x > 128 ? 1 : 0)).join('');
  if (key !== last) { console.log((f / 30).toFixed(2), key, v, raw.join(',')); last = key; }
}
const marks = JSON.parse(readFileSync(DIR + take + '.marks.json', 'utf8')).marks;
console.log(marks.slice(0, 8).map((m) => `${m.code}:${m.id}@${m.t}->${m.tv}`).join('  '));
