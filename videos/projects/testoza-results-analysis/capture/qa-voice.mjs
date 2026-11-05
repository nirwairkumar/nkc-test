// QA: hear every voice clip back (Parakeet via `hyperframes transcribe`) and list the lines where the
// heard words differ from the script (a skipped, doubled or garbled word). Timings are not touched.
// Usage: node capture/qa-voice.mjs [en] [L03,L08]   → assets/vo-<lang>/qa/Lnn.json + a report
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const LANG = process.argv[2] || 'en', ONLY = process.argv[3]?.split(',');
const VO = `${ROOT}assets/vo-${LANG}/`, QA = VO + 'qa/';
mkdirSync(QA, { recursive: true });
const norm = (w) => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
const toks = (s) => s.replace(/\{[a-z0-9]+\}/gi, '').replace(/TestoZa/g, 'Testoza').split(/[\s\-—–…]+/).map(norm).filter(Boolean);
function dist(a, b) {
  const D = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) D[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return D[a.length][b.length];
}
for (const line of JSON.parse(readFileSync(VO + 'vo.json', 'utf8'))) {
  if (ONLY && !ONLY.includes(line.id)) continue;
  const out = `${QA}${line.id}.json`;
  if (!existsSync(out)) {
    // The CLI prints JSON lines; the one with "type":"words" holds the transcript.
    const r = spawnSync('npx', ['hyperframes', 'transcribe', `assets/vo-${LANG}/${line.id}.wav`, '--json'], { cwd: ROOT, shell: true, encoding: 'utf8', maxBuffer: 1 << 24 });
    const lines = `${r.stdout}\n${r.stderr}`.split('\n');
    const words = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((j) => j?.type === 'words')?.words;
    if (!words) throw new Error('no transcript for ' + line.id);
    writeFileSync(out, JSON.stringify(words));
  }
  const heard = JSON.parse(readFileSync(out, 'utf8')).map((w) => w.text).join(' ');
  const a = toks(line.raw), b = toks(heard), d = dist(a, b);
  const flag = d > Math.max(2, a.length * 0.08) ? '  ⚠ CHECK' : '';
  console.log(`${line.id}  words ${a.length}  diff ${d}${flag}${flag ? '\n   heard: ' + heard : ''}`);
}
