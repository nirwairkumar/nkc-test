// The final audio for every language from ONE mixer, so the English track and the five dubs sound
// the same: the music beds, stings and clicks placed in index.html + that language's voice. Beds
// duck under the voice (sidechain, like the HyperFrames carve), then a two-pass loudnorm to
// −14 LUFS / −1.5 dBTP. Output: 48 kHz stereo 16-bit WAV, exactly the video's length.
// Usage: node capture/mix.mjs en|hi|ta|te|kn|ml   → assets/mix/mix-<lang>.wav
import { readFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const LANG = process.argv[2] || 'en';
const SR = 48000, BEDGAIN = 1.2;
const timing = JSON.parse(readFileSync(ROOT + 'capture/timing.json', 'utf8'));
const TOTAL = timing.total, N = Math.ceil(TOTAL * SR);
mkdirSync(ROOT + 'assets/mix', { recursive: true });

const decode = (file, ch) => {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', ROOT + file, '-ar', String(SR), '-ac', String(ch), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
};
const write = (arr, ch, file) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', String(ch), '-i', '-', '-c:a', 'pcm_f32le', ROOT + file], { input: Buffer.from(arr.buffer), maxBuffer: 1 << 30 });

// ── Buses from index.html's audio (everything but the English voice) ─────────────────────────────
const html = readFileSync(ROOT + 'index.html', 'utf8');
const tags = [...html.matchAll(/<audio [^>]*>/g)].map((m) => m[0]).filter((a) => !/data-audio-group="voiceover"/.test(a));
const attr = (a, k) => (a.match(new RegExp(`${k}="([^"]*)"`)) || [])[1];
const bed = new Float32Array(N * 2), sfx = new Float32Array(N * 2), cache = {};
for (const a of tags) {
  const src = attr(a, 'src'), start = +attr(a, 'data-start'), dur = +attr(a, 'data-duration'), vol = +(attr(a, 'data-volume') ?? 1);
  const isBed = /data-fx-carve/.test(a);
  const s = (cache[src] ??= decode(src, 2));
  const bus = isBed ? bed : sfx, g = vol * (isBed ? BEDGAIN : 1);
  const o = Math.round(start * SR), n = Math.min(Math.round(dur * SR), s.length / 2, N - o);
  for (let k = 0; k < n; k++) { bus[(o + k) * 2] += s[k * 2] * g; bus[(o + k) * 2 + 1] += s[k * 2 + 1] * g; }
}

// ── Voice: English clips at their placements, or the dub track ──────────────────────────────────
let voice;
if (LANG === 'en') {
  voice = new Float32Array(N);
  for (const v of timing.voice) {
    const s = decode(`assets/vo-en/${v.id}.wav`, 1), o = Math.round(v.start * SR);
    for (let k = 0; k < s.length && o + k < N; k++) voice[o + k] += s[k];
  }
} else voice = decode(`assets/dub-${LANG}/vo.wav`, 1).slice(0, N);

const tmp = (n) => `assets/mix/_${LANG}-${n}.wav`;
write(bed, 2, tmp('bed')); write(sfx, 2, tmp('sfx')); write(voice, 1, tmp('voice'));

// ── Duck + sum, then loudnorm in two passes ───────────────────────────────────────────────────
const graph = '[2:a]aformat=channel_layouts=mono,asplit=2[v][sc];[v]aformat=channel_layouts=stereo[vs];'
  + '[0:a][sc]sidechaincompress=threshold=0.02:ratio=5:attack=20:release=380:knee=4:makeup=1[duck];'
  + '[duck][1:a][vs]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.95:level=false[pre]';
const inputs = ['-i', ROOT + tmp('bed'), '-i', ROOT + tmp('sfx'), '-i', ROOT + tmp('voice')];
const pass1 = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...inputs, '-filter_complex', graph + ';[pre]loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json[o]', '-map', '[o]', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const m = JSON.parse(pass1.stderr.slice(pass1.stderr.lastIndexOf('{'), pass1.stderr.lastIndexOf('}') + 1));
const ln = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
const out = `assets/mix/mix-${LANG}.wav`;
execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${graph};[pre]${ln},aresample=${SR},apad,atrim=0:${TOTAL}[o]`,
  '-map', '[o]', '-ac', '2', '-ar', String(SR), '-c:a', 'pcm_s16le', ROOT + out]);
const check = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', ROOT + out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const sum = check.slice(check.lastIndexOf('Summary:'));
const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ROOT + out]).toString().trim();
console.log(`${out}  ${dur}s (video ${TOTAL}s)  I ${/I:\s+(-?[\d.]+)/.exec(sum)?.[1]} LUFS  peak ${/Peak:\s+(-?[\d.]+)/.exec(sum)?.[1]} dBFS`);
for (const n of ['bed', 'sfx', 'voice']) unlinkSync(ROOT + tmp(n));
