// The film's sound: voice on the film clock, the score ducked under it, diegetic effects, the
// signature tune lifted over the end card; mastered to -14 LUFS, peaks under -1 dBFS.
//   node tools/mix.mjs en     voice built here from take s11 (paragraphs on the film clock)
//   node tools/mix.mjs hi     voice from assets/audio/vo-hi.wav (built by tools/dub-hi.mjs)
// Writes assets/audio/vo-<lang>.wav and mix-<lang>.wav (48 kHz, 24-bit, stereo, exactly END s);
// en is also copied to mix.wav, which index.html plays.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { paragraphs } from './timing.mjs';

const LANG = process.argv[2] || 'en';
const END = 89.8;
const LOGO_AT = 82.9;  // the voice is done; from here the score is the TestoZa signature tune
const LOGO_DB = Number(process.env.LOGO_DB ?? 9);
const VO = 'gen/vo/take-s11.mp3';
const SCORE = 'gen/music/score-a.mp3';
const VO_STEM = `assets/audio/vo-${LANG}.wav`;
fs.mkdirSync('assets/audio', { recursive: true });
// ffmpeg reports (ebur128 summary) go to stderr
const run = args => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-y', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(r.stderr.slice(-1500));
  return r.stderr + r.stdout;
};
const ms = t => Math.round(t * 1000);
const loud = file => {
  const s = run(['-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const sum = s.slice(s.lastIndexOf('Summary:'));
  return { I: Number(sum.match(/I:\s+(-?[\d.]+) LUFS/)[1]), peak: Number(sum.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]) };
};
// rms (dBFS) of a stretch, for the presence checks
const rms = (file, t0, t1) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(t0), '-t', String(t1 - t0), '-i', file, '-ac', '1', '-f', 's16le', '-'], { maxBuffer: 64 << 20 });
  const b = r.stdout; let e = 0;
  for (let i = 0; i < b.length; i += 2) { const v = b.readInt16LE(i) / 32768; e += v * v; }
  return 10 * Math.log10(e / Math.max(1, b.length / 2) + 1e-12);
};

// 1. voice (en): each paragraph cut in the silence before the next (keeping its in-breath), placed on the film clock
if (LANG === 'en') {
  const cuts = paragraphs.map((p, k) => {
    if (k === 0) return 0;
    const gap = p.srcStart - paragraphs[k - 1].srcEnd;
    return p.srcStart - Math.min(0.3, gap - 0.1);
  });
  let g = '[0:a]aresample=48000,aformat=channel_layouts=mono,highpass=f=70,equalizer=f=240:t=q:w=1.5:g=-1.5,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=140:makeup=2,asplit=' + paragraphs.length;
  g += paragraphs.map((_, k) => `[s${k}]`).join('') + ';';
  paragraphs.forEach((p, k) => {
    const a = cuts[k], b = cuts[k + 1] ?? null;
    const len = b === null ? null : b - a;
    g += `[s${k}]atrim=start=${a.toFixed(3)}${b === null ? '' : `:end=${b.toFixed(3)}`},asetpts=PTS-STARTPTS,afade=t=in:d=0.02` +
      (len ? `,afade=t=out:st=${(len - 0.03).toFixed(3)}:d=0.03` : '') + `,adelay=${ms(a + p.offset)}[p${k}];`;
  });
  // pad AFTER loudnorm: the stem must run the whole film, or the ducked score stops with it
  g += paragraphs.map((_, k) => `[p${k}]`).join('') + `amix=inputs=${paragraphs.length}:normalize=0:duration=longest,loudnorm=I=-16:TP=-2:LRA=7,aresample=48000,apad=whole_dur=${END},atrim=0:${END}[vo]`;
  run(['-i', VO, '-filter_complex', g, '-map', '[vo]', '-ar', '48000', '-c:a', 'pcm_s24le', VO_STEM]);
}
if (!fs.existsSync(VO_STEM)) throw new Error(`${VO_STEM} missing`);
console.log(VO_STEM);

