// Builds index.html for "Chemistry Equations in TestoZa" (forked from testoza-live-exam's build).
//
// Sync rule (owner): the voice never runs ahead of the picture. Every {cue} word in SCRIPT-en.md is
// pinned to the recorded action with the same id: its click lands LEAD s before the word starts.
// Times come from the barcode in each take (m.tv = when the mark really showed on screen).
// Between two clicks the footage is cut into segments: typing marked `slow` plays at real speed
// (owner: formulas must be typed slowly), the AI wait (`maxRate`) up to 12x, everything else up to
// MAXRATE. If the voice leaves more time, the screen holds just before the next click while the
// drawn cursor glides in. The build fails if any click would land after its word.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { timeLine } from './words.mjs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const FPS = 30, LEAD = 0.12, MAXRATE = 2.0, GAP = 0.32, SGAP = 0.6, ZMAX = 1.7, ZGROUP = 1.3;
const DPR = 1.5, BARH = 9, BARW = 12 * 9; // the sync barcode in source pixels (rec-lib BAR)
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
const TAKES = (process.env.TZ_TAKES ? process.env.TZ_TAKES.split(',') : ['a', 'b', 'c', 'd', 'e', 'f']).filter((n) => existsSync(ROOT + `capture/rec/${n}.marks.json`));
const TAKE = Object.fromEntries(TAKES.map((n) => {
  const j = json(`capture/rec/${n}.marks.json`);
  for (const m of j.marks) { m.ts = m.t; m.t = m.tv ?? m.t; if (m.end != null) m.end = +(m.end + (m.lag ?? 0)).toFixed(3); }
  j.marks.forEach((m, k) => { if (m.filedialog) { const e = j.marks.slice(k + 1).find((x) => x.filedialogEnd); if (e) { m.slow = true; m.end = m.slowEnd = e.t; } } });
  // An AI wait may be squeezed hard until the next action shows (the result).
  j.marks.forEach((m, k) => { if (m.maxRate && j.marks[k + 1]) m.end = Math.max(m.end ?? m.t, j.marks[k + 1].t - 0.6); });
  return [n, j];
}));
const markIn = (take, id) => TAKE[take].marks.find((m) => m.id === id);
const cueIds = new Set(Object.values(LINE).flatMap((l) => Object.keys(l.cues)));

/** Source segments of [a, b): slow typing at 1x, AI waits up to its maxRate, the rest up to MAXRATE. */
function segments(take, a, b) {
  const cuts = [];
  for (const m of TAKE[take].marks) {
    if (m.end == null || m.end <= a || m.t >= b) continue;
    if (m.slow) cuts.push({ a: Math.max(a, m.t), b: Math.min(b, m.slowEnd ?? m.end), cap: 1 });
    else if (m.maxRate) cuts.push({ a: Math.max(a, m.t), b: Math.min(b, m.end), cap: m.maxRate });
  }
  cuts.sort((x, y) => x.a - y.a);
  const segs = [];
  let t = a;
  for (const c of cuts) {
    if (c.a < t) { if (c.b > t) c.a = t; else continue; }
    if (c.a > t + 0.01) segs.push({ a: t, len: c.a - t, cap: MAXRATE });
    segs.push({ a: c.a, len: c.b - c.a, cap: c.cap });
    t = c.b;
  }
  if (b > t + 0.01) segs.push({ a: t, len: b - t, cap: MAXRATE });
  return segs.filter((s) => s.len > 0.005);
}
const minDur = (segs) => segs.reduce((s, x) => s + x.len / x.cap, 0);
/** Fit segments into W seconds: natural speed if they fit, else squeeze the fast ones uniformly. */
function fit(segs, W) {
  const nat = segs.reduce((s, x) => s + x.len, 0);
  if (W >= nat) return { outs: segs.map((x) => x.len), hold: W - nat };
  let lo = 1, hi = 12;
  for (let i = 0; i < 40; i++) {
    const r = (lo + hi) / 2;
    const d = segs.reduce((s, x) => s + x.len / Math.min(r, x.cap), 0);
    if (d > W) lo = r; else hi = r;
  }
  return { outs: segs.map((x) => x.len / Math.min(hi, x.cap)), hold: 0 };
}

