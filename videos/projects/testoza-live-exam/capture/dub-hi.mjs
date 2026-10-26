// Hindi dub track for the finished English video. The picture never moves: each Hindi line is cut
// only in the silence before a {cue} word, and each piece is placed so its cue word is spoken just
// after the on-screen action (capture/dub-events.json). The voice model's long pauses (real
// silences over SQUEEZE s) are shortened to KEEP s first; pauses come back only where the picture
// needs them. Where Hindi still runs longer than the window, the line plays up to MAXTEMPO faster.
// Every cue is re-checked at the end; the build throws if a word comes before its action.
// Usage: node capture/dub-events.mjs && node capture/dub-hi.mjs
//   → assets/dub-hi/vo-hi.wav, dub-hi.html (voice + the English music/stings, for the mixer),
//     youtube/hi/captions-hi.srt, capture/dub-hi-sync.json
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tokensHi } from './hindi.mjs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const J = (f) => JSON.parse(readFileSync(ROOT + f, 'utf8'));
const PY = process.env.TZ_PY || 'C:/Users/kumar/.cache/tz-align/venv/Scripts/python.exe';
const SR = 48000, LEAD = 0.10, GAP = 0.22, MAXTEMPO = 1.12, FADE = 0.008, SQUEEZE = 0.48, KEEP = 0.38;
const TEMPOS = [1, 1.03, 1.06, 1.09, MAXTEMPO];
const r2 = (x) => Math.round(x * 100) / 100;

const EV = J('capture/dub-events.json'), timing = J('capture/timing.json'), VO = J('assets/vo-hi/vo.json');
const TOTAL = EV.total;

// ── Words: script tokens → aligned times (re-align a line when its WAV is newer than its timings) ──
const md = readFileSync(ROOT + 'SCRIPT-hi.md', 'utf8');
const RAW = Object.fromEntries(md.split(/^## /m).slice(1).map((b) => [b.match(/^(L\d+)/)?.[1],
  b.split('\n').filter((l) => l.startsWith('    ')).map((l) => l.trim()).join('\n')]).filter(([id]) => id));
const stale = [];
for (const [id, raw] of Object.entries(RAW)) {
  const said = tokensHi(raw).flatMap((t) => t.said);
  const sayF = ROOT + `assets/vo-hi/${id}.say.json`, alF = ROOT + `assets/vo-hi/${id}.align.json`, wav = ROOT + `assets/vo-hi/${id}.wav`;
  const prev = existsSync(sayF) ? readFileSync(sayF, 'utf8') : '';
  if (prev !== JSON.stringify(said)) writeFileSync(sayF, JSON.stringify(said), 'utf8');
  if (!existsSync(alF) || statSync(alF).mtimeMs < statSync(wav).mtimeMs || prev !== JSON.stringify(said)) stale.push(id);
}
if (stale.length) {
  console.log('aligning', stale.join(','));
  execFileSync(PY, ['capture/align-hi.py', 'assets/vo-hi', stale.join(',')], { cwd: ROOT, stdio: 'inherit' });
}

function timedTokens(id) {
  const toks = tokensHi(RAW[id]), al = J(`assets/vo-hi/${id}.align.json`);
  let k = 0, last = 0;
  for (const t of toks) {
    const ws = t.said.map(() => al[k++]).filter(Boolean);
    t.start = ws.length ? ws[0].start : last;
    t.end = ws.length ? ws.at(-1).end : last;
    t.spoken = ws.length > 0;
    last = t.end;
  }
  return toks;
}

