// Screencast frames (timestamped, variable rate) → constant 30 fps MP4 that starts at the 'rec' mark.
// node capture/frames2mp4.mjs capture/runA3/ assets/footage/run-a.mp4
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const [runDir, out] = process.argv.slice(2);
const { frames } = JSON.parse(readFileSync(runDir + 'log.json', 'utf8'));
const lines = ['ffconcat version 1.0'];
for (let i = 0; i < frames.length; i++) {
  const d = i + 1 < frames.length ? frames[i + 1].ts - frames[i].ts : 1;
  lines.push(`file 'frames/${frames[i].name}'`, `duration ${d.toFixed(4)}`);
}
lines.push(`file 'frames/${frames.at(-1).name}'`);
const list = resolve(runDir, 'frames.ffconcat');
writeFileSync(list, lines.join('\n'));
mkdirSync(dirname(out), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
  '-vf', 'fps=30,scale=780:-2:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-g', '15', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log('first frame ts', frames[0].ts.toFixed(3), '→', out);
