// Lip-synced presenter clips for the corner circle, made locally with SadTalker (Apache-2.0, CPU).
// Source photo: assets/avatar/presenter.png (capture/avatar-image.mjs, Gemini image on Vertex).
// Output: assets/avatar/<lang>/line-NN.mp4 (600×600, silent; build.mjs plays the voice wav) and
// assets/avatar/still.png (same framing, shown in the ring before and after she speaks).
// Usage: node capture/avatar.mjs en,hi [2,11,16]     (skips clips that already exist)
// SadTalker lives in videos/shared/sadtalker with its venv in videos/shared/sadtalker-venv.
import { mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const ST = ROOT + '../../shared/sadtalker/';
const PY = ROOT + '../../shared/sadtalker-venv/Scripts/python.exe';
const langs = (process.argv[2] || 'en,hi').split(',');
const lines = (process.argv[3] || '2,11,16').split(',').map(Number);
// Square framing for the circle: 88% of the photo, a touch above centre, so the sign above her head stays in.
const FRAME = 'crop=iw*0.88:ih*0.88:iw*0.06:ih*0.03,scale=600:600:flags=lanczos';
const SRC = ROOT + 'assets/avatar/presenter.png';
const small = ROOT + 'assets/avatar/presenter-768.png';
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', SRC, '-vf', 'scale=768:768:flags=lanczos', small]);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', SRC, '-vf', FRAME, ROOT + 'assets/avatar/still.png']);

for (const lang of langs) for (const n of lines) {
  const id = String(n).padStart(2, '0');
  const out = `${ROOT}assets/avatar/${lang}/line-${id}.mp4`;
  if (existsSync(out)) { console.log('skip', lang, id); continue; }
  const work = `${ROOT}assets/avatar/work/${lang}-${id}/`;
  mkdirSync(work, { recursive: true });
  mkdirSync(`${ROOT}assets/avatar/${lang}`, { recursive: true });
  const t0 = Date.now();
  execFileSync(PY, ['inference.py', '--driven_audio', `${ROOT}assets/vo-${lang}/line-${id}.wav`, '--source_image', small,
    '--result_dir', work, '--still', '--preprocess', 'full', '--size', '256', '--cpu'], { cwd: ST, stdio: 'ignore' });
  const mp4 = readdirSync(work).filter((f) => f.endsWith('.mp4')).map((f) => work + f).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  if (!mp4) throw new Error(`SadTalker made no video for ${lang} ${id}`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', FRAME, '-an', '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '25', out]);
  console.log('✓', lang, id, `${Math.round((Date.now() - t0) / 1000)}s`);
}
