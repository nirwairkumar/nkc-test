// Builds index.html (1080×1920) for one reel: node capture/build-reel.mjs cbt|proctor|sched
// Forked from testoza-top-10-features' build.mjs: the same sync rule (every {cue} click lands LEAD s
// before its word; the voice never trails the picture), the same segment speeds and holds, the
// same barcode clock. Vertical: desktop footage sits in a rounded card whose camera follows the
// actions at a readable zoom; phone footage sits in a large phone. No words on the picture.
// Writes index.html, youtube/<reel>/captions-en.srt, capture/<reel>/{timing,sync}.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { timeLine } from './words.mjs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const REEL = process.argv[2];
const FPS = 30, LEAD = 0.12, MAXRATE = 2.5, TAILRATE = 4, TAILMAX = 1.6, GAP = 0.25, SGAP = 0.3;
const BARH = 9, BARW = 12 * 9;
const W = 1080, H = 1920;
// Desktop: the whole screen on top (context), a zoomed detail below that follows the actions.
const OVW = { x: 40, y: 230, w: 1000, h: 563 }, OVS = OVW.w / 1536;
const CARD = { x: 40, y: 833, w: 1000, h: 760 };
const SMIN = 1.1, SMAX = 2.0;                      // CSS → detail-card px
const r2 = (x) => Math.round(x * 100) / 100;
const json = (f) => JSON.parse(readFileSync(ROOT + f, 'utf8'));

const REELS = {
  cbt: {
    music: ['assets/music/tech-upbeat.mp3', 0.2],
    sections: [
      { take: 'cbt', lines: ['L01'], until: 'ans1' },
      { take: 'teacher', lines: ['L02'], until: 'x-menu' },
      { take: 'cbt', lines: ['L03', 'L04'], until: 'cancel' },
      { kind: 'end', lines: ['L05'] },
    ],
  },
  proctor: {
    music: ['assets/music/cand-3.mp3', 0.2],
    sections: [
      { take: 'cbt', lines: ['L01'], until: 'ok1' },
      { take: 'teacher', lines: ['L02'], until: 'aitab' },
      { take: 'cbt', lines: ['L03'] },
      { take: 'teacher', lines: ['L04'], until: 'results' },
      { kind: 'end', lines: ['L05'] },
    ],
  },
  sched: {
    music: ['assets/music/corporate-momentum.mp3', 0.22],
    sections: [
      { take: 'early', lines: ['L01'], until: 'x-end' },
      { take: 'sched', lines: ['L02'] },
      { take: 'late', lines: ['L03'] },
      { kind: 'end', lines: ['L04'] },
    ],
  },
};
const CFG = REELS[REEL];
if (!CFG) throw new Error('usage: node capture/build-reel.mjs cbt|proctor|sched');
// Waits: `cut` passes as good as instantly (a loading screen), `maxRate` shows a ⏩ pill.
const PATCH = {
  teacher: { settings: { maxRate: 60, nopill: true } }, // the settings dialog took ~44 s to load
  early: { wait: { maxRate: 80 } },                    // the waiting-room countdown, fast-forwarded
  // Static pauses after the dialog opens and after each time is typed: pass them quickly.
  sched: { settings: { maxRate: 8, nopill: true }, access: { maxRate: 5, nopill: true }, start: { maxRate: 5, nopill: true }, end: { maxRate: 5, nopill: true } },
  cbt: { go: { maxRate: 8, nopill: true },
    warn2: { box: { x: 544, y: 256, width: 448, height: 346 } }, // the full-screen dialog, not the toast
    auto: { box: { x: 416, y: 160, width: 632, height: 209 } },  // the score card
    legend: { box: { x: 1233, y: 100, width: 286, height: 80 }, point: { x: 1376, y: 140 } } }, // the hover found the button, not the legend
};

// ── Voice ──────────────────────────────────────────────────────────────────────────────────────
const VO = Object.fromEntries(json(`assets/vo-${REEL}/vo.json`).map((v) => [v.id, v]));
const LINE = {};
for (const id of Object.keys(VO)) LINE[id] = { ...VO[id], ...timeLine(VO[id].raw, json(`assets/vo-${REEL}/${id}.words.json`), VO[id].duration) };