// ── Placement ──────────────────────────────────────────────────────────────────────────────────
const sectionOf = (t) => timing.sections.find((s) => t >= s.start - 0.01 && t < s.end) ?? timing.sections.at(-1);
const enWord = timing.cues;
/** Real silences inside a clip (ffmpeg silencedetect), as [start, end] pairs. */
function silenceList(wav) {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'silencedetect=noise=-38dB:d=0.3', '-f', 'null', '-']).stderr.toString();
  const out = []; let s = null;
  for (const m of log.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === 'start') s = Number(m[2]); else if (s != null) { out.push([s, Number(m[2])]); s = null; }
  }
  return out;
}
const lines = EV.lines.map((L) => {
  const toks = timedTokens(L.id), dur = VO.find((v) => v.id === L.id).duration;
  const ev = Object.fromEntries(L.events.map((e) => [e.cue, e]));
  const sec = sectionOf(L.start);
  const first = timing.voice.findIndex((v) => sectionOf(v.start) === sec) === timing.voice.findIndex((v) => v.id === L.id);
  return { ...L, toks, dur, ev, sil: silenceList(ROOT + `assets/vo-hi/${L.id}.wav`), floor: first ? sec.start + 0.15 : L.start - 1.2 };
});

/** Cut a line (at tempo r) into pieces: long silences squeezed to KEEP, and a cut before each cue
 *  word. A boundary {x, y} ends one piece at x and starts the next at y (x < y skips silence). */
function piecesOf(L, r) {
  const T = L.toks.map((t) => ({ ...t, start: t.start / r, end: t.end / r }));
  const D = L.dur / r, bounds = [];
  for (const [s0, s1] of L.sil) {
    const x = s0 / r + KEEP / 2, y = s1 / r - KEEP / 2;
    if (s1 < L.dur - 0.05 && s0 > 0.05 && (s1 - s0) / r > SQUEEZE) bounds.push({ x, y, cues: [] });
  }
  let lead = [];
  T.forEach((t, i) => {
    if (!t.cues.length) return;
    const prevSpoken = T.slice(0, i).filter((x) => x.spoken).at(-1);
    const cs = t.cues.filter((c) => L.ev[c]).map((c) => ({ cue: c, at: t.start }));
    if (!prevSpoken) { lead.push(...cs); return; }
    // A cue right after a squeezed silence rides on that boundary; otherwise cut mid-gap.
    const sq = bounds.find((b) => b.x >= prevSpoken.end - 0.05 && b.y <= t.start + 0.05);
    if (sq) { sq.cues.push(...cs); return; }
    const gap = t.start - prevSpoken.end;
    const cut = gap >= 0.06 ? prevSpoken.end + gap / 2 : Math.max(prevSpoken.end, t.start - 0.02);
    bounds.push({ x: cut, y: cut, cues: cs });
  });
  bounds.sort((a, b) => a.x - b.x);
  const pieces = []; let from = 0, anchors = lead;
  for (const b of bounds) { pieces.push({ a: from, b: b.x, anchors }); from = b.y; anchors = b.cues; }
  pieces.push({ a: from, b: D, anchors });
  return { pieces, T };
}

/** Place a line's pieces from `earliest`; returns placed pieces, cue words and the end. */
function place(L, r, earliest) {
  const { pieces, T } = piecesOf(L, r);
  let t = earliest; const out = [], words = [];
  pieces.forEach((p, j) => {
    let s = j === 0 ? earliest : t;
    for (const an of p.anchors) s = Math.max(s, L.ev[an.cue].at + LEAD - (an.at - p.a));
    out.push({ ...p, s, pause: j === 0 ? 0 : s - t });
    for (const an of p.anchors) words.push({ cue: an.cue, word: s + an.at - p.a, at: L.ev[an.cue].at });
    t = s + (p.b - p.a);
  });
  // Lead-in words before the first cue start later rather than leave a gap mid-sentence, but never
  // more than 0.6 s after the English line started.
  const j0 = out.findIndex((p) => p.anchors.length);
  if (j0 > 0 && out[j0].pause > 0.05) {
    const shift = Math.min(out[j0].pause, Math.max(0, L.start + 0.6 - out[0].s));
    for (let j = 0; j < j0; j++) out[j].s += shift;
    out[j0].pause -= shift;
  }
  return { r, pieces: out, words, end: t, start: out[0].s + Math.max(0, (T.find((x) => x.spoken)?.start ?? 0) - out[0].a) };
}

