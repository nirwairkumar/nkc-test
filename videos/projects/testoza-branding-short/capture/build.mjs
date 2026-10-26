// Builds index.html for the "Branding Tests" Short, 1080x1920 (sync engine forked from
// testoza-top-10-features).
//
// Sync rule (owner): the voice never runs ahead of the picture. Every {cue} word in SCRIPT-en.md is
// pinned to the recorded action with the same id: its click lands LEAD s before the word starts.
// Times come from the barcode in each take (m.tv = when the mark really showed on screen).
// Between two clicks the footage is cut into segments: typing in SLOW plays at real speed, marked
// waits/typing (`maxRate`) up to their cap, everything else up to MAXRATE. If the voice leaves more
// time, the screen holds just before the next click while the drawn cursor glides in.
// No text is drawn on the picture (owner): the real app UI, the logo and testoza.com only.
// Writes index.html, youtube/captions-en.srt, capture/{timing,sync,events}.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { timeLine } from './words.mjs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const FPS = 30, LEAD = 0.12, MAXRATE = 3, TAILRATE = 4, TAILMAX = 1.2, GAP = 0.18, SGAP = 0.3, W = 1080, H = 1920;
const BARH = 9, BARW = 12 * 9; // the sync barcode in source pixels (rec-lib BAR at 1.5x)
const SLOW = new Set(['nametype']); // typing the viewer must be able to follow
const PATCH = { build: { save: { maxRate: 10 } }, desk: { dgo: { maxRate: 8 } }, phone: { pgo: { maxRate: 6 } } };
const r2 = (x) => Math.round(x * 100) / 100;
const json = (f) => JSON.parse(readFileSync(ROOT + f, 'utf8'));
mkdirSync(ROOT + 'assets/cut', { recursive: true });

// ── Voice lines, word timings ──────────────────────────────────────────────────────────────────
const VO = Object.fromEntries(json('assets/vo-en/vo.json').map((v) => [v.id, v]));
const LINE = {};
for (const id of Object.keys(VO)) LINE[id] = { ...VO[id], ...timeLine(VO[id].raw, json(`assets/vo-en/${id}.words.json`), VO[id].duration) };

// ── Takes: marks on the barcode clock ──────────────────────────────────────────────────────────
const TAKE = Object.fromEntries(['build', 'conduct', 'desk', 'phone'].map((n) => {
  const j = json(`capture/rec/${n}.marks.json`);
  for (const m of j.marks) {
    m.ts = m.t; m.t = m.tv ?? m.t;
    if (m.end != null) m.end = +(m.end + (m.lag ?? 0)).toFixed(3);
    m.slow = SLOW.has(m.id);
    Object.assign(m, PATCH[n]?.[m.id]);
  }
  // The three questions are a fast flow (owner): their typing and option clicks may run up to 10x.
  if (n === 'build') for (const m of j.marks) if (/^(q\dt|x-o)/.test(m.id)) m.maxRate = 10;
  // A wait may be squeezed hard until the next action shows (the result).
  j.marks.forEach((m, k) => { if (m.maxRate && j.marks[k + 1]) m.end = Math.max(m.end ?? m.t, j.marks[k + 1].t - 0.6); });
  j.phone = j.kind === 'phone';
  return [n, j];
}));
const markIn = (take, id) => TAKE[take].marks.find((m) => m.id === id);