// ── Takes ──────────────────────────────────────────────────────────────────────────────────────
const TAKE = {};
for (const n of new Set(CFG.sections.filter((s) => s.take).map((s) => s.take))) {
  const j = json(`capture/rec/${n}.marks.json`);
  for (const m of j.marks) {
    m.t = m.tv ?? m.t;
    if (m.end != null) m.end = +(m.end + (m.lag ?? 0)).toFixed(3);
    m.slow = false;
    Object.assign(m, PATCH[n]?.[m.id]);
  }
  j.marks.forEach((m, k) => { if (m.maxRate && j.marks[k + 1]) m.end = Math.max(m.end ?? m.t, j.marks[k + 1].t - 0.6); });
  // A section may end on a take's last frame: a virtual mark there.
  j.marks.push({ id: 'x-end', t: Math.max(...j.marks.map((m) => m.end ?? m.t)) + 0.8 });
  j.phone = j.kind === 'phone';
  TAKE[n] = j;
}
const markIn = (take, id) => TAKE[take].marks.find((m) => m.id === id);

function segments(take, a, b, rest = MAXRATE) {
  const cuts = [];
  for (const m of TAKE[take].marks) {
    if (m.end == null || m.end <= a || m.t >= b || !m.maxRate) continue;
    cuts.push({ a: Math.max(a, m.t), b: Math.min(b, m.end), cap: Math.max(m.maxRate, rest), pill: !m.nopill });
  }
  cuts.sort((x, y) => x.a - y.a);
  const segs = [];
  let t = a;
  for (const c of cuts) {
    if (c.a < t) { if (c.b > t) c.a = t; else continue; }
    if (c.a > t + 0.01) segs.push({ a: t, len: c.a - t, cap: rest });
    segs.push({ a: c.a, len: c.b - c.a, cap: c.cap, pill: c.pill });
    t = c.b;
  }
  if (b > t + 0.01) segs.push({ a: t, len: b - t, cap: rest });
  return segs.filter((s) => s.len > 0.005);
}
const minDur = (segs) => segs.reduce((s, x) => s + x.len / x.cap, 0);
function fit(segs, Wd) {
  const nat = segs.reduce((s, x) => s + x.len, 0);
  if (Wd >= nat) return { outs: segs.map((x) => x.len), hold: Wd - nat };
  let lo = 1, hi = 100;
  for (let i = 0; i < 50; i++) {
    const r = (lo + hi) / 2;
    if (segs.reduce((s, x) => s + x.len / Math.min(r, x.cap), 0) > Wd) lo = r; else hi = r;
  }
  return { outs: segs.map((x) => x.len / Math.min(hi, x.cap)), hold: 0 };
}

const report = [], voPlaced = [], cueAt = {}, syncLog = [];
function placeLine(id, start) {
  voPlaced.push({ id, start });
  for (const [c, ct] of Object.entries(LINE[id].cues)) cueAt[c] = start + ct;
}

