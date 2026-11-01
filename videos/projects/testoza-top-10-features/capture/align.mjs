// Word timings for every voice clip (Parakeet via `hyperframes transcribe`), aligned to the script
// words so each {cue} gets an exact time. Also a QA pass: lines where the voice dropped or changed
// words are listed (Gemini sometimes skips a sentence).
// Usage: node capture/align.mjs [L03,L08]   → assets/vo-en/Lnn.words.json + assets/vo-en/cues.json
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const VO = ROOT + 'assets/vo-en/';
const ONLY = process.argv[2]?.split(',');
const meta = JSON.parse(readFileSync(VO + 'vo.json', 'utf8'));
const norm = (w) => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
// Script words: split raw text, keep cue tokens attached to the following word.
function scriptWords(raw) {
  const out = []; let pending = [];
  for (const tok of raw.replace(/TestoZa/g, 'Testoza').split(/\s+/).filter(Boolean)) {
    const cues = [...tok.matchAll(/\{([a-z0-9]+)\}/gi)].map((m) => m[1]);
    const word = tok.replace(/\{[a-z0-9]+\}/gi, '');
    pending.push(...cues);
    // "twenty-seven" is one word in the script but may be split by ASR; split on hyphens too.
    const parts = word.split(/[-—–…]+/).map(norm).filter(Boolean);
    parts.forEach((p, i) => { out.push({ w: p, cues: i === 0 ? pending : [] }); if (i === 0) pending = []; });
  }
  if (pending.length) out.push({ w: '', cues: pending, end: true });
  return out;
}
// Levenshtein alignment of script words to heard words → index map.
function align(a, b) {
  const n = a.length, m = b.length, D = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 0; i <= n; i++) D[i][0] = i;
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  const map = new Array(n).fill(-1);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (D[i][j] === D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { map[i - 1] = j - 1; i--; j--; }
    else if (D[i][j] === D[i - 1][j] + 1) i--;
    else j--;
  }
  return { map, dist: D[n][m] };
}

const cuesOut = existsSync(VO + 'cues.json') ? JSON.parse(readFileSync(VO + 'cues.json', 'utf8')) : {};
for (const line of meta) {
  if (ONLY && !ONLY.includes(line.id)) continue;
  const wordsFile = `${VO}${line.id}.words.json`;
  if (!existsSync(wordsFile) || process.env.TZ_FORCE) {
    execFileSync('npx', ['hyperframes', 'transcribe', 'assets/vo-en/' + line.id + '.wav', '--json'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'], shell: true });
    renameSync(VO + 'transcript.json', wordsFile);
  }
  const heard = JSON.parse(readFileSync(wordsFile, 'utf8'));
  const sw = scriptWords(line.raw);
  const real = sw.filter((x) => !x.end);
  const hw = heard.flatMap((h) => h.text.split(/[-—–]+/).map((p) => ({ w: norm(p), start: h.start, end: h.end }))).filter((x) => x.w);
  const { map, dist } = align(real.map((x) => x.w), hw.map((x) => x.w));
  const missing = real.filter((x, i) => map[i] < 0 || hw[map[i]].w !== x.w).map((x) => x.w);
  const cues = {};
  real.forEach((x, i) => {
    if (!x.cues.length) return;
    // Nearest matched word at or after this one gives the time.
    let k = i; while (k < real.length && map[k] < 0) k++;
    const t = k < real.length ? hw[map[k]].start : line.duration;
    x.cues.forEach((c) => { cues[c] = +t.toFixed(3); });
  });
  sw.filter((x) => x.end).forEach((x) => x.cues.forEach((c) => { cues[c] = line.duration; }));
  cuesOut[line.id] = { duration: line.duration, cues, dist, words: real.length, missing };
  const flag = missing.length > Math.max(2, real.length * 0.08) ? '  ⚠ CHECK' : '';
  console.log(`${line.id} ${line.duration.toFixed(2)}s  words ${real.length}  edit-distance ${dist}  cues ${Object.keys(cues).length}${flag}${missing.length ? '  ~' + missing.slice(0, 8).join(' ') : ''}`);
}
writeFileSync(VO + 'cues.json', JSON.stringify(cuesOut, null, 2));
