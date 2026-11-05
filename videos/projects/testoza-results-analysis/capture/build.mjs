// Builds index.html for "TestoZa: Understanding Results" (forked from the Top-10 build).
//
// Sync rule (owner): the voice never runs ahead of the picture. Every {cue} word in SCRIPT-en.md is
// pinned to the recorded action with the same id: its click lands LEAD s before the word starts.
// Times come from the barcode in each take (m.tv = when the mark really showed on screen).
// Between two clicks the footage is cut into segments: typing in SLOW plays at real speed, waits
// (`maxRate`) up to their cap, everything else up to MAXRATE. If the voice leaves more time, the
// screen holds just before the next click while the drawn cursor glides in. After a section's last
// click its footage plays out fast (TAILRATE, at most TAILMAX s) up to the section's `until` mark.
// The build fails if any click would land after its word.
// 2D scenes (anim.mjs/.css/.js) run on their lines' cue times.
// Writes index.html, youtube/{chapters.txt,captions-en.srt}, capture/{timing,sync,events}.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { timeLine } from './words.mjs';
import { animHTML } from './anim.mjs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const FPS = 30, LEAD = 0.12, MAXRATE = 2.5, TAILRATE = 4, TAILMAX = 2.2, GAP = 0.3, SGAP = 0.45, ZMAX = 1.7, ZGROUP = 1.3;
const BARH = 9, BARW = 12 * 9; // the sync barcode in source pixels (rec-lib BAR at 1.5x)
const SLOW = new Set(['x-jyoti', 'x-roll']); // typing the viewer must be able to follow
// Waits that may pass fast: the panel's spinner, the answer sheet loading, page loads.
const PATCH = { panel: { results: { maxRate: 8 }, open: { maxRate: 8 }, full: { maxRate: 8 } }, report: { tap: { maxRate: 6 } }, all: { allsub: { maxRate: 8 } } };
const r2 = (x) => Math.round(x * 100) / 100;
const json = (f) => JSON.parse(readFileSync(ROOT + f, 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
mkdirSync(ROOT + 'assets/cut', { recursive: true });

// ── Voice lines, word timings, chapters ────────────────────────────────────────────────────────
const VO = Object.fromEntries(json('assets/vo-en/vo.json').map((v) => [v.id, v]));
const LINE = {};
for (const id of Object.keys(VO)) LINE[id] = { ...VO[id], ...timeLine(VO[id].raw, json(`assets/vo-en/${id}.words.json`), VO[id].duration) };
const script = readFileSync(ROOT + 'SCRIPT-en.md', 'utf8');
const CHAPTER = {};
{ let pending = null;
  for (const l of script.split('\n')) {
    const c = l.match(/^\[chapter\]\s*(?:\d+:\d+\s+)?(.+)$/); if (c) pending = c[1].trim();
    const h = l.match(/^## (L\d+)/); if (h && pending) { CHAPTER[h[1]] = pending; pending = null; }
  } }

// ── Takes: marks on the barcode clock ──────────────────────────────────────────────────────────
const TAKE = Object.fromEntries(['panel', 'report', 'all'].map((n) => {
  const j = json(`capture/rec/${n}.marks.json`);
  for (const m of j.marks) {
    m.ts = m.t; m.t = m.tv ?? m.t;
    if (m.end != null) m.end = +(m.end + (m.lag ?? 0)).toFixed(3);
    m.slow = !!m.slow || SLOW.has(m.id);
    Object.assign(m, PATCH[n]?.[m.id]);
  }
  j.marks.forEach((m, k) => { if (m.filedialog) { const e = j.marks.slice(k + 1).find((x) => x.filedialogEnd); if (e) { m.slow = true; m.end = m.slowEnd = e.t; } } });
  // An AI wait may be squeezed hard until the next action shows (the result).
  j.marks.forEach((m, k) => { if (m.maxRate && j.marks[k + 1]) m.end = Math.max(m.end ?? m.t, j.marks[k + 1].t - 0.6); });
  j.phone = j.kind === 'phone';
  return [n, j];
}));
const markIn = (take, id) => TAKE[take].marks.find((m) => m.id === id);

/** Source segments of [a, b): slow typing at 1x, AI waits up to their maxRate, the rest up to `rest`. */
function segments(take, a, b, rest = MAXRATE) {
  const cuts = [];
  for (const m of TAKE[take].marks) {
    if (m.end == null || m.end <= a || m.t >= b) continue;
    if (m.slow) cuts.push({ a: Math.max(a, m.t), b: Math.min(b, m.slowEnd ?? m.end), cap: 1 });
    else if (m.maxRate) cuts.push({ a: Math.max(a, m.t), b: Math.min(b, m.end), cap: Math.max(m.maxRate, rest) });
  }
  cuts.sort((x, y) => x.a - y.a);
  const segs = [];
  let t = a;
  for (const c of cuts) {
    if (c.a < t) { if (c.b > t) c.a = t; else continue; }
    if (c.a > t + 0.01) segs.push({ a: t, len: c.a - t, cap: rest });
    segs.push({ a: c.a, len: c.b - c.a, cap: c.cap });
    t = c.b;
  }
  if (b > t + 0.01) segs.push({ a: t, len: b - t, cap: rest });
  return segs.filter((s) => s.len > 0.005);
}
const minDur = (segs) => segs.reduce((s, x) => s + x.len / x.cap, 0);
/** Fit segments into W seconds: natural speed if they fit, else squeeze the fast ones uniformly. */
function fit(segs, W) {
  const nat = segs.reduce((s, x) => s + x.len, 0);
  if (W >= nat) return { outs: segs.map((x) => x.len), hold: W - nat };
  let lo = 1, hi = 20;
  for (let i = 0; i < 40; i++) {
    const r = (lo + hi) / 2;
    const d = segs.reduce((s, x) => s + x.len / Math.min(r, x.cap), 0);
    if (d > W) lo = r; else hi = r;
  }
  return { outs: segs.map((x) => x.len / Math.min(hi, x.cap)), hold: 0 };
}

// ── Sections ───────────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { kind: 'anim', name: 'paper', lines: ['L01', 'L02', 'L03', 'L04'], lead: 0.6, tail: 0.9 },
  { kind: 'anim', name: 'promise', lines: ['L05', 'L06'], tail: 1.0 },
  { kind: 'take', take: 'panel', lines: ['L07', 'L08', 'L09', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15'] },
  { kind: 'take', take: 'report', lines: ['L16', 'L17', 'L18'], until: 'ours' },
  { kind: 'anim', name: 'shapes', lines: ['L19'], tail: 0.7 },
  { kind: 'take', take: 'report', lines: ['L20', 'L21', 'L22', 'L23', 'L24', 'L25'], until: 'x-qhead' },
  { kind: 'anim', name: 'patterns', lines: ['L26'], tail: 1.0 },
  { kind: 'take', take: 'report', lines: ['L27', 'L28'] },
  { kind: 'take', take: 'all', lines: ['L29'] },
  { kind: 'anim', name: 'routine', lines: ['L30'], tail: 1.0 },
  { kind: 'anim', name: 'end', lines: ['L31'], tail: 6.5 },
];
// Sound on the 2D scenes: [cue (or '@start'), file, seconds, volume, offset].
const SFX = {
  paper: [['lamp', 'click-soft.mp3', 0.37, 0.5], ['online', 'whoosh.mp3', 0.57, 0.35], ['title', 'sparkle.mp3', 1.5, 0.3, 0.3]],
  promise: [['reg', 'whoosh-short.mp3', 0.57, 0.18], ['board', 'whoosh-short.mp3', 0.57, 0.18], ['copy', 'whoosh-short.mp3', 0.57, 0.18], ['discuss', 'whoosh-short.mp3', 0.57, 0.18], ['plus', 'sparkle.mp3', 1.5, 0.25, 0.2]],
  shapes: [['@start', 'whoosh-short.mp3', 0.57, 0.25]],
  patterns: [['three', 'whoosh-short.mp3', 0.57, 0.2], ['grey2', 'whoosh-short.mp3', 0.57, 0.2], ['flat', 'whoosh-short.mp3', 0.57, 0.2]],
  routine: [['r1', 'click-soft.mp3', 0.37, 0.4], ['r2', 'click-soft.mp3', 0.37, 0.4], ['r3', 'click-soft.mp3', 0.37, 0.4], ['r4', 'click-soft.mp3', 0.37, 0.4], ['r5', 'click-soft.mp3', 0.37, 0.4], ['done', 'chime.mp3', 1.5, 0.3]],
  end: [['try', 'sting.mp3', 4, 0.3]],
};

const report = [], voPlaced = [], cueAt = {}, syncLog = [], events = {};
let t = 0;
function placeLine(id, start) {
  voPlaced.push({ id, start });
  for (const [c, ct] of Object.entries(LINE[id].cues)) cueAt[c] = start + ct;
}
// Keyed by line: a cue name may repeat in another line (L05 and L13 both have {save}).
const event = (line, cue, at) => { (events[line] ??= {})[cue] = r2(at); };

/** Take section: clicks pinned to cue words; returns ffmpeg pieces. */
function scheduleTake(sec, secStart) {
  const take = sec.take, marks = TAKE[take].marks;
  const anchors = [];
  const gapNeed = (prev, cur) => (prev ? minDur(segments(take, prev.click, cur.click - cur.pre)) : 0) + cur.pre;
  let lineStart = secStart + SGAP;
  for (const [li, id] of sec.lines.entries()) {
    let ls = li === 0 ? lineStart : lineStart + GAP;
    const trial = [];
    for (const [c, ct] of Object.entries(LINE[id].cues).sort((a, b) => a[1] - b[1])) {
      const m = markIn(take, c);
      if (!m) { report.push(`${id}: cue {${c}} has no mark in take ${take}`); continue; }
      trial.push({ cue: c, m, line: id, click: m.t, pre: Math.min(m.pre || 0, 0.4), ideal: ct - LEAD, want: ct - LEAD });
    }
    trial.sort((a, b) => a.click - b.click);
    for (let k = trial.length - 2; k >= 0; k--) trial[k].ideal = Math.min(trial[k].ideal, trial[k + 1].ideal - gapNeed(trial[k], trial[k + 1]));
    if (trial.length) {
      const prev = anchors.at(-1);
      const minC = prev ? prev.C + gapNeed(prev, trial[0]) : secStart + 0.35;
      if (ls + trial[0].ideal < minC) ls = minC - trial[0].ideal + 0.01;
      trial.forEach((x) => { x.C = ls + x.ideal; });
      const early = trial.filter((x) => x.want - x.ideal > 0.6);
      if (early.length) report.push(`${id}: picture leads its word (${early.map((x) => `${x.cue} ${r2(x.want - x.ideal)}s`).join(', ')})`);
      anchors.push(...trial);
    }
    const planned = li === 0 ? lineStart : lineStart + GAP;
    if (ls - planned > 0.05) report.push(`${id}: voice waits ${r2(ls - planned)}s for the picture`);
    placeLine(id, ls);
    lineStart = ls + LINE[id].duration;
  }
  // After the last click its result plays out, fast, up to the section's `until` mark (or the take's end).
  const last = anchors.at(-1);
  const until = sec.until ? markIn(take, sec.until) : null;
  let tailEnd = until ? until.t - 0.2 - (until.pre || 0) : Math.max(...marks.filter((m) => m.t >= last.click).map((m) => (m.end ?? m.t + 1))) + 0.6;
  const tRate = sec.tailRate ?? TAILRATE, tMax = sec.tailMax ?? TAILMAX;
  let tailSegs = segments(take, last.click, tailEnd, tRate);
  while (minDur(tailSegs) > tMax && tailEnd > last.click + 1) { tailEnd -= 0.2; tailSegs = segments(take, last.click, tailEnd, tRate); }
  const secEnd = Math.max(lineStart + 0.45, last.C + minDur(tailSegs));
  const file = `capture/rec/${take}.mp4`, pieces = [];
  let prev = null;
  for (const an of [...anchors, { end: true }]) {
    const C = an.end ? secEnd : an.C;
    if (!prev) {
      // Opening: hold the frame just before the approach, then the approach.
      const a0 = Math.max(0, an.click - an.pre);
      pieces.push({ file, a: Math.max(0, a0 - 0.05), play: 0, rate: 1, out0: secStart, out1: C - an.pre });
      pieces.push({ file, a: a0, play: an.pre, rate: 1, out0: C - an.pre, out1: C });
      an.aOut = C - an.pre;
      prev = an; continue;
    }
    const W = C - prev.C;
    const segs = an.end ? tailSegs : segments(take, prev.click, an.click - an.pre);
    const need = minDur(segs) + (an.end ? 0 : an.pre);
    if (W < need - 1e-3) throw new Error(`${an.cue || 'end'}: click would land ${r2(need - W)}s after its word`);
    const { outs, hold } = fit(segs, W - (an.end ? 0 : an.pre));
    let o = prev.C;
    segs.forEach((s, i) => {
      const rate = s.len / outs[i];
      if (rate > 2.5 && !an.end) report.push(`${an.line} ${an.cue}: a wait plays ${r2(rate)}x`);
      pieces.push({ file, a: s.a, play: outs[i], rate, out0: o, out1: o + outs[i], fast: rate > 2.5 && s.len > 3 });
      o += outs[i];
    });
    if (hold > 0) {
      const holdSrc = an.end ? (segs.at(-1) ? segs.at(-1).a + segs.at(-1).len : prev.click) : an.click - an.pre;
      pieces.push({ file, a: Math.max(0, holdSrc - 0.04), play: 0, rate: 1, out0: o, out1: o + hold });
      o += hold;
    }
    if (!an.end) {
      pieces.push({ file, a: an.click - an.pre, play: an.pre, rate: 1, out0: o, out1: C });
      an.aOut = o;
      prev = an;
    }
  }
  return { secEnd, pieces, anchors };
}

/** One video per section, exact to the frame; the barcode is painted over. */
function cut(name, pieces, secStart) {
  const f = (x) => Math.round((x - secStart) * FPS);
  const spec = pieces.map((p) => {
    const F0 = f(p.out0), F1 = f(p.out1), playF = Math.min(F1 - F0, Math.max(p.play > 0 ? 1 : 0, Math.round(p.play * FPS)));
    return { file: p.file, a: p.a, rate: p.rate, playF, holdF: F1 - F0 - playF };
  }).filter((p) => p.playF + p.holdF > 0);
  const hash = createHash('md5').update(JSON.stringify(spec)).digest('hex').slice(0, 10);
  const out = `assets/cut/${name}-${hash}.mp4`;
  if (!existsSync(ROOT + out)) {
    // Long sections go in chunks (a Windows command line holds ~32k characters), joined losslessly.
    const CHUNK = 36, parts = [];
    for (let k = 0; k < spec.length; k += CHUNK) {
      const part = spec.length > CHUNK ? `assets/cut/${name}-${hash}-${k / CHUNK}.mp4` : out;
      const args = ['-y', '-loglevel', 'error'], fl = [], sp = spec.slice(k, k + CHUNK);
      sp.forEach((p, i) => {
        args.push('-ss', String(r2(p.a)), '-t', String(r2(Math.max(p.playF, 1) / FPS * p.rate + 0.4)), '-i', ROOT + p.file);
        const play = p.playF > 0 ? `setpts=(PTS-STARTPTS)/${p.rate.toFixed(4)},fps=${FPS},trim=end_frame=${p.playF}` : `fps=${FPS},trim=end_frame=1`;
        const hold = p.playF > 0 ? p.holdF : p.holdF - 1;
        fl.push(`[${i}:v]${play},setpts=PTS-STARTPTS,drawbox=x=0:y=ih-${BARH + 3}:w=${BARW + 4}:h=${BARH + 3}:color=white:t=fill,tpad=stop_mode=clone:stop=${Math.max(0, hold)}[p${i}]`);
      });
      fl.push(`${sp.map((_, i) => `[p${i}]`).join('')}concat=n=${sp.length}:v=1:a=0,format=yuv420p[v]`);
      execFileSync('ffmpeg', [...args, '-filter_complex', fl.join(';'), '-map', '[v]', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', ROOT + part], { maxBuffer: 1 << 26 });
      parts.push(part);
    }
    if (parts.length > 1) {
      const list = ROOT + `assets/cut/${name}-${hash}.txt`;
      writeFileSync(list, parts.map((x) => `file '${ROOT + x}'`).join('\n'));
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', ROOT + out]);
    }
  }
  return { file: out, frames: spec.reduce((s, p) => s + p.playF + p.holdF, 0) };
}

/** Source time → output time inside a scheduled take section. */
const srcToOut = (pieces, s) => {
  // The last piece that shows `s`: a typed mark's frame ends one segment and, after a hold, starts the next.
  for (const p of [...pieces].reverse()) if (p.play > 0 && s >= p.a && s <= p.a + p.play * p.rate) return p.out0 + (s - p.a) / p.rate;
  const nxt = pieces.find((p) => p.play > 0 && p.a > s);
  return nxt ? nxt.out0 : pieces.at(-1).out1;
};

// ── Camera: frame the boxes the actions touch; a new framing only when the action leaves it ─────
const fitBox = (bs) => {
  const x0 = Math.min(...bs.map((b) => b.x)) - 80, y0 = Math.min(...bs.map((b) => b.y)) - 70;
  const x1 = Math.max(...bs.map((b) => b.x + b.width)) + 80, y1 = Math.max(...bs.map((b) => b.y + b.height)) + 70;
  const z = Math.max(1, Math.min(ZMAX, 1536 / (x1 - x0), 864 / (y1 - y0)));
  return { z, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};
const view = (k) => ({ x0: Math.max(0, k.cx - 768 / k.z), y0: Math.max(0, k.cy - 432 / k.z), x1: Math.min(1536, k.cx + 768 / k.z), y1: Math.min(864, k.cy + 432 / k.z) });
const inside = (k, b) => { const v = view(k); return b.x >= v.x0 + 30 && b.y >= v.y0 + 30 && b.x + b.width <= v.x1 - 30 && b.y + b.height <= v.y1 - 30; };
const camPos = (k) => {
  const S = 1.25 * k.z;
  return { scale: +S.toFixed(4), x: Math.round(Math.min(0, Math.max(1920 - 1536 * S, 960 - k.cx * S))), y: Math.round(Math.min(0, Math.max(1080 - 864 * S, 540 - k.cy * S))) };
};
function cameraKeys(take, sched, secStart) {
  const marks = TAKE[take].marks, keys = [];
  const groups = sched.anchors.map((an, i) => {
    const nx = sched.anchors[i + 1];
    const bs = marks.filter((m) => m.box && m.t >= an.click - 0.05 && (!nx || m.t < nx.click - 0.05)).map((m) => m.box);
    return { an, bs };
  }).filter((g) => g.bs.length);
  let cur = null;
  for (let i = 0; i < groups.length; i++) {
    if (cur && groups[i].bs.every((b) => inside(cur, b))) continue;
    let bs = [...groups[i].bs], k = fitBox(bs);
    for (let j = i + 1; j < groups.length && groups[j].an.line === groups[i].an.line; j++) {
      const t2 = fitBox([...bs, ...groups[j].bs]);
      if (t2.z < ZGROUP) break;
      bs = [...bs, ...groups[j].bs]; k = t2;
    }
    const at = Math.max(secStart, groups[i].an.aOut - 0.85);
    if (keys.length && at - keys.at(-1).at < 0.95) keys.pop();
    keys.push({ at, ...k });
    cur = k;
  }
  if (!keys.length || keys[0].at > secStart + 0.01) keys.unshift({ at: secStart, ...(keys[0] || { z: 1, cx: 768, cy: 432 }) });
  return keys.map((k) => ({ at: r2(k.at), ...camPos(k) }));
}

// ── Phone: a 646×1398 take (430×932 CSS at 1.5x) shown 0.7 in a phone frame ───────────────────
const PH = { w: 646, h: 1398, s: 0.7, css: 1.5 };
const PHW = Math.round(PH.w * PH.s), PHH = Math.round(PH.h * PH.s); // 452 × 979 screen
const PHX = 960 - PHW / 2, PHY = (1080 - PHH) / 2;
/** Browser-bar windows: while the page is 740 CSS tall (not full screen) it sits at the canvas bottom;
 *  the edit lifts it by the bottom toolbar's height and draws status + address bar above it. */
function phoneWindows(take, toOut, a, b) {
  const sizes = TAKE[take].sizes || [];
  const wins = [];
  sizes.forEach((s, i) => {
    if (s.h >= 900) return;
    const s0 = Math.max(a, toOut(s.t)), s1 = Math.min(b, sizes[i + 1] ? toOut(sizes[i + 1].t) : b);
    if (s1 > s0) wins.push([r2(s0), r2(s1)]);
  });
  return wins;
}

// ── Schedule everything ────────────────────────────────────────────────────────────────────────
const clips = [], audio = [], tl = [], clicks = [];
let n = 0;
const vid = (file, start, dur, cls = 'foot') => `<video class="clip ${cls}" id="v${++n}" src="${file}" muted data-start="${r2(start)}" data-duration="${r2(dur)}" data-track-index="1"></video>`;
const CURSOR_SVG = '<svg viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L16 20l-3 1.3-3.4-7.6L4 18z" fill="#0f172a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const FF_SVG = '<svg viewBox="0 0 24 24"><path d="M3 5l9 7-9 7zM12 5l9 7-9 7z" fill="currentColor"/></svg>';
const LOCK_SVG = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const statusBar = `<div class="sbar"><b>9:41</b><i class="isl"></i><span class="sig"><b></b><b></b><b></b><b></b><em></em></span></div>`;
// Wrappers around footage are not timed elements (a timed <video> may not sit inside one): the runtime
// shows each between data-on and data-off.
const onOff = (start, dur) => `data-on="${r2(start)}" data-off="${r2(start + dur)}"`;
const phoneShell = (id, start, dur, inner) => `<div class="phonescene" id="${id}" ${onOff(start, dur)}>
  <div class="glow"></div><div class="pcam" id="${id}-cam"><div class="phone" style="left:${PHX - 14}px;top:${PHY - 14}px;width:${PHW + 28}px;height:${PHH + 28}px"><div class="screen" style="width:${PHW}px;height:${PHH}px">${inner}</div></div></div></div>`;

/** A desktop footage window: a clip that scales up into the frame when the section starts. */
function deskWindow(si, file, start, dur, ov = '') {
  clips.push(`<div class="win" id="w${si}" ${onOff(start, dur)}><div class="cam" id="cam${si}">${vid(file, start, dur)}<div class="ov">${ov}</div></div></div>`);
}

for (const [si, sec] of SECTIONS.entries()) {
  const secStart = t;
  sec.start = secStart;
  if (sec.kind === 'take') {
    const sched = scheduleTake(sec, secStart);
    const c = cut(`${si}-${sec.take}`, sched.pieces, secStart);
    const dur = c.frames / FPS;
    sec.end = secStart + dur;
    const out = (s) => srcToOut(sched.pieces, s);
    const marks = TAKE[sec.take].marks;
    const firstSrc = sched.pieces[0].a, lastSrc = Math.max(...sched.pieces.map((p) => p.a + p.play * p.rate));
    const inSec = (m) => m.t >= firstSrc - 0.05 && m.t <= lastSrc + 0.05;
    for (const m of marks) if (inSec(m) && m.point && !m.hover && !m.id.startsWith('x-opt') && m.id !== 'x-blank') clicks.push(out(m.t));
    if (TAKE[sec.take].phone) {
      const id = `ph${si}`;
      const wins = phoneWindows(sec.take, out, secStart, sec.end);
      const det = markIn('phone', 'details');
      const urlAt = det ? out(det.t) : secStart;
      clips.push(phoneShell(id, secStart, dur, `<div class="pv" id="${id}-pv">${vid(c.file, secStart, dur, 'pvid')}</div>
        <div class="chrome" id="${id}-chrome">${statusBar}<div class="purl"><i class="lk">${LOCK_SVG}</i><span class="u1">testoza.com/join</span><span class="u2">app.testoza.com</span></div></div>
        <div class="tbar" id="${id}-tbar"><i></i><i></i><i></i><i></i><i></i></div>`));
      const zooms = sched.anchors.filter((an) => PHONEZOOM[an.cue] && an.m.box).map((an) => {
        const b = an.m.box, full = (TAKE.phone.sizes.filter((s) => s.t <= an.click).at(-1)?.h ?? 932) >= 900;
        // Box (viewport CSS px) → screen px inside the phone.
        const top = full ? 0 : (932 - 740) * PH.css * PH.s - 62;
        const cx = PHX + (b.x + b.width / 2) * PH.css * PH.s, cy = PHY + top + (b.y + b.height / 2) * PH.css * PH.s;
        return { at: r2(an.aOut - 0.5), z: PHONEZOOM[an.cue], cx: r2(cx), cy: r2(cy), hold: r2(Math.min(3.2, (sched.anchors[sched.anchors.indexOf(an) + 1]?.aOut ?? sec.end) - an.aOut)) };
      });
      tl.push({ type: 'phone', sel: `#${id}`, start: r2(secStart), end: r2(sec.end), wins, urlAt: r2(urlAt), zooms });
    } else {
      // Overlays inside the cam: the drawn cursor + click ripple, in recording CSS px.
      const moves = [], hides = [];
      for (const m of marks) {
        if (!m.point || !inSec(m)) continue;
        const at = out(m.t);
        if (at < secStart - 0.01 || at > sec.end) continue;
        const prevAt = moves.at(-1)?.at ?? secStart;
        moves.push({ at: r2(at), x: Math.round(m.point.x), y: Math.round(m.point.y), click: !m.hover, d: r2(Math.max(0.12, Math.min(0.55, (at - prevAt) * 0.8))) });
      }
      marks.forEach((m, k) => {
        if (!m.filedialog || !inSec(m)) return;
        const endM = marks.slice(k + 1).find((x) => x.filedialogEnd);
        const a = out(m.t) + 0.15, b = out(endM.t) + 0.2;
        sec.dialogs = (sec.dialogs || []).concat([{ id: m.id, file: m.filedialog, a, b }]);
        hides.push([r2(a), r2(b)]);
      });
      if (moves.length) tl.push({ type: 'cursor', cur: `#cur${si}`, rip: `#rip${si}`, moves, hides });
      deskWindow(si, c.file, secStart, dur, `<div class="cur" id="cur${si}">${CURSOR_SVG}</div><div class="rip" id="rip${si}"></div>`);
      tl.push({ type: 'cam', sel: `#cam${si}`, keys: cameraKeys(sec.take, sched, secStart) });
    }
    tl.push({ type: 'reveal', sel: TAKE[sec.take].phone ? `#ph${si}-cam` : `#w${si}`, at: r2(secStart) });
    // Waits shown faster get a fast-forward pill (no words: an icon and the speed).
    for (const p of sched.pieces.filter((x) => x.fast)) {
      const id = `spd${si}-${Math.round(p.out0 * 100)}`;
      clips.push(`<div class="clip speed" id="${id}" data-start="${r2(p.out0)}" data-duration="${r2(p.out1 - p.out0)}" data-track-index="8"><i>${FF_SVG}</i><b>${Math.round(p.rate)}×</b></div>`);
      tl.push({ type: 'speed', sel: `#${id}`, at: r2(p.out0) });
    }
    for (const an of sched.anchors) {
      const o = out(an.click), word = cueAt[an.cue] - LEAD;
      if (o > word + 0.03) throw new Error(`SYNC ${an.line} ${an.cue}: click at ${r2(o)}s, word at ${r2(word + LEAD)}s`);
      syncLog.push({ line: an.line, cue: an.cue, click: r2(o), word: r2(cueAt[an.cue]), lead: r2(cueAt[an.cue] - o) });
      event(an.line, an.cue, o);
    }
    t = sec.end;
  } else if (sec.kind === 'anim') {
    let ls = secStart + (sec.lead ?? 0.45);
    const cues = {};
    for (const [li, id] of sec.lines.entries()) {
      if (li) ls += sec.gap ?? 0.35;
      placeLine(id, ls);
      for (const [c, ct] of Object.entries(LINE[id].cues)) { cues[c] = r2(ls + ct); event(id, c, ls + ct); }
      ls += LINE[id].duration;
    }
    sec.end = ls + (sec.tail ?? 0.6);
    clips.push(animHTML(sec.name, `data-start="${r2(secStart)}" data-duration="${r2(sec.end - secStart)}" data-track-index="3"`));
    tl.push({ type: 'anim', name: sec.name, sel: `#an-${sec.name}`, start: r2(secStart), end: r2(sec.end), cues });
    (SFX[sec.name] || []).forEach(([cue, file, dur, vol, d = 0], k) => {
      const at = (cue === '@start' ? secStart : cues[cue]) + d;
      if (Number.isFinite(at)) audio.push(`<audio id="fx-${sec.name}-${k}" src="assets/sfx/${file}" data-start="${r2(Math.max(0, at))}" data-duration="${dur}" data-track-index="13" data-volume="${vol}"></audio>`);
    });
    t = sec.end;
  }
}
const TOTAL = r2(t);

// ── File dialog (the PDF) — full frame, above the footage ──────────────────────────────────────
SECTIONS.filter((s) => s.dialogs).forEach((s) => s.dialogs.forEach((d) => {
  const id = `fd-${d.id}`;
  const files = ['DPP-06-Units-and-Measurement.pdf', d.file, 'Class-notes-Kinematics.pdf'];
  const tiles = files.map((f) => `<div class="tile${f === d.file ? ' pick' : ''}"><div class="th"><i class="pdf"></i></div>${esc(f)}</div>`).join('');
  clips.push(`<div class="clip fdlg" id="${id}" data-start="${r2(d.a)}" data-duration="${r2(d.b - d.a)}" data-track-index="6"><div class="scrim"></div>
    <div class="fwin"><div class="bar">Open<i>— ▢ ✕</i></div><div class="path">This PC <b>›</b> Downloads <b>›</b> NEET Physics</div>
      <div class="body"><div class="nav"><p><s></s>Home</p><p><s></s>Desktop</p><p class="on"><s></s>Downloads</p><p><s></s>Documents</p></div><div class="files">${tiles}</div></div>
      <div class="foot2"><div class="fname">File name:&nbsp;<em>${esc(d.file)}</em></div><div class="btn open">Open</div><div class="btn">Cancel</div></div></div>
    <div class="fcur">${CURSOR_SVG}</div></div>`);
  const tile = { x: 410 + 220 + 26 + 1 * 212 + 105, y: 170 + 114 + 22 + 80 };
  const dur = d.b - d.a, pickAt = d.a + Math.min(1.1, dur * 0.45), openAt = d.b - Math.min(0.45, dur * 0.2);
  tl.push({ type: 'fdlg', sel: `#${id}`, start: r2(d.a), end: r2(d.b), c0: { x: 960, y: 760 }, c1: tile, c2: { x: 410 + 1100 - 22 - 120 - 14 - 60, y: 170 + 690 - 43 }, g1: r2(Math.min(0.7, pickAt - d.a - 0.2)), g2: r2(Math.min(0.45, openAt - pickAt - 0.15)), pickAt: r2(pickAt), openAt: r2(openAt) });
  clicks.push(pickAt, openAt);
}));

// ── Chapters, captions file (never on the picture) ─────────────────────────────────────────────
const chapters = [];
for (const v of voPlaced) if (CHAPTER[v.id]) {
  const s = SECTIONS.find((x) => x.lines.includes(v.id));
  chapters.push({ title: CHAPTER[v.id], at: v.id === 'L01' ? 0 : r2(Math.max(s.start, v.start - 0.5)) });
}
const ts = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
mkdirSync(ROOT + 'youtube', { recursive: true });
writeFileSync(ROOT + 'youtube/chapters.txt', chapters.map((c) => `${ts(c.at)} ${c.title}`).join('\n') + '\n');
const caps = [];
for (const v of voPlaced) {
  const L = LINE[v.id], chunks = [];
  let cur = [];
  const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
  for (const tok of L.tokens) {
    cur.push(tok);
    const text = cur.map((x) => x.display).join(' ');
    if (/[.!?…]$/.test(tok.display) || (text.length > 34 && /[,;:—]$/.test(tok.display)) || text.length > 48) flush();
  }
  flush();
  chunks.forEach((ch, i) => {
    const s = v.start + ch[0].start, e = i + 1 < chunks.length ? v.start + chunks[i + 1][0].start : v.start + L.duration + 0.2;
    caps.push({ s, e, text: ch.map((x) => x.display).join(' ').replace(/\s+([,.!?…])/g, '$1').replace(/^—\s*/, '').replace(/TestoZa/g, 'TestoZa') });
  });
}
const srt = (x) => { const ms = Math.round(x * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
writeFileSync(ROOT + 'youtube/captions-en.srt', caps.map((c, i) => `${i + 1}\n${srt(c.s)} --> ${srt(c.e)}\n${c.text}\n`).join('\n'));

// ── Voice, clicks, music ───────────────────────────────────────────────────────────────────────
for (const v of voPlaced) audio.push(`<audio id="vo${v.id}" data-audio-group="voiceover" src="${VO[v.id].file}" data-start="${r2(v.start)}" data-duration="${r2(VO[v.id].duration)}" data-track-index="10" data-volume="1"></audio>`);
clicks.sort((a, b) => a - b).filter((c, i, a) => i === 0 || c - a[i - 1] > 0.2).forEach((c, i) => audio.push(`<audio id="ck${i}" src="assets/sfx/click-soft.mp3" data-start="${r2(c)}" data-duration="0.37" data-track-index="15" data-volume="0.4"></audio>`));
const len = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ROOT + f]).toString());
function bed(src, need, out, from = 0) {
  if (existsSync(ROOT + out) && Math.abs(len(out) - need) < 0.2) return;
  const L = len(src) - from, X = 4, k = Math.max(1, Math.ceil((need - X) / (L - X)));
  const args = ['-v', 'error', '-y'];
  for (let i = 0; i < k; i++) args.push('-ss', String(from), '-i', ROOT + src);
  let f = '', last = '[0:a]';
  for (let i = 1; i < k; i++) { f += `${last}[${i}:a]acrossfade=d=${X}[x${i}];`; last = `[x${i}]`; }
  f += `${last}atrim=0:${r2(need)},loudnorm=I=-20:TP=-3,afade=t=in:d=1.0,afade=t=out:st=${r2(need - 2)}:d=2[out]`;
  execFileSync('ffmpeg', [...args, '-filter_complex', f, '-map', '[out]', '-ar', '48000', '-ac', '2', '-b:a', '192k', ROOT + out]);
}
const carve = '{&quot;enabled&quot;:true,&quot;sources&quot;:[&quot;voiceover&quot;],&quot;strength&quot;:0.85}';
// No music under the Sunday-night desk; it starts when the story turns to TestoZa ({online}) and
// changes once, when the Full report begins.
const timingCue = (line, cue) => voPlaced.find((v) => v.id === line).start + LINE[line].cues[cue];
const musicIn = timingCue('L04', 'online') - 0.3, act2 = SECTIONS.find((x) => x.take === 'report').start;
const BEDS = [['assets/music/tech-upbeat.mp3', musicIn, act2 - musicIn + 1.5, 0.17], ['assets/music/corporate-momentum.mp3', act2 - 0.5, TOTAL - act2 + 0.5, 0.18]];
BEDS.forEach(([src, s, d, vol], i) => {
  const out = `assets/music/bed-${i + 1}.mp3`;
  bed(src, d, out);
  audio.push(`<audio id="bed${i + 1}" src="${out}" data-start="${r2(s)}" data-duration="${r2(d)}" data-track-index="${20 + i}" data-volume="${vol}" data-fx-carve="${carve}"></audio>`);
});

// ── HTML ───────────────────────────────────────────────────────────────────────────────────────
const css = readFileSync(ROOT + 'capture/scenes.css', 'utf8') + '\n' + readFileSync(ROOT + 'capture/anim.css', 'utf8');
const runtime = readFileSync(ROOT + 'capture/anim.js', 'utf8') + '\n' + readFileSync(ROOT + 'capture/scenes.js', 'utf8');
const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1920, height=1080"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
${css}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1920" data-height="1080">
<div class="clip stage" id="stage" data-start="0" data-duration="${TOTAL}" data-track-index="0"><div class="grid"></div></div>
${clips.join('\n')}
${audio.join('\n')}
</div>
<script>
const PLAN = ${JSON.stringify(tl)};
${runtime}
</script>
</body></html>`;
writeFileSync(ROOT + 'index.html', html);
writeFileSync(ROOT + 'capture/timing.json', JSON.stringify({ total: TOTAL, voice: voPlaced.map((v) => ({ ...v, start: r2(v.start), end: r2(v.start + VO[v.id].duration) })), cues: Object.fromEntries(voPlaced.map((v) => [v.id, Object.fromEntries(Object.entries(LINE[v.id].cues).map(([c, ct]) => [c, r2(v.start + ct)]))])), sections: SECTIONS.map((s) => ({ kind: s.kind, take: s.take, n: s.n, lines: s.lines, start: r2(s.start), end: r2(s.end) })), beds: BEDS.map(([src, s, d, vol], i) => ({ file: `assets/music/bed-${i + 1}.mp3`, start: r2(s), dur: r2(d), vol })) }, null, 2));
writeFileSync(ROOT + 'capture/sync.json', JSON.stringify(syncLog, null, 2));
// Dub tracks: the picture moment of every cue (a dubbed cue word must come after it).
writeFileSync(ROOT + 'capture/events.json', JSON.stringify(events, null, 2));
console.log(report.join('\n') || 'no waits, no speed-ups');
console.log(`sync: ${syncLog.length} clicks checked, all at or before their word (max lead ${Math.max(...syncLog.map((s) => s.lead))}s, min ${Math.min(...syncLog.map((s) => s.lead))}s)`);
console.log('chapters:\n' + chapters.map((c) => `  ${ts(c.at)} ${c.title}`).join('\n'));
console.log('total', TOTAL, 's  clips', clips.length, ' captions', caps.length, ' clicks', clicks.length);