// ── Sections ───────────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { kind: 'montage', lines: ['L01'] },
  { kind: 'take', take: 'a', lines: ['L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08'] },
  { kind: 'take', take: 'b', lines: ['L09', 'L10', 'L11', 'L12'] },
  { kind: 'take', take: 'c', lines: ['L13', 'L14', 'L15'] },
  { kind: 'take', take: 'd', lines: ['L16', 'L17', 'L18', 'L19'] },
  { kind: 'take', take: 'e', lines: ['L20', 'L21', 'L22'] },
  { kind: 'take', take: 'f', lines: ['L23'] },
  { kind: 'end', lines: ['L24'], lead: 0.8, tail: 3.2 },
].filter((s) => s.kind !== 'take' || TAKE[s.take]);
// Where each paper question comes from (shown when the question starts).
const QSRC = { L03: 'JEE Main 2026 · Q69', L06: 'JEE Main 2026 · Q54', L09: 'JEE Main 2026 · Q67', L13: 'JEE Main 2026 · Q62', L16: 'JEE Adv. 2026 P1 · Q11', L20: 'JEE Adv. 2026 P1 · Q6' };

const report = [], voPlaced = [], cueAt = {}, syncLog = [];
let t = 0;
function placeLine(id, start) {
  voPlaced.push({ id, start });
  for (const [c, ct] of Object.entries(LINE[id].cues)) cueAt[c] = start + ct;
}

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
      const minC = prev ? prev.C + gapNeed(prev, trial[0]) : secStart + 0.5;
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
  // After the last click: its result plays out (the picture may outlast the voice).
  const last = anchors.at(-1);
  const tailEnd = Math.max(...marks.filter((m) => m.t >= last.click).map((m) => (m.end ?? m.t + 1))) + 0.6;
  const tailSegs = segments(take, last.click, tailEnd);
  const secEnd = Math.max(lineStart + 0.5, last.C + minDur(tailSegs));
  const file = `capture/rec/${take}.mp4`, pieces = [];
  let prev = null;
  for (const an of [...anchors, { end: true }]) {
    const C = an.end ? secEnd : an.C;
    if (!prev) {
      // Opening: hold the first frame, then the approach.
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
      if (rate > 2.5) report.push(`${an.line || 'end'} ${an.cue || ''}: a wait plays ${r2(rate)}x`);
      pieces.push({ file, a: s.a, play: outs[i], rate, out0: o, out1: o + outs[i], fast: rate > 2.5 });
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
    const args = ['-y', '-loglevel', 'error'], fl = [];
    spec.forEach((p, i) => {
      args.push('-ss', String(r2(p.a)), '-t', String(r2(Math.max(p.playF, 1) / FPS * p.rate + 0.4)), '-i', ROOT + p.file);
      const play = p.playF > 0 ? `setpts=(PTS-STARTPTS)/${p.rate.toFixed(4)},fps=${FPS},trim=end_frame=${p.playF}` : `fps=${FPS},trim=end_frame=1`;
      const hold = p.playF > 0 ? p.holdF : p.holdF - 1;
      fl.push(`[${i}:v]${play},setpts=PTS-STARTPTS,drawbox=x=0:y=ih-${BARH + 3}:w=${BARW + 4}:h=${BARH + 3}:color=white:t=fill,tpad=stop_mode=clone:stop=${Math.max(0, hold)}[p${i}]`);
    });
    fl.push(`${spec.map((_, i) => `[p${i}]`).join('')}concat=n=${spec.length}:v=1:a=0,format=yuv420p[v]`);
    execFileSync('ffmpeg', [...args, '-filter_complex', fl.join(';'), '-map', '[v]', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', ROOT + out], { maxBuffer: 1 << 26 });
  }
  return { file: out, frames: spec.reduce((s, p) => s + p.playF + p.holdF, 0) };
}

/** Source time → output time inside a scheduled take section. */
const srcToOut = (pieces, s) => {
  for (const p of pieces) if (p.play > 0 && s >= p.a && s <= p.a + p.play * p.rate) return p.out0 + (s - p.a) / p.rate;
  const nxt = pieces.find((p) => p.play > 0 && p.a > s);
  return nxt ? nxt.out0 : pieces.at(-1).out1;
};

// ── Camera: frame the boxes the actions touch; a new framing only when the action leaves it ─────
const fitBox = (bs) => {
  const x0 = Math.min(...bs.map((b) => b.x)) - 70, y0 = Math.min(...bs.map((b) => b.y)) - 60;
  const x1 = Math.max(...bs.map((b) => b.x + b.width)) + 70, y1 = Math.max(...bs.map((b) => b.y + b.height)) + 60;
  const z = Math.max(1, Math.min(ZMAX, 1536 / (x1 - x0), 864 / (y1 - y0)));
  return { z, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};
const view = (k) => {
  const S = 1.25 * k.z;
  return { x0: Math.max(0, k.cx - 768 / k.z), y0: Math.max(0, k.cy - 432 / k.z), x1: Math.min(1536, k.cx + 768 / k.z), y1: Math.min(864, k.cy + 432 / k.z), S };
};
const inside = (k, b) => { const v = view(k); return b.x >= v.x0 + 30 && b.y >= v.y0 + 30 && b.x + b.width <= v.x1 - 30 && b.y + b.height <= v.y1 - 30; };
// Sy Pad is docked at the bottom centre: an action on it frames the whole pad (display + keys).
const PAD = { x: 378, y: 440, width: 780, height: 416 };
const padded = (b) => (b.x + b.width > PAD.x && b.x < PAD.x + PAD.width && b.y + b.height > PAD.y + 10 ? PAD : b);
function cameraKeys(take, sched, secStart) {
  const marks = TAKE[take].marks, keys = [];
  const groups = sched.anchors.map((an, i) => {
    const nx = sched.anchors[i + 1];
    const bs = marks.filter((m) => m.box && m.t >= an.click - 0.05 && (!nx || m.t < nx.click - 0.05)).map((m) => padded(m.box));
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
  return keys.map((k) => {
    const S = 1.25 * k.z;
    return { at: r2(k.at), scale: +S.toFixed(4), x: Math.round(Math.min(0, Math.max(1920 - 1536 * S, 960 - k.cx * S))), y: Math.round(Math.min(0, Math.max(1080 - 864 * S, 540 - k.cy * S))), z: k.z, cy: k.cy };
  });
}

// ── Schedule everything ────────────────────────────────────────────────────────────────────────
const clips = [], audio = [], tl = [], camAt = [];
let n = 0;
const vid = (file, start, dur) => `<video class="clip foot" id="v${++n}" src="${file}" muted data-start="${r2(start)}" data-duration="${r2(dur)}" data-track-index="0"></video>`;
const TIPTEXT = { 'Arrow with conditions above and below (Δ, catalyst)': 'Arrow with conditions', 'Put a picture inside the text': 'Picture inside the text', 'Formula — type H2O or 2H2 + O2 -> 2H2O': 'Formula', 'Normal words inside a formula': 'Words', 'Move right': 'Move right ›' };
const CURSOR_SVG = '<svg viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L16 20l-3 1.3-3.4-7.6L4 18z" fill="#0f172a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';

for (const [si, sec] of SECTIONS.entries()) {
  const secStart = t;
  sec.start = secStart;
  if (sec.kind === 'take') {
    const sched = scheduleTake(sec, secStart);
    const c = cut(`${si}-${sec.take}`, sched.pieces, secStart);
    const dur = c.frames / FPS;
    sec.end = secStart + dur;
    sec.sched = sched;
    const out = (s) => srcToOut(sched.pieces, s);
    const marks = TAKE[sec.take].marks;
    // Overlays inside the cam: cursor + ripple, key rings + tooltips, all in recording CSS px.
    const ov = [];
    const moves = [], hides = [];
    for (const m of marks) {
      if (!m.point) continue;
      const at = out(m.t);
      if (at < secStart - 0.01 || at > sec.end) continue;
      const prevAt = moves.at(-1)?.at ?? secStart;
      moves.push({ at: r2(at), x: Math.round(m.point.x), y: Math.round(m.point.y), click: !m.hover, d: r2(Math.max(0.12, Math.min(0.55, (at - prevAt) * 0.8))) });
    }
    if (moves.length) tl.push({ type: 'cursor', cur: `#cur${si}`, rip: `#rip${si}`, moves, hides });
    ov.push(`<div class="cur" id="cur${si}">${CURSOR_SVG}</div><div class="rip" id="rip${si}"></div>`);
    let ri = 0;
    marks.filter((m) => m.tip && m.box).forEach((m, k, arr) => {
      const at = out(m.t), next = arr[k + 1] ? out(arr[k + 1].t) : at + 2;
      if (at < secStart || at > sec.end) return;
      const b = m.box, id = `${si}-${ri++}`;
      ov.push(`<div class="ring" id="ring${id}" style="left:${r2(b.x - 3)}px;top:${r2(b.y - 3)}px;width:${r2(b.width + 6)}px;height:${r2(b.height + 6)}px"></div>`);
      ov.push(`<div class="tip" id="tip${id}" style="left:${r2(b.x + b.width / 2)}px;top:${r2(b.y + b.height + 8)}px">${esc(TIPTEXT[m.tip] || m.tip)}</div>`);
      tl.push({ type: 'ring', ring: `#ring${id}`, tip: `#tip${id}`, at: r2(at), dur: r2(Math.max(0.5, Math.min(m.hover ? 0.8 : 1.3, next - at - 0.1))) });
    });
    // File dialogs: from "Choose…" to the moment the file is set.
    marks.forEach((m, k) => {
      if (!m.filedialog) return;
      const endM = marks.slice(k + 1).find((x) => x.filedialogEnd);
      const a = out(m.t) + 0.15, b = out(endM.t) + 0.2;
      if (b - a < 1.2) report.push(`file dialog for ${m.id} only ${r2(b - a)}s`);
      sec.dialogs = (sec.dialogs || []).concat([{ id: m.id, file: m.filedialog, a, b }]);
      hides.push([r2(a), r2(b)]);
    });
    clips.push(`<div class="cam" id="cam${si}">${vid(c.file, secStart, dur)}<div class="clip ov" id="ov${si}" data-start="${r2(secStart)}" data-duration="${r2(dur)}" data-track-index="1">${ov.join('')}</div></div>`);
    const cam = cameraKeys(sec.take, sched, secStart);
    tl.push({ type: 'cam', sel: `#cam${si}`, keys: cam });
    camAt.push(...cam.map((k) => ({ ...k })));
    // AI waits shown faster get a tag.
    for (const p of sched.pieces.filter((x) => x.fast)) {
      clips.push(`<div class="clip speed" id="spd${si}-${Math.round(p.out0 * 100)}" data-start="${r2(p.out0)}" data-duration="${r2(p.out1 - p.out0)}" data-track-index="8"><b>${Math.round(p.rate)}×</b> sped up — the AI is reading</div>`);
      tl.push({ type: 'speed', sel: `#spd${si}-${Math.round(p.out0 * 100)}`, at: r2(p.out0) });
    }
    for (const an of sched.anchors) {
      const o = out(an.click), word = cueAt[an.cue] - LEAD;
      if (o > word + 0.03) throw new Error(`SYNC ${an.line} ${an.cue}: click at ${r2(o)}s, word at ${r2(word + LEAD)}s`);
      syncLog.push({ line: an.line, cue: an.cue, click: r2(o), word: r2(cueAt[an.cue]), lead: r2(cueAt[an.cue] - o) });
    }
    t = sec.end;
  } else if (sec.kind === 'montage') {
    const L = 'L01', vs = 0.5;
    placeLine(L, vs);
    const order = ['m1', 'm2', 'm3', 'm4', 'title'];
    // Finished questions, each framed on its card (source time, framing box in CSS px).
    const SRC = json('capture/montage.json');
    const pieces = [], cuts = [];
    order.slice(0, 4).forEach((c, i) => {
      const o0 = i === 0 ? 0 : cueAt[c] - LEAD, o1 = cueAt[order[i + 1]] - LEAD;
      const s = SRC[c];
      pieces.push({ file: `capture/rec/${s.take}.mp4`, a: TAKE[s.take].marks.find((m) => m.id === s.after).t + (s.dt || 0), play: 0, rate: 1, out0: o0, out1: o1 });
      const k = fitBox([s.box]), S = 1.25 * k.z;
      const pos = (z) => ({ scale: +(1.25 * z).toFixed(4), x: Math.round(Math.min(0, Math.max(1920 - 1536 * 1.25 * z, 960 - k.cx * 1.25 * z))), y: Math.round(Math.min(0, Math.max(1080 - 864 * 1.25 * z, 540 - k.cy * 1.25 * z))) });
      cuts.push({ at: r2(o0), dur: r2(o1 - o0), from: pos(k.z * 0.94), to: pos(k.z) });
    });
    const titleAt = cueAt.title - LEAD;
    const c = cut('0-montage', pieces, 0);
    clips.push(`<div class="cam" id="cam0">${vid(c.file, 0, titleAt)}</div>`);
    tl.push({ type: 'montage', sel: '#cam0', cuts });
    sec.end = vs + LINE[L].duration + 1.6;
    clips.push(`<div class="clip card titlecard" id="title" data-start="${r2(titleAt)}" data-duration="${r2(sec.end - titleAt)}" data-track-index="2">
      <div class="stage"><div class="grid"></div></div>
      <img class="wm" src="assets/img/wordmark.png" alt="TestoZa"/>
      <div class="ttl">Chemistry equations in <span>TestoZa</span></div>
      <div class="sub">Formulas <i></i> Reactions <i></i> Tables <i></i> Structures <i></i> Fill from photo</div>
      <div class="src">Real questions from JEE Main and JEE Advanced 2026</div></div>`);
    audio.push(`<audio id="sting1" src="assets/sfx/sting.mp3" data-start="${r2(titleAt - 0.05)}" data-duration="4" data-track-index="13" data-volume="0.5"></audio>`);
    t = sec.end;
  } else {
    const L = sec.lines[0];
    placeLine(L, secStart + sec.lead);
    sec.end = secStart + sec.lead + LINE[L].duration + sec.tail;
    t = sec.end;
  }
}
const TOTAL = r2(t);
const sec = (kind) => SECTIONS.find((s) => s.kind === kind);

// ── File dialogs (full frame, above the footage) ─────────────────────────────────────────────────
const FILES = [['structure-1.png', 'structure-1.png'], ['structure-2.png', 'structure-2.png'], ['jee-adv-2026-p1-q6.png', 'jee-adv-2026-p1-q6.png']];
SECTIONS.filter((s) => s.dialogs).forEach((s) => s.dialogs.forEach((d, i) => {
  const id = `fd-${d.id}`;
  const tiles = FILES.map(([f, img]) => `<div class="tile${f === d.file ? ' pick' : ''}"><div class="th"><img src="assets/img/${img}" alt=""/></div>${f}</div>`).join('');
  clips.push(`<div class="clip fdlg" id="${id}" data-start="${r2(d.a)}" data-duration="${r2(d.b - d.a)}" data-track-index="6"><div class="scrim"></div>
    <div class="win"><div class="bar">Open<i>— ▢ ✕</i></div><div class="path">This PC <b>›</b> Downloads <b>›</b> JEE 2026 chemistry</div>
      <div class="body"><div class="nav"><p><s></s>Home</p><p><s></s>Desktop</p><p class="on"><s></s>Downloads</p><p><s></s>Documents</p><p><s></s>Pictures</p></div><div class="files">${tiles}</div></div>
      <div class="foot2"><div class="fname">File name:&nbsp;<em>${esc(d.file)}</em></div><div class="btn open">Open</div><div class="btn">Cancel</div></div></div>
    <div class="fcur">${CURSOR_SVG}</div></div>`);
  const idx = FILES.findIndex(([f]) => f === d.file);
  const tile = { x: 410 + 220 + 26 + idx * 212 + 105, y: 170 + 114 + 22 + 80 };
  const dur = d.b - d.a, pickAt = d.a + Math.min(1.1, dur * 0.45), openAt = d.b - Math.min(0.45, dur * 0.2);
  tl.push({ type: 'fdlg', sel: `#${id}`, start: r2(d.a), end: r2(d.b), file: d.file, c0: { x: 960, y: 760 }, c1: tile, c2: { x: 410 + 1100 - 22 - 120 - 14 - 60, y: 170 + 690 - 43 }, g1: r2(Math.min(0.7, pickAt - d.a - 0.2)), g2: r2(Math.min(0.45, openAt - pickAt - 0.15)), pickAt: r2(pickAt), openAt: r2(openAt) });
}));

{ // End card.
  const s = sec('end');
  clips.push(`<div class="clip card endcard" id="end" data-start="${r2(s.start)}" data-duration="${r2(s.end - s.start)}" data-track-index="2"><div class="stage"><div class="grid"></div></div>
    <img class="wm" src="assets/img/wordmark.png" alt="TestoZa"/>
    <div class="tag">Formulas, reactions, tables and structures — in one place.</div>
    <div class="pills"><div class="pill url">testoza.com</div><div class="pill subs" id="subpill"><s class="bell"></s>Subscribe</div></div></div>`);
  audio.push(`<audio id="sting2" src="assets/sfx/sting.mp3" data-start="${r2(s.start + 0.2)}" data-duration="4" data-track-index="14" data-volume="0.45"></audio>`);
  tl.push({ type: 'end', start: s.start, endurl: cueAt.endurl, thanks: cueAt.thanks });
}

// ── Chapter chips, question sources, YouTube chapters ──────────────────────────────────────────
const chapters = [];
for (const v of voPlaced) if (CHAPTER[v.id]) chapters.push({ title: CHAPTER[v.id], at: v.id === 'L01' ? 0 : Math.max(0, v.start - 0.6) });
chapters.forEach((c, i) => {
  if (i === 0) return;
  const end = chapters[i + 1]?.at ?? TOTAL - 0.1;
  clips.push(`<div class="clip chip" id="chip${i}" data-start="${r2(c.at + 0.5)}" data-duration="${r2(Math.min(end - c.at - 0.5, 5))}" data-track-index="4"><b>${i}</b>${esc(c.title)}</div>`);
});
for (const v of voPlaced) if (QSRC[v.id]) {
  clips.push(`<div class="clip qsrc" id="qs${v.id}" data-start="${r2(v.start)}" data-duration="5.5" data-track-index="7">${esc(QSRC[v.id])}</div>`);
  tl.push({ type: 'qsrc', sel: `#qs${v.id}`, at: r2(v.start) });
}
const ts = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
mkdirSync(ROOT + 'youtube', { recursive: true });
writeFileSync(ROOT + 'youtube/chapters.txt', chapters.map((c) => `${ts(c.at)} ${c.title}`).join('\n') + '\n');

// ── Captions from the spoken words (top of frame while the camera is low, on Sy Pad) ───────────
const caps = [];
for (const v of voPlaced) {
  const L = LINE[v.id], chunks = [];
  let cur = [];
  const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
  for (const tok of L.tokens) {
    if (tok.display === '—') { flush(); continue; }
    cur.push(tok);
    const text = cur.map((x) => x.display).join(' ');
    if (/[.!?…]$/.test(tok.display) || (text.length > 34 && /[,;:]$/.test(tok.display)) || text.length > 52) flush();
  }
  flush();
  chunks.forEach((ch, i) => {
    const s = v.start + ch[0].start, e = i + 1 < chunks.length ? v.start + chunks[i + 1][0].start : v.start + L.duration + 0.15;
    caps.push({ s, e, text: ch.map((x) => x.display).join(' ').replace(/\s+([,.!?…])/g, '$1') });
  });
}
{
  const st = (x) => { const ms = Math.round(x * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  writeFileSync(ROOT + 'youtube/captions-en.srt', caps.map((c, i) => `${i + 1}\n${st(c.s)} --> ${st(c.e)}\n${c.text}\n`).join('\n'));
}
const camAtTime = (x) => camAt.filter((k) => k.at <= x).at(-1);
const capTop = (x) => { const k = camAtTime(x); return k && k.z > 1.15 && k.cy > 520; };
const capHtml = caps.map((c, i) => `<div class="clip cap${capTop(c.s) ? ' top' : ''}" id="cap${i}" data-start="${r2(c.s)}" data-duration="${r2(Math.max(0.3, c.e - c.s))}" data-track-index="5"><span>${esc(c.text)}</span></div>`).join('\n');

// ── Voice + music ──────────────────────────────────────────────────────────────────────────────
for (const v of voPlaced) audio.push(`<audio id="vo${v.id}" data-audio-group="voiceover" src="${VO[v.id].file}" data-start="${r2(v.start)}" data-duration="${r2(VO[v.id].duration)}" data-track-index="10" data-volume="1"></audio>`);
const len = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ROOT + f]).toString());
function bed(src, need, out) {
  if (existsSync(ROOT + out) && Math.abs(len(out) - need) < 0.2) return;
  const L = len(src), X = 5, k = Math.max(1, Math.ceil((need - X) / (L - X)));
  const args = ['-v', 'error', '-y'];
  for (let i = 0; i < k; i++) args.push('-i', ROOT + src);
  let f = '', last = '[0:a]';
  for (let i = 1; i < k; i++) { f += `${last}[${i}:a]acrossfade=d=${X}[x${i}];`; last = `[x${i}]`; }
  f += `${last}atrim=0:${r2(need)},loudnorm=I=-22:TP=-3,afade=t=in:d=1.2,afade=t=out:st=${r2(need - 2.5)}:d=2.5[out]`;
  execFileSync('ffmpeg', [...args, '-filter_complex', f, '-map', '[out]', '-ar', '48000', '-ac', '2', '-b:a', '192k', ROOT + out]);
}
const carve = '{&quot;enabled&quot;:true,&quot;sources&quot;:[&quot;voiceover&quot;],&quot;strength&quot;:0.85}';
const split = cueAt.title - LEAD + 1.2;
[['assets/music/tech-upbeat.mp3', 0, split + 1.5, 11, 0.2], ['assets/music/lofi.mp3', split, TOTAL - split, 12, 0.13]].forEach(([src, s, d, track, vol], i) => {
  const out = `assets/music/bed-${i + 1}.mp3`;
  bed(src, d, out);
  audio.push(`<audio id="bed${i + 1}" src="${out}" data-start="${r2(s)}" data-duration="${r2(d)}" data-track-index="${track}" data-volume="${vol}" data-fx-carve="${carve}"></audio>`);
});

// ── HTML ───────────────────────────────────────────────────────────────────────────────────────
const css = readFileSync(ROOT + 'capture/scenes.css', 'utf8');
const runtime = readFileSync(ROOT + 'capture/scenes.js', 'utf8');
const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1920, height=1080"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
${css}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1920" data-height="1080">
${clips.join('\n')}
${capHtml}
${audio.join('\n')}
</div>
<script>
const PLAN = ${JSON.stringify(tl)};
${runtime}
</script>
</body></html>`;
writeFileSync(ROOT + 'index.html', html);
writeFileSync(ROOT + 'capture/timing.json', JSON.stringify({ total: TOTAL, voice: voPlaced.map((v) => ({ ...v, end: r2(v.start + VO[v.id].duration) })), cues: Object.fromEntries(Object.entries(cueAt).map(([k, x]) => [k, r2(x)])), sections: SECTIONS.map((s) => ({ kind: s.kind, take: s.take, start: r2(s.start), end: r2(s.end) })) }, null, 2));
writeFileSync(ROOT + 'capture/sync.json', JSON.stringify(syncLog, null, 2));
console.log(report.join('\n') || 'no waits, no speed-ups');
console.log(`sync: ${syncLog.length} clicks checked, all at or before their word (max lead ${Math.max(...syncLog.map((s) => s.lead))}s, min ${Math.min(...syncLog.map((s) => s.lead))}s)`);
console.log('chapters:\n' + chapters.map((c) => `  ${ts(c.at)} ${c.title}`).join('\n'));
console.log('total', TOTAL, 's  clips', clips.length, ' captions', caps.length);