function scheduleTake(sec, secStart) {
  const take = sec.take, marks = TAKE[take].marks, anchors = [];
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
  const last = anchors.at(-1);
  const until = sec.until ? markIn(take, sec.until) : null;
  let tailEnd = until ? until.t - 0.2 - (until.pre || 0) : Math.max(...marks.filter((m) => m.t >= last.click).map((m) => (m.end ?? m.t + 1))) + 0.4;
  let tailSegs = segments(take, last.click, tailEnd, TAILRATE);
  while (minDur(tailSegs) > TAILMAX && tailEnd > last.click + 1) { tailEnd -= 0.2; tailSegs = segments(take, last.click, tailEnd, TAILRATE); }
  const secEnd = Math.max(lineStart + 0.3, last.C + minDur(tailSegs));
  const file = `capture/rec/${take}.mp4`, pieces = [];
  let prev = null;
  for (const an of [...anchors, { end: true }]) {
    const C = an.end ? secEnd : an.C;
    if (!prev) {
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
      if (rate > 2.6 && !an.end) report.push(`${an.line} ${an.cue}: a wait plays ${r2(rate)}x`);
      pieces.push({ file, a: s.a, play: outs[i], rate, out0: o, out1: o + outs[i], fast: rate > 2.6 && s.len > 3 && s.pill });
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

function cut(name, pieces, secStart) {
  const f = (x) => Math.round((x - secStart) * FPS);
  const spec = pieces.map((p) => {
    const F0 = f(p.out0), F1 = f(p.out1), playF = Math.min(F1 - F0, Math.max(p.play > 0 ? 1 : 0, Math.round(p.play * FPS)));
    return { file: p.file, a: p.a, rate: p.rate, playF, holdF: F1 - F0 - playF };
  }).filter((p) => p.playF + p.holdF > 0);
  const hash = createHash('md5').update(JSON.stringify(spec)).digest('hex').slice(0, 10);
  const out = `assets/cut/${REEL}-${name}-${hash}.mp4`;
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
const srcToOut = (pieces, s) => {
  for (const p of [...pieces].reverse()) if (p.play > 0 && s >= p.a && s <= p.a + p.play * p.rate) return p.out0 + (s - p.a) / p.rate;
  const nxt = pieces.find((p) => p.play > 0 && p.a > s);
  return nxt ? nxt.out0 : pieces.at(-1).out1;
};

// ── Portrait camera on desktop footage: the card shows a region around the actions ─────────────
const camPos = (k) => {
  const S = k.S;
  return { scale: +S.toFixed(4), x: Math.round(Math.min(0, Math.max(CARD.w - 1536 * S, CARD.w / 2 - k.cx * S))), y: Math.round(Math.min(0, Math.max(CARD.h - 864 * S, CARD.h / 2 - k.cy * S))) };
};
const fitBox = (bs) => {
  let x0 = Math.min(...bs.map((b) => b.x)) - 50, y0 = Math.min(...bs.map((b) => b.y)) - 60;
  let x1 = Math.max(...bs.map((b) => b.x + b.width)) + 50, y1 = Math.max(...bs.map((b) => b.y + b.height)) + 60;
  // At least 560 × 420 CSS px in view: a small target keeps its surroundings.
  if (x1 - x0 < 560) { const d = (560 - (x1 - x0)) / 2; x0 -= d; x1 += d; }
  if (y1 - y0 < 420) { const d = (420 - (y1 - y0)) / 2; y0 -= d; y1 += d; }
  return { S: Math.max(SMIN, Math.min(SMAX, CARD.w / (x1 - x0), CARD.h / (y1 - y0))), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};
const inside = (k, b) => {
  const vx0 = k.cx - CARD.w / 2 / k.S, vx1 = k.cx + CARD.w / 2 / k.S, vy0 = k.cy - CARD.h / 2 / k.S, vy1 = k.cy + CARD.h / 2 / k.S;
  return b.x >= vx0 + 20 && b.x + b.width <= vx1 - 20 && b.y >= vy0 + 20 && b.y + b.height <= vy1 - 20;
};
function cameraKeys(take, sched, secStart) {
  // Only this section's footage (a last anchor would otherwise collect the rest of the take).
  const lastSrc = Math.max(...sched.pieces.map((p) => p.a + p.play * p.rate));
  const marks = TAKE[take].marks.filter((m) => m.t <= lastSrc + 0.05), keys = [];
  let cur = null;
  sched.anchors.forEach((an, i) => {
    const nx = sched.anchors[i + 1];
    // A full-width row (an option) is framed around where it was clicked, not its middle.
    // A switch at a row's right end brings its label (to the left) into view.
    const narrow = (m) => (m.box.width > 700 && m.point ? { x: m.point.x - 230, y: m.box.y, width: 460, height: m.box.height }
      : m.box.width <= 60 && m.box.height <= 40 && m.box.x > 900 ? { x: m.box.x - 790, y: m.box.y - 10, width: 790 + m.box.width, height: m.box.height + 20 } : m.box);
    const bs = marks.filter((m) => m.box && m.t >= an.click - 0.05 && (!nx || m.t < nx.click - 0.05)).map(narrow);
    if (!bs.length || (cur && bs.every((b) => inside(cur, b)))) return;
    const k = fitBox(bs.slice(0, 3));
    const at = Math.max(secStart, an.aOut - 0.7);
    if (keys.length && at - keys.at(-1).at < 0.8) keys.pop();
    keys.push({ at, ...k });
    cur = k;
  });
  if (!keys.length || keys[0].at > secStart + 0.01) keys.unshift({ at: secStart, ...(keys[0] || { S: SMIN, cx: 768, cy: 432 }) });
  return keys.map((k) => ({ at: r2(k.at), ...camPos(k) }));
}

// ── Phone: 646×1398 footage (430×932 CSS at 1.5x) at 1.1 in a big phone ────────────────────────
const PH = { w: 646, h: 1398, s: 1.1, css: 1.5 };
const PHW = Math.round(PH.w * PH.s), PHH = Math.round(PH.h * PH.s);
const PHX = W / 2 - PHW / 2, PHY = (H - PHH) / 2;
const LIFT = Math.round(62 * PH.s / 0.7); // bottom toolbar height at this scale (62 px at 0.7 in the 1080p film)
function phoneWindows(take, toOut, a, b) {
  const sizes = TAKE[take].sizes || [], wins = [];
  sizes.forEach((s, i) => {
    if (s.h >= 900) return;
    const s0 = Math.max(a, toOut(s.t)), s1 = Math.min(b, sizes[i + 1] ? toOut(sizes[i + 1].t) : b);
    if (s1 > s0) wins.push([r2(s0), r2(s1)]);
  });
  return wins;
}

// ── Schedule ───────────────────────────────────────────────────────────────────────────────────
const clips = [], audio = [], tl = [], clicks = [];
let n = 0, t = 0;
const vid = (file, start, dur, cls = 'foot') => `<video class="clip ${cls}" id="v${++n}" src="${file}" muted data-start="${r2(start)}" data-duration="${r2(dur)}" data-track-index="1"></video>`;
const onOff = (start, dur) => `data-on="${r2(start)}" data-off="${r2(start + dur)}"`;
const CURSOR_SVG = '<svg viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L16 20l-3 1.3-3.4-7.6L4 18z" fill="#0f172a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const FF_SVG = '<svg viewBox="0 0 24 24"><path d="M3 5l9 7-9 7zM12 5l9 7-9 7z" fill="currentColor"/></svg>';
const LOCK_SVG = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const statusBar = `<div class="sbar"><b>9:41</b><i class="isl"></i><span class="sig"><b></b><b></b><b></b><b></b><em></em></span></div>`;

CFG.sections.forEach((sec, si) => {
  const secStart = t;
  sec.start = secStart;
  if (sec.kind === 'end') {
    const L = sec.lines[0];
    placeLine(L, secStart + 0.35);
    sec.end = secStart + 0.35 + LINE[L].duration + 1.6;
    clips.push(`<div class="clip card endcard" id="end" data-start="${r2(secStart)}" data-duration="${r2(sec.end - secStart)}" data-track-index="3">
      <img class="wm" src="assets/img/wordmark.png" alt="TestoZa"/><div class="pills"><div class="pill url">testoza.com</div><div class="pill subs" id="subpill"><s class="bell"></s></div></div></div>`);
    tl.push({ type: 'end', at: r2(secStart), endurl: r2(cueAt.endurl ?? secStart + 1) });
    audio.push(`<audio id="sting2" src="assets/sfx/sting.mp3" data-start="${r2(secStart + 0.05)}" data-duration="4" data-track-index="14" data-volume="0.3"></audio>`);
    t = sec.end;
    return;
  }
  const sched = scheduleTake(sec, secStart);
  const c = cut(`${si}-${sec.take}`, sched.pieces, secStart);
  const dur = c.frames / FPS;
  sec.end = secStart + dur;
  const out = (s) => srcToOut(sched.pieces, s);
  const marks = TAKE[sec.take].marks;
  const firstSrc = sched.pieces[0].a, lastSrc = Math.max(...sched.pieces.map((p) => p.a + p.play * p.rate));
  const inSec = (m) => m.t >= firstSrc - 0.05 && m.t <= lastSrc + 0.05;
  for (const m of marks) if (inSec(m) && m.point && !m.hover) clicks.push(out(m.t));
  if (si > 0) audio.push(`<audio id="wh${si}" src="assets/sfx/whoosh-short.mp3" data-start="${r2(Math.max(0, secStart - 0.1))}" data-duration="0.57" data-track-index="13" data-volume="0.25"></audio>`);
  if (TAKE[sec.take].phone) {
    const id = `ph${si}`;
    const wins = phoneWindows(sec.take, out, secStart, sec.end);
    const det = markIn(sec.take, 'intro') || markIn(sec.take, 'x-intro');
    clips.push(`<div class="phonescene" id="${id}" ${onOff(secStart, dur)}><div class="glow"></div><div class="pcam" id="${id}-cam">
      <div class="phone" style="left:${PHX - 16}px;top:${PHY - 16}px;width:${PHW + 32}px;height:${PHH + 32}px"><div class="screen" style="width:${PHW}px;height:${PHH}px">
        <div class="pv" id="${id}-pv">${vid(c.file, secStart, dur, 'pvid')}</div>
        <div class="chrome" id="${id}-chrome">${statusBar}<div class="purl"><i class="lk">${LOCK_SVG}</i><span class="u1">app.testoza.com</span><span class="u2">app.testoza.com</span></div></div>
        <div class="tbar" id="${id}-tbar"><i></i><i></i><i></i><i></i><i></i></div></div></div></div></div>`);
    tl.push({ type: 'phone', sel: `#${id}`, start: r2(secStart), end: r2(sec.end), wins, urlAt: r2(det ? out(det.t) : secStart), lift: LIFT, zooms: [] });
    tl.push({ type: 'reveal', sel: `#${id}-cam`, at: r2(secStart) });
  } else {
    const moves = [];
    for (const m of marks) {
      if (!m.point || !inSec(m)) continue;
      const at = out(m.t);
      if (at < secStart - 0.01 || at > sec.end) continue;
      const prevAt = moves.at(-1)?.at ?? secStart;
      moves.push({ at: r2(at), x: Math.round(m.point.x), y: Math.round(m.point.y), click: !m.hover, d: r2(Math.max(0.12, Math.min(0.55, (at - prevAt) * 0.8))) });
    }
    if (moves.length) for (const k of ['o', 'd']) tl.push({ type: 'cursor', cur: `#cur${k}${si}`, rip: `#rip${k}${si}`, moves, hides: [] });
    const ov = (k) => `<div class="ov"><div class="cur" id="cur${k}${si}">${CURSOR_SVG}</div><div class="rip" id="rip${k}${si}"></div>${k === 'o' ? `<div class="loupe" id="lp${si}"></div>` : ''}</div>`;
    const box = (b) => `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
    clips.push(`<div class="win" id="w${si}" style="${box(OVW)}" ${onOff(secStart, dur)}><div class="cam" style="transform:scale(${OVS})">${vid(c.file, secStart, dur)}${ov('o')}</div></div>`);
    clips.push(`<div class="win" id="wd${si}" style="${box(CARD)}" ${onOff(secStart, dur)}><div class="cam" id="cam${si}">${vid(c.file, secStart, dur)}${ov('d')}</div></div>`);
    const keys = cameraKeys(sec.take, sched, secStart);
    tl.push({ type: 'cam', sel: `#cam${si}`, keys });
    // The loupe in the overview: where the detail card is looking, in recording CSS px.
    tl.push({ type: 'loupe', sel: `#lp${si}`, keys: keys.map((k) => ({ at: k.at, left: r2(-k.x / k.scale), top: r2(-k.y / k.scale), width: r2(CARD.w / k.scale), height: r2(CARD.h / k.scale) })) });
    tl.push({ type: 'reveal', sel: `#w${si}`, at: r2(secStart) });
    tl.push({ type: 'reveal', sel: `#wd${si}`, at: r2(secStart + 0.08) });
  }
  for (const p of sched.pieces.filter((x) => x.fast)) {
    const id = `spd${si}-${Math.round(p.out0 * 100)}`;
    clips.push(`<div class="clip speed" id="${id}" data-start="${r2(p.out0)}" data-duration="${r2(p.out1 - p.out0)}" data-track-index="8"><i>${FF_SVG}</i><b>${Math.round(p.rate)}×</b></div>`);
    tl.push({ type: 'speed', sel: `#${id}`, at: r2(p.out0) });
  }
  for (const an of sched.anchors) {
    const o = out(an.click), word = cueAt[an.cue] - LEAD;
    if (o > word + 0.03) throw new Error(`SYNC ${an.line} ${an.cue}: click at ${r2(o)}s, word at ${r2(word + LEAD)}s`);
    syncLog.push({ line: an.line, cue: an.cue, click: r2(o), word: r2(cueAt[an.cue]), lead: r2(cueAt[an.cue] - o) });
  }
  t = sec.end;
});
const TOTAL = r2(t);

// ── Captions file (never on the picture) ───────────────────────────────────────────────────────
const caps = [];
for (const v of voPlaced) {
  const L = LINE[v.id], chunks = [];
  let cur = [];
  const flush = () => { if (cur.length) chunks.push(cur); cur = []; };
  for (const tok of L.tokens) {
    cur.push(tok);
    const text = cur.map((x) => x.display).join(' ');
    if (/[.!?…]$/.test(tok.display) || (text.length > 28 && /[,;:—]$/.test(tok.display)) || text.length > 40) flush();
  }
  flush();
  chunks.forEach((ch, i) => {
    const s = v.start + ch[0].start, e = i + 1 < chunks.length ? v.start + chunks[i + 1][0].start : v.start + L.duration + 0.2;
    caps.push({ s, e, text: ch.map((x) => x.display).join(' ').replace(/\s+([,.!?…])/g, '$1').replace(/^—\s*/, '') });
  });
}
const srt = (x) => { const ms = Math.round(x * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
mkdirSync(ROOT + `youtube/${REEL}`, { recursive: true });
writeFileSync(ROOT + `youtube/${REEL}/captions-en.srt`, caps.map((c, i) => `${i + 1}\n${srt(c.s)} --> ${srt(c.e)}\n${c.text}\n`).join('\n'));

// ── Voice, clicks, music ───────────────────────────────────────────────────────────────────────
for (const v of voPlaced) audio.push(`<audio id="vo${v.id}" data-audio-group="voiceover" src="${VO[v.id].file}" data-start="${r2(v.start)}" data-duration="${r2(VO[v.id].duration)}" data-track-index="10" data-volume="1"></audio>`);
clicks.sort((a, b) => a - b).filter((c, i, a) => i === 0 || c - a[i - 1] > 0.2).forEach((c, i) => audio.push(`<audio id="ck${i}" src="assets/sfx/click-soft.mp3" data-start="${r2(c)}" data-duration="0.37" data-track-index="15" data-volume="0.4"></audio>`));
const len = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ROOT + f]).toString());
const [msrc, mvol] = CFG.music, bedOut = `assets/music/bed-${REEL}.mp3`;
if (!existsSync(ROOT + bedOut) || Math.abs(len(bedOut) - TOTAL) > 0.2) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', ROOT + msrc, '-af', `atrim=0:${TOTAL},loudnorm=I=-20:TP=-3,afade=t=in:d=0.3,afade=t=out:st=${r2(TOTAL - 1.5)}:d=1.5`, '-ar', '48000', '-ac', '2', '-b:a', '192k', ROOT + bedOut]);
}
const carve = '{&quot;enabled&quot;:true,&quot;sources&quot;:[&quot;voiceover&quot;],&quot;strength&quot;:0.85}';
audio.push(`<audio id="bed" src="${bedOut}" data-start="0" data-duration="${TOTAL}" data-track-index="20" data-volume="${mvol}" data-fx-carve="${carve}"></audio>`);

// ── HTML ───────────────────────────────────────────────────────────────────────────────────────
const css = readFileSync(ROOT + 'capture/scenes.css', 'utf8');
const runtime = readFileSync(ROOT + 'capture/scenes.js', 'utf8');
writeFileSync(ROOT + 'index.html', `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=${W}, height=${H}"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
${css}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
<div class="clip stage" id="stage" data-start="0" data-duration="${TOTAL}" data-track-index="0"><div class="grid"></div></div>
<img class="clip logo" id="logo" src="assets/img/wordmark.png" alt="TestoZa" data-start="0" data-duration="${r2(CFG.sections.at(-1).start)}" data-track-index="4"/>
${clips.join('\n')}
${audio.join('\n')}
</div>
<script>
const PLAN = ${JSON.stringify(tl)};
${runtime}
</script>
</body></html>`);
mkdirSync(ROOT + `capture/${REEL}`, { recursive: true });
writeFileSync(ROOT + `capture/${REEL}/timing.json`, JSON.stringify({ total: TOTAL, voice: voPlaced.map((v) => ({ ...v, start: r2(v.start), end: r2(v.start + VO[v.id].duration) })), sections: CFG.sections.map((s) => ({ take: s.take, lines: s.lines, start: r2(s.start), end: r2(s.end) })),
  // For dub tracks: the English cue-word times and the picture's click times, per line.
  cues: Object.fromEntries(voPlaced.map((v) => [v.id, Object.fromEntries(Object.entries(LINE[v.id].cues).map(([c, ct]) => [c, r2(v.start + ct)]))])),
  events: syncLog.reduce((o, x) => { (o[x.line] ??= {})[x.cue] = x.click; return o; }, {}) }, null, 2));
writeFileSync(ROOT + `capture/${REEL}/sync.json`, JSON.stringify(syncLog, null, 2));
console.log(report.join('\n') || 'no waits, no speed-ups');
console.log(`${REEL}: ${syncLog.length} clicks synced (lead ${Math.min(...syncLog.map((s) => s.lead))}–${Math.max(...syncLog.map((s) => s.lead))}s) · total ${TOTAL}s`);
