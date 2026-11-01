// Builds index.html for "How to Conduct a Cheat-Proof Online Exam".
//
// Sync rule (owner): the voice never runs ahead of the picture. Every {cue} word in SCRIPT-en.md is
// pinned to the recorded action with the same id: the click lands LEAD s before the word starts.
// Between actions the screen holds its settled frame; an action that needs more time than the
// voice allows plays up to MAXRATE× faster, and beyond that the next voice line waits. Every wait
// is printed, and the build fails if any picture would still trail its word.
//
// Footage per section is cut by ffmpeg into one exactly-timed video (assets/cut/), so the
// composition only places videos, scenes, voice, captions and music.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { timeLine } from './words.mjs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const FPS = 30, LEAD = 0.12, MAXRATE = 2.0, GLIDERATE = 5.0, GAP = 0.32, SGAP = 0.7, ZMAX = 1.22;
const r2 = (x) => Math.round(x * 100) / 100;
const json = (f) => JSON.parse(readFileSync(ROOT + f, 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
mkdirSync(ROOT + 'assets/cut', { recursive: true });

// ── Voice lines, word timings, chapters ────────────────────────────────────────────────────────
const VO = Object.fromEntries(json('assets/vo-en/vo.json').map((v) => [v.id, v]));
const LINE = {};
for (const id of Object.keys(VO)) {
  const v = VO[id];
  LINE[id] = { ...v, ...timeLine(v.raw, json(`assets/vo-en/${id}.words.json`), v.duration) };
}
const script = readFileSync(ROOT + 'SCRIPT-en.md', 'utf8');
const CHAPTER = {};
{ let pending = null;
  for (const l of script.split('\n')) {
    const c = l.match(/^\[chapter\]\s*(?:\d+:\d+\s+)?(.+)$/); if (c) pending = c[1].trim();
    const h = l.match(/^## (L\d+)/); if (h && pending) { CHAPTER[h[1]] = pending; pending = null; }
  } }
const STATE = json('capture/rec/state.json');
const TAKE = Object.fromEntries(['teacher', 'phone', 'candidate', 'results', 'landing'].map((n) => [n, json(`capture/rec/${n}.marks.json`)]));
const ALIAS = { phones: 'scroll1' };
const markIn = (take, id) => TAKE[take].marks.find((m) => m.id === (ALIAS[id] || id));
// Clicks followed by typing: the typing happened after the mark's `end`, so their result runs up
// to the next action's approach.
const TYPED = new Set(['roll', 'name', 'roll2', 'typecode', 'fill', 'fill2']);
const endOf = (m) => {
  if (!TYPED.has(m.id)) return m.end ?? m.t + 1.2;
  for (const take of Object.values(TAKE)) {
    const i = take.marks.indexOf(m);
    if (i >= 0 && take.marks[i + 1]) { const n = take.marks[i + 1]; return Math.max(m.end ?? 0, n.t - (n.pre || 0) - 0.05); }
  }
  return m.end ?? m.t + 1.2;
};

// ── Sections ───────────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { kind: 'montage', lines: ['L01'] },
  { kind: 'take', take: 'teacher', lines: ['L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16', 'L17', 'L18', 'L19', 'L20', 'L21', 'L22'] },
  { kind: 'whatsapp', lines: ['L23'], lead: 0.7, tail: 0.8 },
  { kind: 'take', take: 'teacher', lines: ['L24'] },
  { kind: 'board', lines: ['L25'], lead: 0.9, tail: 1.4 },
  { kind: 'wastudent', lines: ['L26'], lead: 0.6, tail: 0.45 },
  { kind: 'take', take: 'phone', lines: ['L27'] },
  { kind: 'take', take: 'candidate', lines: ['L28', 'L29', 'L30', 'L31'] },
  { kind: 'take', take: 'results', lines: ['L32', 'L33', 'L34'] },
  { kind: 'take', take: 'landing', lines: ['L35'] },
  { kind: 'neet', lines: ['L36'], lead: 0.6, tail: 1.0 },
  { kind: 'end', lines: ['L37'], lead: 0.8, tail: 3.0 },
];

const report = [], voPlaced = [], cueAt = {}, syncLog = [];
let t = 0;

function placeLine(id, start) {
  voPlaced.push({ id, start });
  for (const [c, ct] of Object.entries(LINE[id].cues)) cueAt[c] = start + ct;
}

/** Take section: anchors pinned to cue words; returns pieces for ffmpeg + camera keys. */
function scheduleTake(sec, secStart) {
  const marks = TAKE[sec.take].marks;
  // An action's active span stops at the next cued action anywhere in the script (a later section
  // may continue the same take).
  const cueIds = new Set(Object.values(LINE).flatMap((l) => Object.keys(l.cues)).map((c) => ALIAS[c] || c));
  const isAnchor = (m) => cueIds.has(m.id);
  // Each action = approach (cursor glide, `pre` s of source before the click) + result (click →
  // settled, incl. non-cue actions until the next cued one). The CLICK is pinned: C = line start +
  // cue word - LEAD. Between two clicks the previous result and the next approach must both fit,
  // each at most MAXRATE× faster; inside a line earlier clicks move earlier (picture leads), and
  // across lines the voice waits. A click never lands after its word.
  // A glide is only cursor travel, so it may play up to GLIDERATE× (results stay ≤ MAXRATE×).
  const anchors = [];
  const gapNeed = (a, b) => (a ? a.post : 0) / MAXRATE + b.pre / GLIDERATE;
  let lineStart = secStart + SGAP;
  for (const [li, id] of sec.lines.entries()) {
    let ls = li === 0 ? lineStart : lineStart + GAP;
    const trial = [];
    for (const [c, ct] of Object.entries(LINE[id].cues).sort((a, b) => a[1] - b[1])) {
      const m = markIn(sec.take, c);
      if (!m) continue;
      const i = marks.indexOf(m);
      let end = endOf(m);
      for (let k = i + 1; k < marks.length && !isAnchor(marks[k]); k++) end = Math.max(end, endOf(marks[k]));
      trial.push({ cue: c, m, line: id, click: m.t, pre: m.pre || 0, post: Math.max(0.2, end - m.t), ideal: ct - LEAD, want: ct - LEAD });
    }
    for (let k = trial.length - 2; k >= 0; k--) trial[k].ideal = Math.min(trial[k].ideal, trial[k + 1].ideal - gapNeed(trial[k], trial[k + 1]));
    if (trial.length) {
      const prev = anchors.at(-1);
      const minC = prev ? prev.C + gapNeed(prev, trial[0]) : secStart + trial[0].pre / GLIDERATE;
      if (ls + trial[0].ideal < minC) ls = minC - trial[0].ideal + 0.01;
      trial.forEach((x) => { x.C = ls + x.ideal; });
      const early = trial.filter((x) => x.want - x.ideal > 0.35);
      if (early.length) report.push(`${id}: picture leads its word (${early.map((x) => `${x.cue} ${r2(x.want - x.ideal)}s`).join(', ')})`);
      anchors.push(...trial);
    }
    const planned = li === 0 ? lineStart : lineStart + GAP;
    if (ls - planned > 0.05) report.push(`${id}: voice waits ${r2(ls - planned)}s for the picture`);
    placeLine(id, ls);
    lineStart = ls + LINE[id].duration;
  }
  // The last result may run past the voice (picture may outlast the voice, never trail a cue).
  const last = anchors.at(-1);
  const secEnd = Math.max(lineStart + 0.45, last.C + last.post / 1.5);
  // Pieces between consecutive clicks: result of the previous action (+ hold) then the next approach.
  const file = `capture/rec/${sec.take}.mp4`, pieces = [];
  let t0 = secStart, prev = null;
  for (const an of [...anchors, { end: true }]) {
    const C = an.end ? secEnd : an.C, W = C - t0;
    const pre = an.end ? 0 : an.pre, post = prev ? prev.post : 0;
    const preMin = pre / GLIDERATE, postMin = post / MAXRATE;
    if (W < preMin + postMin - 1e-3) throw new Error(`${an.cue}: click would land ${r2(preMin + postMin - W)}s after its word`);
    // The result keeps its natural speed when it can; the glide gives way first.
    let postOut = Math.min(post, W - preMin), preOut = W - postOut, hold = 0;
    if (preOut > pre) { hold = preOut - pre; preOut = pre; }
    const rPost = post > 0 ? post / postOut : 1, rPre = pre > 0 ? pre / preOut : 1;
    if (rPost > 1.05 && !an.end) report.push(`${an.line} ${an.cue}: previous result plays ${r2(rPost)}×`);
    // Result of the previous action, then hold its settled frame (or the opening frame).
    const holdSrc = prev ? prev.click : (an.end ? 0 : an.click - an.pre) - 0.05;
    pieces.push({ file, a: Math.max(0, holdSrc), play: prev ? postOut : 0, rate: rPost, out0: t0, out1: t0 + (prev ? postOut : 0) + hold });
    if (!an.end && preOut > 0) pieces.push({ file, a: an.click - an.pre, play: preOut, rate: rPre, out0: C - preOut, out1: C });
    if (!an.end) { an.aOut = C - preOut; prev = an; }
    t0 = C;
  }
  return { secEnd, pieces, anchors };
}

/** One video per section, exact to the frame: play (setpts) + hold (tpad clone) per piece. */
function cut(name, pieces, secStart, size) {
  const f = (x) => Math.round((x - secStart) * FPS);
  const spec = pieces.map((p) => {
    const F0 = f(p.out0), F1 = f(p.out1), playF = Math.min(F1 - F0, Math.max(1, Math.round(p.play * FPS)));
    return { ...p, playF, holdF: F1 - F0 - playF };
  }).filter((p) => p.playF + p.holdF > 0);
  const hash = createHash('md5').update(JSON.stringify([spec, size])).digest('hex').slice(0, 10);
  const out = `assets/cut/${name}-${hash}.mp4`;
  if (!existsSync(ROOT + out)) {
    const args = ['-y', '-loglevel', 'error'];
    const fl = [];
    spec.forEach((p, i) => {
      args.push('-ss', String(r2(p.a)), '-t', String(r2(p.playF / FPS * p.rate + 0.4)), '-i', ROOT + p.file);
      fl.push(`[${i}:v]setpts=(PTS-STARTPTS)/${p.rate.toFixed(4)},fps=${FPS},trim=end_frame=${p.playF},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop=${p.holdF}[p${i}]`);
    });
    fl.push(`${spec.map((_, i) => `[p${i}]`).join('')}concat=n=${spec.length}:v=1:a=0,format=yuv420p[v]`);
    execFileSync('ffmpeg', [...args, '-filter_complex', fl.join(';'), '-map', '[v]', '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', ROOT + out]);
  }
  return { file: out, frames: spec.reduce((s, p) => s + p.playF + p.holdF, 0) };
}

/** Source time → output time inside a scheduled take section (for overlays tied to the footage). */
const srcToOut = (pieces, s) => {
  for (const p of pieces) if (s >= p.a && s <= p.a + p.play * p.rate) return p.out0 + (s - p.a) / p.rate;
  const nxt = pieces.find((p) => p.a > s);
  return nxt ? nxt.out0 : pieces.at(-1).out1;
};

// ── Camera: one framing per voice line, from the boxes the line's actions touch ───────────────
function cameraKeys(sched, secStart) {
  const keys = [];
  let prev = { z: 1, cx: 768, cy: 432 };
  for (const id of [...new Set(sched.anchors.map((a) => a.line))]) {
    const ans = sched.anchors.filter((a) => a.line === id);
    const boxes = ans.map((a) => a.m.box).filter(Boolean);
    let tgt = { z: 1, cx: 768, cy: 432 };
    if (boxes.length) {
      const x0 = Math.min(...boxes.map((b) => b.x)) - 110, y0 = Math.min(...boxes.map((b) => b.y)) - 90;
      const x1 = Math.max(...boxes.map((b) => b.x + b.width)) + 110, y1 = Math.max(...boxes.map((b) => b.y + b.height)) + 90;
      const z = Math.max(1, Math.min(ZMAX, 1536 / (x1 - x0), 864 / (y1 - y0)));
      tgt = { z: +z.toFixed(3), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    }
    if (Math.abs(tgt.z - prev.z) < 0.06 && Math.hypot(tgt.cx - prev.cx, tgt.cy - prev.cy) < 140) tgt = prev;
    const at = Math.max(secStart, ans[0].aOut - 0.9);
    keys.push({ at, ...tgt });
    prev = tgt;
  }
  return keys.map((k) => {
    const S = 1.25 * k.z;
    const x = Math.min(0, Math.max(1920 - 1536 * S, 960 - k.cx * S));
    const y = Math.min(0, Math.max(1080 - 864 * S, 540 - k.cy * S));
    return { at: r2(k.at), scale: +S.toFixed(4), x: Math.round(x), y: Math.round(y) };
  });
}

// ── Schedule everything ────────────────────────────────────────────────────────────────────────
const clips = [], audio = [], tl = [], phoneWindows = [];
let n = 0;
const vid = (file, start, dur, cls = 'foot', track = 0) => `<video class="clip ${cls}" id="v${++n}" src="${file}" muted data-start="${r2(start)}" data-duration="${r2(dur)}" data-track-index="${track}"></video>`;

for (const [si, sec] of SECTIONS.entries()) {
  // Sections run back to back (no black between them); the pause lives inside the next section.
  const secStart = t;
  sec.start = secStart;
  if (sec.kind === 'take') {
    const sched = scheduleTake(sec, secStart);
    const phone = sec.take === 'phone';
    const c = cut(`${si}-${sec.take}`, sched.pieces, secStart, phone ? [430, 932] : [1536, 864]);
    const dur = c.frames / FPS;
    sec.end = secStart + dur;
    if (phone) {
      clips.push(`<div class="phonewrap" id="pw${si}">${vid(c.file, secStart, dur, 'pvid', 0)}</div>`);
      const fsAt = TAKE.phone.sizes?.[1]?.t;
      sec.fullscreenOut = fsAt != null ? srcToOut(sched.pieces, fsAt) : sec.end;
      phoneWindows.push([secStart, sec.end]);
    } else {
      const cam = sec.take === 'landing' ? [{ at: secStart, scale: 1.25, x: 0, y: 0 }] : cameraKeys(sched, secStart);
      clips.push(`<div class="cam" id="cam${si}">${vid(c.file, secStart, dur, 'foot', 0)}</div>`);
      tl.push({ type: 'cam', sel: `#cam${si}`, keys: cam, start: secStart });
    }
    sec.sched = sched;
    // Independent check: map every recorded click through the cut and compare with its word.
    for (const an of sched.anchors) {
      const out = srcToOut(sched.pieces, an.click);
      const word = cueAt[an.cue] - LEAD;
      if (out > word + 0.02) throw new Error(`SYNC ${an.line} ${an.cue}: click at ${r2(out)}s, word at ${r2(word + LEAD)}s`);
      syncLog.push({ line: an.line, cue: an.cue, click: r2(out), word: r2(cueAt[an.cue]), lead: r2(cueAt[an.cue] - out) });
    }
    t = sec.end;
  } else if (sec.kind === 'montage') {
    const L = 'L01', vs = 0.45;
    placeLine(L, vs);
    const R = (id) => markIn('results', id), Tm = (id) => markIn('teacher', id);
    const order = ['m1', 'm2', 'm3', 'm4', 'title'];
    const src = {
      m1: { file: 'capture/rec/results.mp4', a: R('started').t - 0.2, len: 2.6 },
      m2: { file: 'capture/rec/teacher.mp4', a: Tm('live').t - 0.15, len: 2.6 },
      m3: { file: 'capture/rec/teacher.mp4', a: Tm('fs').t - 0.35, len: endOf(Tm('tab')) - Tm('fs').t + 0.35 },
      m4: { file: 'capture/rec/results.mp4', a: R('rank').t + 0.5, len: 3.0 },
    };
    const pieces = [];
    order.slice(0, 4).forEach((c, i) => {
      const o0 = i === 0 ? 0 : cueAt[c] - LEAD, o1 = cueAt[order[i + 1]] - LEAD;
      const s = src[c], rate = Math.max(1, Math.min(5, s.len / (o1 - o0)));
      pieces.push({ file: s.file, a: s.a, play: Math.min(o1 - o0, s.len / rate), rate, out0: o0, out1: o1 });
    });
    const titleAt = cueAt.title - LEAD;
    const c = cut('0-montage', pieces, 0, [1536, 864]);
    clips.push(`<div class="cam" id="cam0">${vid(c.file, 0, titleAt, 'foot', 0)}</div>`);
    tl.push({ type: 'montage', sel: '#cam0', cuts: order.slice(0, 4).map((x, i) => (i === 0 ? 0 : cueAt[x] - LEAD)) });
    sec.end = vs + LINE[L].duration + 1.8;
    clips.push(`<div class="clip card titlecard" id="title" data-start="${r2(titleAt)}" data-duration="${r2(sec.end - titleAt)}" data-track-index="1">
      <div class="stage"><div class="grid"></div></div>
      <img class="wm" src="assets/img/wordmark.png" alt="TestoZa"/>
      <div class="ttl">How to conduct a <span>cheat-proof</span> online exam</div>
      <div class="sub">Go live <i></i> Anti-cheating <i></i> Join code <i></i> Live results</div></div>`);
    audio.push(`<audio id="sting1" src="assets/sfx/sting.mp3" data-start="${r2(titleAt - 0.05)}" data-duration="4" data-track-index="13" data-volume="0.55"></audio>`);
    t = sec.end;
  } else {
    const L = sec.lines[0];
    placeLine(L, secStart + sec.lead);
    sec.end = secStart + sec.lead + LINE[L].duration + sec.tail;
    if (sec.kind === 'wastudent' || sec.kind === 'whatsapp') phoneWindows.push([secStart, sec.end]);
    t = sec.end;
  }
}
const TOTAL = r2(t);

// ── Scenes (built after timing is known) ───────────────────────────────────────────────────────
const S = Object.fromEntries(SECTIONS.map((s) => [s.kind === 'take' ? `${s.kind}-${s.take}-${s.lines[0]}` : s.kind, s]));
const sec = (kind) => SECTIONS.find((s) => s.kind === kind);
const share = (STATE.shareText || '').replace(/\r/g, '');
const shareHtml = share.split('\n').map((l) => {
  let h = esc(l).replace(/\*(.+?)\*/g, '<b>$1</b>').replace(/(https?:\/\/\S+)/, '<u>$1</u>');
  let key = /^<b>/.test(h) ? 'name' : /min ·/.test(l) ? 'time' : /^https?:/.test(l) ? 'link' : /^Open the link/.test(l) ? 'instr' : '';
  h = h.replace(/^⏱️?\s*/, '<s class="clock"></s>');
  return l.trim() ? `<p class="${key ? 'hl hl-' + key : ''}">${h}</p>` : '<p class="sp"></p>';
}).join('');
const preview = `<div class="pv"><img src="assets/img/link-preview.png" alt=""/><div><b>JEE Main Mini Mock — TestoZa Demo</b><span>180 minutes · 8 questions. Open the link, enter your name and roll no, then tap Start.</span><em>app.testoza.com</em></div></div>`;
const statusBar = (dark) => `<div class="sbar ${dark ? 'dk' : ''}"><span>10:02</span><i class="isl"></i><span class="sig"><b></b><b></b><b></b><b></b><em></em></span></div>`;
const waHeader = (who) => `<div class="wah"><span class="back">‹</span><span class="gav">J</span><div><b>JEE 2027 — Morning Batch</b><small>${who}</small></div></div>`;
const phoneShell = (id, inner, start, dur) => `<div class="clip phonescene" id="${id}" data-start="${r2(start)}" data-duration="${r2(dur)}" data-track-index="2"><div class="stage"><div class="grid"></div></div><div class="phone"><div class="screen">${inner}</div></div>`;
const sideText = (kicker, title, sub) => `<div class="side"><div class="kick">${kicker}</div><div class="h2">${title}</div><div class="p">${sub}</div></div>`;

{ // Teacher shares in the class group.
  const s = sec('whatsapp');
  clips.push(phoneShell('wa1', `${statusBar(true)}${waHeader('Aarav, Priya, Rohan and 45 others')}
    <div class="chat"><div class="day">TODAY</div>
      <div class="msg in"><em>Aarav Gupta</em>Sir, is tomorrow's mock online?<time>9:41</time></div>
      <div class="msg out">Yes. Link coming in a minute.<time>9:43 <s class="tk"></s></time></div>
      <div class="msg out big" id="wa1sent">${preview}<div class="txt">${shareHtml}</div><time>10:02 <s class="tk"></s></time></div>
    </div>
    <div class="composer"><div class="box" id="wa1box"><span class="ph">Message</span><div class="draft" id="wa1draft">${preview}<div class="txt">${shareHtml}</div></div></div><div class="send" id="wa1send"></div></div>`, s.start, s.end - s.start)
    + sideText('SHARE', 'Your class WhatsApp group', 'TestoZa writes the invite. You just press Send.') + '</div>');
  tl.push({ type: 'wa1', start: s.start, wa: cueAt.wa, send: cueAt.send, hl: ['name', 'time', 'link', 'instructions'].map((w) => {
    const L = LINE.L23, vs = voPlaced.find((v) => v.id === 'L23').start;
    const tok = L.tokens.find((k) => k.display.toLowerCase().replace(/[^a-z]/g, '').startsWith(w.slice(0, 5)) && k.start >= L.cues.walines - 0.05);
    return [w === 'instructions' ? 'instr' : w, tok ? vs + tok.start : null];
  }) });
}
{ // Classroom board with the real code.
  const s = sec('board');
  const code = STATE.code;
  clips.push(`<div class="clip card boardscene" id="board" data-start="${r2(s.start)}" data-duration="${r2(s.end - s.start)}" data-track-index="2">
    <div class="wall"></div><div class="wb"><div class="wbin">
      <div class="pre">JEE Mock · Today 10:00 AM</div>
      <div class="ink l1" id="ink1">testoza.com/join</div>
      <div class="ink l2" id="ink2">Code: ${esc(code)}</div>
      <div class="pen" id="pen"><i></i></div>
    </div><div class="tray"><b></b><b class="r"></b><b class="k"></b></div></div></div>`);
  tl.push({ type: 'board', start: s.start, url: cueAt.url, digits: cueAt.digits });
}
{ // Student's phone: message arrives, tap.
  const s = sec('wastudent');
  clips.push(phoneShell('wa2', `${statusBar(true)}${waHeader('tap here for group info')}
    <div class="chat"><div class="day">TODAY</div>
      <div class="msg in"><em class="c2">Aarav Gupta</em>Sir, is tomorrow's mock online?<time>9:41</time></div>
      <div class="msg in"><em class="c3">Prof. Rajesh Kumar</em>Yes. Link coming in a minute.<time>9:43</time></div>
      <div class="msg in big" id="wa2msg"><em class="c3">Prof. Rajesh Kumar</em>${preview}<div class="txt">${shareHtml}</div><time>10:02</time></div>
      <div class="tap" id="wa2tap"></div>
    </div>
    <div class="notif" id="wa2notif"><b>JEE 2027 — Morning Batch</b><span>Prof. Rajesh Kumar: JEE Main Mini Mock — TestoZa Demo…</span></div>
    <div class="composer"><div class="box"><span class="ph">Message</span></div><div class="send mic"></div></div>`, s.start, s.end - s.start)
    + sideText("STUDENT'S PHONE", 'The link lands in the class group', 'One tap opens the exam.') + '</div>');
  tl.push({ type: 'wa2', start: s.start, msg: cueAt.msg, tap: cueAt.tap });
}
{ // The phone take sits in the same phone; a browser bar until the exam goes full screen.
  const s = SECTIONS.find((x) => x.kind === 'take' && x.take === 'phone');
  clips.push(`<div class="clip phonescene" id="ph" data-start="${r2(s.start)}" data-duration="${r2(s.end - s.start)}" data-track-index="1"><div class="stage"><div class="grid"></div></div><div class="phone"><div class="screen"></div></div>${sideText('NO APP · NO SIGN-UP', 'The exam opens in the browser', 'Name, roll number, Start. Full screen and the rules switch on by themselves.')}</div>`);
  clips.push(`<div class="clip chrome" id="chrome" data-start="${r2(s.start)}" data-duration="${r2(Math.max(0.1, s.fullscreenOut - s.start))}" data-track-index="3">${statusBar(false)}<div class="url"><s class="lock"></s>app.testoza.com/test/jee-main-mini-mock…</div></div>`);
}
{ // "Later" over the results take.
  const at = cueAt.later - 0.1;
  clips.push(`<div class="clip card later" id="later" data-start="${r2(at)}" data-duration="1.9" data-track-index="2"><div class="lk">180 MINUTES LATER</div><div class="lt">The exam is over</div></div>`);
  tl.push({ type: 'later', at });
}
{ // NEET-UG card.
  const s = sec('neet');
  clips.push(`<div class="clip card neet" id="neet" data-start="${r2(s.start)}" data-duration="${r2(s.end - s.start)}" data-track-index="2"><div class="stage"><div class="grid"></div></div>
    <div class="omr" id="omr">${Array.from({ length: 9 }, (_, i) => `<p><span>${i + 1}</span>${['A', 'B', 'C', 'D'].map((x, j) => `<i class="${(i * 3 + 1) % 4 === j ? 'f' : ''}">${x}</i>`).join('')}</p>`).join('')}</div>
    <div class="arrow" id="arr"></div>
    <div class="mon" id="mon"><div class="scr"><div class="q"></div><div class="q s"></div><div class="o"></div><div class="o"></div><div class="o on"></div><div class="o"></div><div class="pal">${Array.from({ length: 12 }, (_, i) => `<b class="${i < 7 ? 'g' : ''}"></b>`).join('')}</div></div><div class="stand"></div></div>
    <div class="nh" id="nh"><div class="kick">EXAMS ARE GOING DIGITAL</div><div class="h">NEET-UG is set to move to <span>computer-based testing</span> from 2027</div><div class="src">Announced by the Union Education Minister · final format awaits an expert task-force report</div></div></div>`);
  tl.push({ type: 'neet', start: s.start, neet: cueAt.neet });
}
{ // End card.
  const s = sec('end');
  clips.push(`<div class="clip card endcard" id="end" data-start="${r2(s.start)}" data-duration="${r2(s.end - s.start)}" data-track-index="2"><div class="stage"><div class="grid"></div></div>
    <img class="wm" src="assets/img/wordmark.png" alt="TestoZa"/>
    <div class="tag">Make your test. Conduct it free. See every result in minutes.</div>
    <div class="pills"><div class="pill url">testoza.com</div><div class="pill subs" id="subpill"><s class="bell"></s>Subscribe</div></div></div>`);
  audio.push(`<audio id="sting2" src="assets/sfx/sting.mp3" data-start="${r2(s.start + 0.2)}" data-duration="4" data-track-index="14" data-volume="0.5"></audio>`);
  tl.push({ type: 'end', start: s.start, endurl: cueAt.endurl, thanks: cueAt.thanks });
}

// ── Chapter chips + YouTube chapters ───────────────────────────────────────────────────────────
const chapters = [];
for (const v of voPlaced) if (CHAPTER[v.id]) chapters.push({ title: CHAPTER[v.id], at: v.id === 'L01' ? 0 : Math.max(0, v.start - 0.6) });
chapters.forEach((c, i) => {
  if (i === 0) return;
  const end = chapters[i + 1]?.at ?? TOTAL - 0.1;
  const hideInScenes = ['Why TestoZa'].includes(c.title);
  if (hideInScenes) return;
  clips.push(`<div class="clip chip" id="chip${i}" data-start="${r2(c.at + 0.5)}" data-duration="${r2(Math.min(end - c.at - 0.5, 6))}" data-track-index="4"><b>${i}</b>${esc(c.title)}</div>`);
});
const ts = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
writeFileSync(ROOT + 'youtube/chapters.txt', chapters.map((c) => `${ts(c.at)} ${c.title}`).join('\n') + '\n');

// ── Captions from the spoken words ─────────────────────────────────────────────────────────────
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
{ // YouTube subtitles: the same chunks as the burned-in captions.
  const st = (x) => { const ms = Math.round(x * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  writeFileSync(ROOT + 'youtube/captions-en.srt', caps.map((c, i) => `${i + 1}\n${st(c.s)} --> ${st(c.e)}\n${c.text}\n`).join('\n'));
}
const inPhone = (x) => phoneWindows.some(([a, b]) => x >= a && x < b);
const capHtml = caps.map((c, i) => `<div class="clip cap ${inPhone(c.s) ? 'capside' : ''}" id="cap${i}" data-start="${r2(c.s)}" data-duration="${r2(Math.max(0.3, c.e - c.s))}" data-track-index="5"><span>${esc(c.text)}</span></div>`).join('\n');

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
  f += `${last}atrim=0:${r2(need)},loudnorm=I=-20:TP=-2,afade=t=in:d=1.5,afade=t=out:st=${r2(need - 2.5)}:d=2.5[out]`;
  execFileSync('ffmpeg', [...args, '-filter_complex', f, '-map', '[out]', '-ar', '48000', '-ac', '2', '-b:a', '192k', ROOT + out]);
}
const carve = '{&quot;enabled&quot;:true,&quot;sources&quot;:[&quot;voiceover&quot;],&quot;strength&quot;:0.8}';
const split = sec('wastudent').start;
[['assets/music/tech-upbeat.mp3', 0, split + 1.5, 11], ['assets/music/corporate-momentum.mp3', split, TOTAL - split, 12]].forEach(([src, s, d, track], i) => {
  const out = `assets/music/bed-${i + 1}.mp3`;
  bed(src, d, out);
  audio.push(`<audio id="bed${i + 1}" src="${out}" data-start="${r2(s)}" data-duration="${r2(d)}" data-track-index="${track}" data-volume="0.17" data-fx-carve="${carve}"></audio>`);
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