// How late a cue word may come: as late as the English allowed it (plus a little), and at least 1 s.
const allowed = (cue, at) => Math.max(1.0, (enWord[cue] ?? at + 0.12) - at + 0.5);
// The latest a line may end so the next line, at natural speed, can still start in time for its
// first cue (0.3 s of give).
function deadline(i) {
  const N = lines[i + 1];
  if (!N) return TOTAL - 0.3;
  const p = place(N, 1, -1e9).pieces[0];
  const due = p.anchors.length ? Math.min(...p.anchors.map((an) => N.ev[an.cue].at + LEAD - (an.at - p.a))) : N.start;
  return Math.max(due + 0.3, N.floor) - GAP;
}

const placed = [], report = [];
let prevEnd = -1;
lines.forEach((L, i) => {
  const earliest = Math.max(prevEnd + GAP, L.floor);
  const due = deadline(i);
  let best = null;
  for (const r of TEMPOS) {
    const p = place(L, r, earliest);
    p.late = p.words.reduce((s, w) => s + Math.max(0, w.word - w.at - allowed(w.cue, w.at)), 0) + Math.max(0, p.end - due);
    if (!best || p.late < best.late - 1e-6) best = p;
    if (p.late <= 1e-6) break;
  }
  placed.push({ L, ...best });
  prevEnd = best.end;
  const pauses = best.pieces.filter((p) => p.pause > 0.6).map((p) => `${r2(p.pause)}s before ${p.anchors[0]?.cue}`);
  if (best.r > 1 || best.late > 1e-6 || pauses.length) {
    report.push(`${L.id}: tempo ${best.r}${best.late > 1e-6 ? `, LATE ${r2(best.late)}s (end ${r2(best.end)} due ${r2(due)})` : ''}${pauses.length ? ', pause ' + pauses.join(', ') : ''}`);
  }
});

// ── Independent check: every cue word at or after its action, never before ─────────────────────
const sync = placed.flatMap((p) => p.words.map((w) => ({ line: p.L.id, cue: w.cue, action: r2(w.at), word: r2(w.word), lag: r2(w.word - w.at) })));
for (const s of sync) if (s.lag < LEAD - 0.011) throw new Error(`SYNC ${s.line} ${s.cue}: word at ${s.word}s, action at ${s.action}s`);
for (let i = 1; i < placed.length; i++) if (placed[i].pieces[0].s < placed[i - 1].end - 0.001) throw new Error(`OVERLAP ${placed[i].L.id}`);
if (placed.at(-1).end > TOTAL) throw new Error('dub runs past the video');

// ── Voice track ────────────────────────────────────────────────────────────────────────────────
mkdirSync(ROOT + 'assets/dub-hi', { recursive: true });
const track = new Float32Array(Math.ceil(TOTAL * SR));
for (const p of placed) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', ROOT + `assets/vo-hi/${p.L.id}.wav`, ...(p.r > 1 ? ['-af', `atempo=${p.r}`] : []),
    '-ar', String(SR), '-ac', '1', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const src = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  // Contiguous pieces play as one slice; fades only where a pause was inserted.
  const runs = [];
  for (const pc of p.pieces) {
    const last = runs.at(-1);
    if (last && Math.abs(pc.a - last.b) < 1e-6 && pc.s - (last.s + last.b - last.a) < 0.001) last.b = pc.b;
    else runs.push({ a: pc.a, b: pc.b, s: pc.s });
  }
  for (const run of runs) {
    const a = Math.round(run.a * SR), b = Math.min(src.length, Math.round(run.b * SR)), s = Math.round(run.s * SR), f = Math.round(FADE * SR);
    for (let k = a; k < b; k++) {
      const g = Math.min(1, (k - a) / f, (b - 1 - k) / f);
      if (s + k - a < track.length) track[s + k - a] += src[k] * g;
    }
  }
}
const pcm = Buffer.from(track.buffer);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', ROOT + 'assets/dub-hi/vo-hi.wav'], { input: pcm, maxBuffer: 1 << 28 });