/** Source segments of [a, b): slow typing at 1x, marked waits up to their maxRate, the rest up to `rest`. */
const REST = { build: 4, conduct: 4.5, desk: 4 }; // between clicks: menus and page loads may pass quicker here
function segments(take, a, b, rest = REST[take] ?? MAXRATE) {
  const cuts = [];
  for (const m of TAKE[take].marks) {
    if (m.end == null || m.end <= a || m.t >= b) continue;
    if (m.slow) cuts.push({ a: Math.max(a, m.t), b: Math.min(b, m.end), cap: 1 });
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
/** Fit segments into Wd seconds: natural speed if they fit, else squeeze the fast ones uniformly. */
function fit(segs, Wd) {
  const nat = segs.reduce((s, x) => s + x.len, 0);
  if (Wd >= nat) return { outs: segs.map((x) => x.len), hold: Wd - nat };
  let lo = 1, hi = 20;
  for (let i = 0; i < 40; i++) {
    const r = (lo + hi) / 2;
    const d = segs.reduce((s, x) => s + x.len / Math.min(r, x.cap), 0);
    if (d > Wd) lo = r; else hi = r;
  }
  return { outs: segs.map((x) => x.len / Math.min(hi, x.cap)), hold: 0 };
}

// ── Sections ───────────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { kind: 'hook', lines: ['L01'] },
  // Save → the page lands on the site footer first (its blurb has a word the owner bans): cut on the click.
  { kind: 'take', take: 'build', lines: ['L02', 'L03', 'L04'], cutAfter: ['save', 0.45] },
  { kind: 'take', take: 'conduct', lines: ['L05'] },
  { kind: 'take', take: 'desk', lines: ['L06'], until: 'next1' },
  { kind: 'take', take: 'phone', lines: ['L07'], until: 'next2' },
  { kind: 'end', lines: ['L08'], lead: 0.35, tail: 2.4 },
];

const report = [], voPlaced = [], cueAt = {}, syncLog = [], events = {};
let t = 0;
function placeLine(id, start) {
  voPlaced.push({ id, start });
  for (const [c, ct] of Object.entries(LINE[id].cues)) cueAt[c] = start + ct;
}
const event = (line, cue, at) => { (events[line] ??= {})[cue] = r2(at); };

/** Take section: clicks pinned to cue words; returns the pieces of footage. */
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
      const minC = prev ? prev.C + gapNeed(prev, trial[0]) : secStart + 0.3;
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
  // After the last click its result plays out, fast, up to `until` / `cutAfter` (or the take's end).
  const last = anchors.at(-1);
  const until = sec.until ? markIn(take, sec.until) : null;
  let tailEnd = sec.cutAfter ? markIn(take, sec.cutAfter[0]).t + sec.cutAfter[1]
    : until ? until.t - 0.2 - (until.pre || 0) : Math.max(...marks.filter((m) => m.t >= last.click).map((m) => (m.end ?? m.t + 1))) + 0.6;
  let tailSegs = segments(take, last.click, tailEnd, TAILRATE);
  while (minDur(tailSegs) > TAILMAX && tailEnd > last.click + 1 && !sec.cutAfter) { tailEnd -= 0.2; tailSegs = segments(take, last.click, tailEnd, TAILRATE); }
  const secEnd = Math.max(lineStart + 0.3, last.C + minDur(tailSegs));
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
    const Wd = C - prev.C;
    const segs = an.end ? tailSegs : segments(take, prev.click, an.click - an.pre);
    const need = minDur(segs) + (an.end ? 0 : an.pre);
    if (Wd < need - 1e-3) throw new Error(`${an.cue || 'end'}: click would land ${r2(need - Wd)}s after its word`);
    const { outs, hold } = fit(segs, Wd - (an.end ? 0 : an.pre));
    let o = prev.C;
    segs.forEach((s, i) => {
      const rate = s.len / outs[i];
      if (rate > 3.2 && !an.end) report.push(`${an.line} ${an.cue}: plays ${r2(rate)}x`);
      pieces.push({ file, a: s.a, play: outs[i], rate, out0: o, out1: o + outs[i] });
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
  for (const p of [...pieces].reverse()) if (p.play > 0 && s >= p.a && s <= p.a + p.play * p.rate) return p.out0 + (s - p.a) / p.rate;
  const nxt = pieces.find((p) => p.play > 0 && p.a > s);
  return nxt ? nxt.out0 : pieces.at(-1).out1;
};

// ── Desktop views: a camera card (builder, conduct) or a laptop screen (the candidate) ──────────
// The cam holds the 1536x864 CSS-px recording; scale S = display px per CSS px.
const VIEW = {
  card: { x: 40, y: 300, w: 1000, h: 1240, smin: 1240 / 864, smax: 2.0, pad: 60 },
  laptop: { x: 40, y: 650, w: 1000, h: 562.5, smin: 1000 / 1536, smax: 1.75, pad: 40 },
};
const keyFor = (v, bs, sCap = v.smax) => {
  const x0 = Math.min(...bs.map((b) => b.x)) - v.pad, y0 = Math.min(...bs.map((b) => b.y)) - v.pad;
  const x1 = Math.max(...bs.map((b) => b.x + b.width)) + v.pad, y1 = Math.max(...bs.map((b) => b.y + b.height)) + v.pad;
  const S = Math.max(v.smin, Math.min(sCap, v.w / (x1 - x0), v.h / (y1 - y0)));
  // UI reads from the left and top: boxes wider/taller than the view keep their left/top edge in frame.
  const vw = v.w / S, vh = v.h / S;
  return { S, cx: x1 - x0 > vw ? x0 + vw / 2 : (x0 + x1) / 2, cy: y1 - y0 > vh ? y0 + vh / 2 : (y0 + y1) / 2, bs };
};
const visible = (v, k) => ({ x0: k.cx - v.w / 2 / k.S, x1: k.cx + v.w / 2 / k.S, y0: k.cy - v.h / 2 / k.S, y1: k.cy + v.h / 2 / k.S });
const inside = (v, k, b) => { const s = visible(v, k); return b.x >= s.x0 + 20 && b.y >= s.y0 + 20 && b.x + b.width <= s.x1 - 20 && b.y + b.height <= s.y1 - 20; };
const camPos = (v, k) => ({
  scale: +k.S.toFixed(4),
  x: Math.round(Math.min(0, Math.max(v.w - 1536 * k.S, v.w / 2 - k.cx * k.S))),
  y: Math.round(Math.min(0, Math.max(v.h - 864 * k.S, v.h / 2 - k.cy * k.S))),
});
// Per-take framing caps: the brand bar punch-in goes close; the answers sit wide on the laptop.
const SCAP = {
  build: { name: 1.6, nametype: 1.6, color: 1.44, font: 1.44, branded: 1.44 },
  conduct: { conduct: 1.6, start: 1.6, live: 1.6, copy: 1.6, menu: 1.6, getcode: 1.6, code: 1.6 },
  desk: { dbrand: 1.75, ans1: 0.8, next1: 0.8, cname: 1.2, dgo: 1.1 },
};
// Fixed framings: the exam page keeps its question on the far left and the brand bar in the
// centre, so the laptop's brand shot frames both (from the left edge), and stays for the answers.
const FRAME = { desk: { dbrand: { S: 1.12, cx: 446, cy: 251 } } };
function cameraKeys(take, v, sched, secStart) {
  const marks = TAKE[take].marks, keys = [];
  const groups = sched.anchors.map((an, i) => {
    const nx = sched.anchors[i + 1];
    // The last group frames its own action only (what follows plays out in the tail).
    const ms = marks.filter((m) => m.box && m.t >= an.click - 0.05 && (nx ? m.t < nx.click - 0.05 : m.t < an.click + 1.2));
    return { an, bs: ms.map((m) => m.box), cap: Math.min(...ms.map((m) => SCAP[take]?.[m.id] ?? v.smax)) };
  }).filter((g) => g.bs.length);
  let cur = null;
  for (const g of groups) {
    const fixed = FRAME[take]?.[g.an.cue];
    let k = fixed ? { ...fixed, bs: g.bs } : keyFor(v, g.bs, g.cap);
    if (!fixed && cur && g.bs.every((b) => inside(v, cur, b)) && Math.abs(k.S - cur.S) < 0.25) continue;
    const at = Math.max(secStart, g.an.aOut - 0.7);
    // Two moves too close together: one framing for both.
    if (keys.length && at - keys.at(-1).at < 0.8) { const last = keys.pop(); k = { ...keyFor(v, [...last.bs, ...g.bs], g.cap), at: last.at }; keys.push(k); cur = k; continue; }
    keys.push({ at, ...k });
    cur = k;
  }
  if (!keys.length || keys[0].at > secStart + 0.01) keys.unshift({ ...(keys[0] || { S: v.smin, cx: 768, cy: 432 }), at: secStart });
  return keys.map((k) => ({ at: r2(k.at), ...camPos(v, k) }));
}

// ── Phone: a 646x1398 take (430x932 CSS at 1.5x) at 0.7 in a frame, the frame scaled by PK ────────
const PH = { w: 646, h: 1398, s: 0.7, css: 1.5 };
const PHW = Math.round(PH.w * PH.s), PHH = Math.round(PH.h * PH.s); // 452 x 979 screen (frame px)
const PK = 1.45, PX = Math.round((W - (PHW + 28) * PK) / 2), PY = 250;
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
/** A phone box (viewport CSS px) → canvas px. */
const phonePt = (take, at, b) => {
  const full = (TAKE[take].sizes.filter((s) => s.t <= at).at(-1)?.h ?? 932) >= 900;
  const top = full ? 0 : (932 - 740) * PH.css * PH.s - 62;
  return { cx: PX + PK * (14 + (b.x + b.width / 2) * PH.css * PH.s), cy: PY + PK * (14 + top + (b.y + b.height / 2) * PH.css * PH.s) };
};
const PHONEZOOM = { typecode: 1.3, pbrand: 1.35 };

// ── Schedule everything ────────────────────────────────────────────────────────────────────────
const clips = [], audio = [], tl = [], clicks = [], whooshes = [];
let n = 0;
const vid = (file, start, dur, cls = 'foot') => `<video class="clip ${cls}" id="v${++n}" src="${file}" muted data-start="${r2(start)}" data-duration="${r2(dur)}" data-track-index="1"></video>`;
const CURSOR_SVG = '<svg viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L16 20l-3 1.3-3.4-7.6L4 18z" fill="#0f172a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const LOCK_SVG = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const statusBar = `<div class="sbar"><b>9:41</b><i class="isl"></i><span class="sig"><b></b><b></b><b></b><b></b><em></em></span></div>`;
const onOff = (start, dur) => `data-on="${r2(start)}" data-off="${r2(start + dur)}"`;
const phoneBody = (id, inner, url1 = 'testoza.com/join') => `<div class="phone" style="width:${PHW + 28}px;height:${PHH + 28}px"><div class="screen" style="width:${PHW}px;height:${PHH}px">${inner}
  <div class="chrome" id="${id}-chrome">${statusBar}<div class="purl"><i class="lk">${LOCK_SVG}</i><span class="u1">${url1}</span><span class="u2">app.testoza.com</span></div></div>
  <div class="tbar" id="${id}-tbar"><i></i><i></i><i></i><i></i><i></i></div></div></div>`;
const laptopBody = (camId, inner) => `<div class="laptop"><div class="lid"><i class="lcam"></i><div class="lscreen"><div class="cam" id="${camId}">${inner}</div></div></div><div class="lbase"><i></i></div></div>`;

for (const [si, sec] of SECTIONS.entries()) {
  const secStart = t;
  sec.start = secStart;
  if (si > 0) whooshes.push(secStart);
  if (sec.kind === 'take') {
    const sched = scheduleTake(sec, secStart);
    const c = cut(`${si}-${sec.take}`, sched.pieces, secStart);
    const dur = c.frames / FPS;
    sec.end = secStart + dur;
    const out = (s) => srcToOut(sched.pieces, s);
    const marks = TAKE[sec.take].marks;
    const firstSrc = sched.pieces[0].a, lastSrc = Math.max(...sched.pieces.map((p) => p.a + p.play * p.rate));
    const inSec = (m) => m.t >= firstSrc - 0.05 && m.t <= lastSrc + 0.05;
    for (const m of marks) if (inSec(m) && m.point && !m.hover && !m.id.startsWith('x-o')) clicks.push(out(m.t));
    if (TAKE[sec.take].phone) {
      const id = `ph${si}`;
      const wins = phoneWindows(sec.take, out, secStart, sec.end);
      const det = markIn(sec.take, 'pdetails');
      clips.push(`<div class="scene" id="${id}" ${onOff(secStart, dur)}><div class="glow"></div><div class="pcam" id="${id}-cam">
        <div class="pwrap" id="${id}-wrap" style="left:${PX}px;top:${PY}px;transform:scale(${PK})">${phoneBody(id, `<div class="pv" id="${id}-pv">${vid(c.file, secStart, dur, 'pvid')}</div>`)}</div></div></div>`);
      const zooms = sched.anchors.filter((an) => PHONEZOOM[an.cue] && an.m.box).map((an, i, arr) => {
        const p = phonePt(sec.take, an.click, an.m.box);
        const nextOut = sched.anchors[sched.anchors.indexOf(an) + 1]?.aOut ?? sec.end;
        return { at: r2(an.aOut - 0.5), z: PHONEZOOM[an.cue], cx: r2(p.cx), cy: r2(p.cy), hold: r2(Math.max(0.6, Math.min(2.6, nextOut - an.aOut - 0.6))) };
      });
      tl.push({ type: 'phone', sel: `#${id}`, start: r2(secStart), end: r2(sec.end), wins, urlAt: r2(det ? out(det.t) : secStart), zooms, W, H });
      tl.push({ type: 'reveal', sel: `#${id}-wrap`, at: r2(secStart), pk: PK });
    } else {
      const vname = sec.take === 'desk' ? 'laptop' : 'card', v = VIEW[vname], camId = `cam${si}`;
      // Overlays inside the cam: the drawn cursor + click ripple, in recording CSS px.
      const moves = [], hides = [];
      for (const m of marks) {
        if (!m.point || !inSec(m)) continue;
        const at = out(m.t);
        if (at < secStart - 0.01 || at > sec.end) continue;
        const prevAt = moves.at(-1)?.at ?? secStart;
        moves.push({ at: r2(at), x: Math.round(m.point.x), y: Math.round(m.point.y), click: !m.hover, d: r2(Math.max(0.12, Math.min(0.5, (at - prevAt) * 0.8))) });
      }
      // The logo drops in from outside the frame, carried by the cursor.
      let fly = '';
      const lg = markIn(sec.take, 'logo');
      if (lg && inSec(lg)) {
        const at = out(lg.t), b = lg.box;
        fly = `<div class="fly" id="fly${si}"><img src="assets/img/apex-academy-logo.png" alt=""/><div class="fcur">${CURSOR_SVG}</div></div>`;
        tl.push({ type: 'fly', sel: `#fly${si}`, at: r2(at), x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), size: Math.round(b.width * 0.92) });
        hides.push([r2(at - 0.75), r2(at + 0.15)]);
      }
      if (moves.length) tl.push({ type: 'cursor', cur: `#cur${si}`, rip: `#rip${si}`, moves, hides });
      const inner = `${vid(c.file, secStart, dur)}<div class="ov">${fly}<div class="cur" id="cur${si}">${CURSOR_SVG}</div><div class="rip" id="rip${si}"></div></div>`;
      if (vname === 'laptop') {
        clips.push(`<div class="scene" id="w${si}" ${onOff(secStart, dur)}><div class="glow g2"></div><div class="lwrap" id="lw${si}" style="left:${v.x}px;top:${v.y}px">${laptopBody(camId, inner)}</div></div>`);
        tl.push({ type: 'reveal', sel: `#lw${si}`, at: r2(secStart), pk: 1 });
      } else {
        clips.push(`<div class="scene" id="w${si}" ${onOff(secStart, dur)}><div class="glow"></div><div class="dcard" id="dc${si}" style="left:${v.x}px;top:${v.y}px;width:${v.w}px;height:${v.h}px"><div class="cam" id="${camId}">${inner}</div></div></div>`);
        tl.push({ type: 'reveal', sel: `#dc${si}`, at: r2(secStart), pk: 1 });
      }
      tl.push({ type: 'cam', sel: `#${camId}`, keys: cameraKeys(sec.take, v, sched, secStart) });
    }
    for (const an of sched.anchors) {
      const o = out(an.click), word = cueAt[an.cue] - LEAD;
      if (o > word + 0.03) throw new Error(`SYNC ${an.line} ${an.cue}: click at ${r2(o)}s, word at ${r2(word + LEAD)}s`);
      syncLog.push({ line: an.line, cue: an.cue, click: r2(o), word: r2(cueAt[an.cue]), lead: r2(cueAt[an.cue] - o) });
      event(an.line, an.cue, o);
    }
    t = sec.end;
  } else if (sec.kind === 'hook') {
    // A laptop and a phone, both in the branded exam, at real speed.
    const L = 'L01', vs = 0.25;
    placeLine(L, vs);
    sec.end = vs + LINE[L].duration + 0.35;
    event(L, 'hook', 0); event(L, 'how', cueAt.how - LEAD);
    const dm = markIn('desk', 'dbrand'), pm = markIn('phone', 'pexam');
    const dc = cut('0-hook-desk', [{ file: 'capture/rec/desk.mp4', a: dm.t - 0.3, play: sec.end, rate: 1, out0: 0, out1: sec.end }], 0);
    const pc = cut('0-hook-phone', [{ file: 'capture/rec/phone.mp4', a: pm.t + 0.4, play: sec.end, rate: 1, out0: 0, out1: sec.end }], 0);
    const k = { S: 1.08, cx: 463, cy: 260 }; // the brand bar, centred at the top of the page
    const v = { ...VIEW.laptop };
    clips.push(`<div class="scene" id="hook" ${onOff(0, sec.end)}><div class="glow"></div><div class="glow g2"></div>
      <div class="lwrap" id="hk-lap" style="left:${v.x}px;top:330px">${laptopBody('hk-cam', vid(dc.file, 0, sec.end))}</div>
      <div class="pwrap" id="hk-ph" style="left:560px;top:820px;transform:scale(0.98)">${phoneBody('hk', `<div class="pv full">${vid(pc.file, 0, sec.end, 'pvid')}</div>`)}</div></div>`);
    tl.push({ type: 'hook', at: 0, end: r2(sec.end), cam0: camPos(v, k), cam1: camPos(v, { ...k, S: 1.18, cx: 424 }), how: r2(cueAt.how - LEAD) });
    audio.push(`<audio id="hksting" src="assets/sfx/sparkle.mp3" data-start="0.1" data-duration="2" data-track-index="13" data-volume="0.22"></audio>`);
    t = sec.end;
  } else {
    const L = sec.lines[0];
    placeLine(L, secStart + sec.lead);
    sec.end = secStart + sec.lead + LINE[L].duration + sec.tail;
    event(L, 'endcard', cueAt.endcard); event(L, 'endurl', cueAt.endurl);
    clips.push(`<div class="clip card endcard" id="end" data-start="${r2(secStart)}" data-duration="${r2(sec.end - secStart)}" data-track-index="3">
      <img class="wm" src="assets/img/wordmark.png" alt="TestoZa"/>
      <div class="pill url">testoza.com</div></div>`);
    tl.push({ type: 'end', at: r2(secStart), endurl: r2(cueAt.endurl - LEAD) });
    audio.push(`<audio id="sting2" src="assets/sfx/sting.mp3" data-start="${r2(secStart + 0.05)}" data-duration="4" data-track-index="14" data-volume="0.28"></audio>`);
    t = sec.end;
  }
}
const TOTAL = r2(t);

// ── Captions file (never on the picture) ───────────────────────────────────────────────────────
mkdirSync(ROOT + 'youtube', { recursive: true });
const caps = [];
for (const v of voPlaced) {
  const L = LINE[v.id], chunks = [];
  let cur = [];
  const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
  for (const tok of L.tokens) {
    cur.push(tok);
    const text = cur.map((x) => x.display).join(' ');
    if (/[.!?…]$/.test(tok.display) || (text.length > 26 && /[,;:—]$/.test(tok.display)) || text.length > 38) flush();
  }
  flush();
  chunks.forEach((ch, i) => {
    const s = v.start + ch[0].start, e = i + 1 < chunks.length ? v.start + chunks[i + 1][0].start : v.start + L.duration + 0.2;
    caps.push({ s, e, text: ch.map((x) => x.display).join(' ').replace(/\s+([,.!?…])/g, '$1').replace(/^—\s*/, '').replace(/\s*—$/, '') });
  });
}
const srt = (x) => { const ms = Math.round(x * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
writeFileSync(ROOT + 'youtube/captions-en.srt', caps.map((c, i) => `${i + 1}\n${srt(c.s)} --> ${srt(c.e)}\n${c.text}\n`).join('\n'));

// ── Voice, clicks, whooshes, music ─────────────────────────────────────────────────────────────
for (const v of voPlaced) audio.push(`<audio id="vo${v.id}" data-audio-group="voiceover" src="${VO[v.id].file}" data-start="${r2(v.start)}" data-duration="${r2(VO[v.id].duration)}" data-track-index="10" data-volume="1"></audio>`);
clicks.sort((a, b) => a - b).filter((c, i, a) => i === 0 || c - a[i - 1] > 0.2).forEach((c, i) => audio.push(`<audio id="ck${i}" src="assets/sfx/click-soft.mp3" data-start="${r2(c)}" data-duration="0.37" data-track-index="15" data-volume="0.4"></audio>`));
whooshes.forEach((w, i) => audio.push(`<audio id="wh${i}" src="assets/sfx/whoosh-short.mp3" data-start="${r2(Math.max(0, w - 0.18))}" data-duration="0.57" data-track-index="16" data-volume="0.22"></audio>`));
const len = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ROOT + f]).toString());
const BED = { src: 'assets/music/bed-129.mp3', from: 0, out: 'assets/music/bed.mp3', vol: 0.24 };
if (!existsSync(ROOT + BED.out) || Math.abs(len(BED.out) - TOTAL) > 0.2) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(BED.from), '-i', ROOT + BED.src, '-af',
    `atrim=0:${TOTAL},loudnorm=I=-20:TP=-3,afade=t=in:d=0.3,afade=t=out:st=${r2(TOTAL - 1.6)}:d=1.6`, '-ar', '48000', '-ac', '2', '-b:a', '192k', ROOT + BED.out]);
}
const carve = '{&quot;enabled&quot;:true,&quot;sources&quot;:[&quot;voiceover&quot;],&quot;strength&quot;:0.85}';
audio.push(`<audio id="bed" src="${BED.out}" data-start="0" data-duration="${TOTAL}" data-track-index="20" data-volume="${BED.vol}" data-fx-carve="${carve}"></audio>`);