// 2. diegetic sound, one entry per use: [file, film start, gain dB, trim from, length, fade in, fade out]
const SFX = [
  ['exam-hall', 0.0, -20, 0, 8.0, 0, 1.2],
  ['exam-hall', 6.8, -20, 1.5, 5.7, 0.8, 0.2],      // the hall's hum under the close-up, to the hard cut
  ['paper-class', 12.5, -19, 0, 1.9, 0.02, 0.3],     // pens on paper
  ['photocopier', 14.2, -19, 0, 4.0, 0.05, 0.5],
  ['photocopier', 17.7, -20, 0.6, 2.4, 0.3, 0.25],
  ['night-desk', 20.1, -21, 0, 4.8, 0.05, 0.3],      // red pen ticks, crickets
  ['corridor', 24.9, -21, 0, 3.1, 0.1, 0.3],
  ['paper-class', 28.0, -20, 0.5, 5.0, 0.1, 0.6],
  ['dawn', 32.7, -19, 0, 6.0, 0.6, 0.8],            // birds, the tumbler
  ['laptop', 39.05, -14, 0, 2.0, 0.01, 0.3],
  ['taps', 47.6, -20, 0, 3.0, 0.1, 0.4],
  ['lab', 51.4, -22, 0, 4.1, 0.1, 0.5],
  ['dinner', 73.3, -16, 0, 2.1, 0.15, 0.35],
  ['exam-hall', 75.3, -24, 0, 7.6, 0.4, 0.6],
];
// the Hindi edit holds the notice board 0.9 s longer (its line is longer), so the classroom pens move with the cut
if (LANG === 'hi') SFX.find(s => s[0] === 'paper-class' && s[1] === 28.0)[1] = 28.9;

// 3. the score, ducked by the voice, the signature tune lifted; effects summed
const ins = ['-i', VO_STEM, '-i', SCORE];
SFX.forEach(([f]) => ins.push('-i', `gen/sfx/${f}.mp3`));
let m = `[0:a]aformat=channel_layouts=stereo,apad=whole_dur=${END},atrim=0:${END},asplit=2[vo][key];`;
m += `[1:a]aresample=48000,aformat=channel_layouts=stereo,equalizer=f=2000:t=q:w=1.2:g=-2.5,volume=-1dB,volume=volume=${LOGO_DB}dB:enable='gte(t,${LOGO_AT})',apad=whole_dur=${END},atrim=0:${END}[mus];`;
m += '[mus][key]sidechaincompress=threshold=0.02:ratio=6:attack=60:release=700:knee=4[musd];';
SFX.forEach(([, at, db, from, len, fi, fo], i) => {
  m += `[${i + 2}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=start=${from}:end=${from + len},asetpts=PTS-STARTPTS,lowpass=f=6500,equalizer=f=4000:t=q:w=1:g=-3,` +
    `afade=t=in:d=${fi},afade=t=out:st=${(len - fo).toFixed(3)}:d=${fo},volume=${db}dB,adelay=${ms(at)}:all=1[x${i}];`;
});
m += SFX.map((_, i) => `[x${i}]`).join('') + `amix=inputs=${SFX.length}:normalize=0:duration=longest[fx];`;
m += `[vo][musd][fx]amix=inputs=3:normalize=0:duration=longest,apad=whole_dur=${END},atrim=0:${END}[pre]`;

const tmp = `assets/audio/_premaster-${LANG}.wav`;
run([...ins, '-filter_complex', m, '-map', '[pre]', '-ar', '48000', '-c:a', 'pcm_s24le', tmp]);

// 4. master: gain to -14 LUFS integrated, then a limiter keeps peaks under -1.5 dBFS
const pre = loud(tmp);
const gain = -14 - pre.I;
const OUT = `assets/audio/mix-${LANG}.wav`;
run(['-i', tmp, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.79:attack=0.5:release=60:level=false,aresample=48000`, '-t', String(END), '-c:a', 'pcm_s24le', OUT]);
fs.unlinkSync(tmp);
if (LANG === 'en') fs.copyFileSync(OUT, 'assets/audio/mix.wav');

// 5. checks: full length, the voice's last line, and the signature tune's three notes are all there
const got = loud(OUT);
const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT], { encoding: 'utf8' }).stdout);
const tune = rms(OUT, 85.6, 86.9), shimmer = rms(OUT, 83.6, 84.6), lastLine = rms(OUT, 80.6, 81.8);
console.log(`${OUT}  I ${got.I} LUFS, peak ${got.peak} dBFS, ${dur.toFixed(2)} s | last line ${lastLine.toFixed(1)} dB, logo shimmer ${shimmer.toFixed(1)} dB, logo notes ${tune.toFixed(1)} dB`);
if (Math.abs(dur - END) > 0.05) throw new Error(`mix is ${dur} s, expected ${END}`);
if (tune < -35 || shimmer < -40) throw new Error('the signature tune is missing from the end of the mix');
