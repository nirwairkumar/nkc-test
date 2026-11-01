// Contact sheet: one frame per mark (at its barcode time + `dt`), 4 per row → capture/probe/sheet-<take>.jpg
// Usage: node capture/sheet.mjs <take> [dt=0.6] [ids,…]
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const [take, dtArg, only] = process.argv.slice(2);
const dt = Number(dtArg ?? 0.6);
const j = JSON.parse(readFileSync(`capture/rec/${take}.marks.json`, 'utf8'));
const marks = j.marks.filter((m) => !only || only.split(',').includes(m.id));
const tmp = `capture/probe/_sheet/`; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
marks.forEach((m, i) => {
  const t = Math.max(0, (m.tv ?? m.t) + dt);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(t), '-i', `capture/rec/${take}.mp4`, '-frames:v', '1', '-vf', `scale=${j.kind === 'phone' ? 215 : 480}:-2,drawtext=fontfile=capture/arial.ttf:text='${m.id} ${t.toFixed(1)}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.7`, `${tmp}${String(i).padStart(3, '0')}.jpg`]);
});
const cols = j.kind === 'phone' ? 6 : 4, rows = Math.ceil(marks.length / cols);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${tmp}%03d.jpg`, '-vf', `tile=${cols}x${rows}:padding=4`, '-frames:v', '1', '-q:v', '4', `capture/probe/sheet-${take}.jpg`]);
console.log(`capture/probe/sheet-${take}.jpg`, marks.length, 'frames');
