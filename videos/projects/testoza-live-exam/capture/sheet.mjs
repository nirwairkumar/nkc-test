// Contact sheet of a take: one thumbnail per mark (0.4 s after it), labelled. QA only.
// Usage: node capture/sheet.mjs teacher [cols] [+offset]
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const DIR = decodeURIComponent(new URL('./', import.meta.url).pathname.slice(1));
const name = process.argv[2], cols = Number(process.argv[3] || 6), off = Number(process.argv[4] || 0.4);
const { marks, kind } = JSON.parse(readFileSync(`${DIR}rec/${name}.marks.json`, 'utf8'));
const tmp = `${DIR}probe/sheet-${name}/`;
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const w = kind === 'phone' ? 215 : 384;
marks.forEach((m, i) => {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, m.t + off)), '-i', `${DIR}rec/${name}.mp4`, '-frames:v', '1',
    '-vf', `scale=${w}:-2,drawbox=y=0:w=iw:h=22:color=black@0.7:t=fill,drawtext=text='${i} ${m.id} ${m.t.toFixed(1)}':fontcolor=white:fontsize=15:x=6:y=3:fontfile=C\\\\:/Windows/Fonts/arial.ttf`,
    `${tmp}${String(i).padStart(3, '0')}.png`]);
});
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'sequence', '-i', `${tmp}%03d.png`, '-vf', `tile=${cols}x${Math.ceil(marks.length / cols)}:padding=4`, '-frames:v', '1', `${DIR}probe/sheet-${name}.png`]);
console.log(`${DIR}probe/sheet-${name}.png`);