// ── Mixer composition: the Hindi voice + the English video's music and stings, nothing else ───
const html = readFileSync(ROOT + 'index.html', 'utf8');
const keep = [...html.matchAll(/<audio [^>]*>\s*<\/audio>/g)].map((m) => m[0])
  .filter((a) => !/data-audio-group="voiceover"/.test(a)).map((a) => a.replace(/ data-hf-id="[^"]*"/, ''));
writeFileSync(ROOT + 'dub-hi.html', `<!doctype html>
<html lang="hi"><head><meta charset="UTF-8"/><meta name="viewport" content="width=320, height=180"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>html,body{margin:0;background:#000}#root{position:relative;width:100%;height:100%;overflow:hidden;background:#000}</style>
</head><body>
<!-- Hindi dub track only (generated by capture/dub-hi.mjs): render with -c dub-hi.html and keep the audio. -->
<div id="root" data-composition-id="dubhi" data-start="0" data-duration="${TOTAL}" data-width="320" data-height="180">
<audio id="vohi" data-audio-group="voiceover" src="assets/dub-hi/vo-hi.wav" data-start="0" data-duration="${TOTAL}" data-track-index="10" data-volume="1"></audio>
${keep.join('\n')}
</div>
<script>window.__timelines['dubhi'] = gsap.timeline({ paused: true });</script>
</body></html>
`);

// ── Hindi subtitles from the placed words ───────────────────────────────────────────────────────
const caps = [];
for (const p of placed) {
  const at = (x) => { const pc = p.pieces.find((q) => x >= q.a - 1e-6 && x < q.b) ?? p.pieces.at(-1); return pc.s + x - pc.a; };
  const T = p.L.toks.map((t) => ({ ...t, start: at(t.start / p.r), end: at(t.end / p.r) }));
  const chunks = []; let cur = [];
  const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
  const END = /[.!?…।]$/;
  T.forEach((t, i) => {
    if (t.display === '—') { flush(); return; }
    cur.push(t);
    const text = cur.map((x) => x.display).join(' ');
    // Words left before the sentence ends; a short tail stays on this caption instead of dangling.
    let rest = ''; for (let k = i + 1; k < T.length && !END.test(T[k - 1].display); k++) rest += T[k].display + ' ';
    const longEnough = rest.trim().length >= 14;
    if (END.test(t.display) || (text.length > 34 && /[,;:]$/.test(t.display) && longEnough) || (text.length > 52 && longEnough)) flush();
  });
  flush();
  chunks.forEach((ch, i) => caps.push({ s: ch[0].start, e: i + 1 < chunks.length ? chunks[i + 1][0].start : p.end + 0.15, text: ch.map((x) => x.display).join(' ').replace(/\s+([,.!?…।])/g, '$1') }));
}
const st = (x) => { const ms = Math.round(x * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
mkdirSync(ROOT + 'youtube/hi', { recursive: true });
writeFileSync(ROOT + 'youtube/hi/captions-hi.srt', caps.map((c, i) => `${i + 1}\n${st(c.s)} --> ${st(c.e)}\n${c.text}\n`).join('\n'), 'utf8');

writeFileSync(ROOT + 'capture/dub-hi-sync.json', JSON.stringify({ lines: placed.map((p) => ({ id: p.L.id, tempo: p.r, start: r2(p.pieces[0].s), end: r2(p.end), pauses: p.pieces.filter((q) => q.pause > 0.05).map((q) => r2(q.pause)) })), cues: sync }, null, 2));
console.log(report.join('\n') || 'every line at natural speed, no long pauses');
const lags = sync.map((s) => s.lag);
console.log(`sync: ${sync.length} cues, every word after its action (lag ${Math.min(...lags)}–${Math.max(...lags)}s, median ${lags.sort((a, b) => a - b)[lags.length >> 1]}s)`);
console.log(`voice ends ${r2(placed.at(-1).end)}s of ${TOTAL}s · captions ${caps.length}`);