// ── HTML ───────────────────────────────────────────────────────────────────────────────────────
const css = readFileSync(ROOT + 'capture/scenes.css', 'utf8');
const runtime = readFileSync(ROOT + 'capture/scenes.js', 'utf8');
const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=${W}, height=${H}"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
${css}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
<div class="clip stage" id="stage" data-start="0" data-duration="${TOTAL}" data-track-index="0"><div class="grid"></div><img class="topmark" src="assets/img/wordmark.png" alt="TestoZa"/></div>
${clips.join('\n')}
${audio.join('\n')}
</div>
<script>
const PLAN = ${JSON.stringify(tl)};
${runtime}
</script>
</body></html>`;
writeFileSync(ROOT + 'index.html', html);
writeFileSync(ROOT + 'capture/timing.json', JSON.stringify({ total: TOTAL, voice: voPlaced.map((v) => ({ ...v, start: r2(v.start), end: r2(v.start + VO[v.id].duration) })), cues: Object.fromEntries(voPlaced.map((v) => [v.id, Object.fromEntries(Object.entries(LINE[v.id].cues).map(([c, ct]) => [c, r2(v.start + ct)]))])), sections: SECTIONS.map((s) => ({ kind: s.kind, take: s.take, lines: s.lines, start: r2(s.start), end: r2(s.end) })) }, null, 2));
writeFileSync(ROOT + 'capture/sync.json', JSON.stringify(syncLog, null, 2));
// Dub tracks: the picture moment of every cue (a dubbed cue word must come after it).
writeFileSync(ROOT + 'capture/events.json', JSON.stringify(events, null, 2));
console.log(report.join('\n') || 'no waits, no speed-ups');
console.log(`sync: ${syncLog.length} clicks checked, all at or before their word (max lead ${Math.max(...syncLog.map((s) => s.lead))}s, min ${Math.min(...syncLog.map((s) => s.lead))}s)`);
console.log('sections:', SECTIONS.map((s) => `${s.kind}${s.take ? ':' + s.take : ''} ${r2(s.start)}–${r2(s.end)}`).join(' | '));
console.log('total', TOTAL, 's  clips', clips.length, ' captions', caps.length, ' clicks', clicks.length);
