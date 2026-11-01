// Builds index.html for the final film from rec/marks.json (footage) and assets/vo-<lang>/vo.json
// (voice). Each footage frame is retimed to its voice line: sped up (≤3×) when long, and held on
// its last frame (a still with a slow push) when short. English captions, chapter chips, cards.
// TZ_LANG=en|hi picks the voice (capture/vo-gemini.mjs); each language is its own video.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const LANG = process.env.TZ_LANG === 'hi' ? 'hi' : 'en';
const M = JSON.parse(readFileSync(ROOT + 'capture/rec/marks.json', 'utf8'));
const VO = JSON.parse(readFileSync(ROOT + `assets/vo-${LANG}/vo.json`, 'utf8'));
const vo = (n) => VO.find((v) => v.n === n);
mkdirSync(ROOT + 'assets/holds', { recursive: true });
if (!existsSync(ROOT + 'assets/bgm.mp3')) copyFileSync(ROOT + '../testoza-launch/assets/bgm/track-v3.mp3', ROOT + 'assets/bgm.mp3');

// English captions (on-screen text is English; the voice is Hindi).
const CAP = {
  1: ['Questions in Hindi and English together…', 'a diagram straight from the paper… chemistry structures…', 'and full JEE-level maths.', 'In the next few minutes, you will build this whole paper yourself.'],
  2: ['Hello! Today we take this JEE Main sample paper', 'and build a complete test on TestoZa from selected questions.', 'Every question teaches you something new. Let\'s begin.'],
  3: ['Click Create Test in the menu on the left.', 'At the top, type the test name — JEE Main Mini Mock.', 'Below it, a one-line description candidates see before they start.', 'Now pick the time. The 3h button sets 180 minutes.', '"Only my students" means only people you send the link to can see it.', 'In Marking, choose JEE / NEET: +4 for right, −1 for wrong.', 'Open Institution branding to add your institute name and logo.'],
  4: ['Now go down to Questions. The first one is physics.', 'Let\'s type it in English first.'],
  5: ['Now the same question in Hindi.', 'Click the button next to English and pick Hindi from the menu.', 'Type in English letters — each word turns into Hindi when you press space.', 'The Hindi version goes right below the English one.', 'Options need a square root: open Maths & symbols. This is Sy Pad.', 'Click option A, write the root, press Insert.', 'All four options done. Click the correct letter — D. One question, two languages.'],
  6: ['Press Add question. Tip: a new question opens in the last language, so tap English first.', 'This question has a diagram — no need to redraw it.', 'Picture → the screen button. In the PDF press Win + Shift + S, box the diagram, then Ctrl + V.', 'The diagram sits under the question and above the options, just like the paper.', 'Fraction options from Sy Pad. Correct answer: B.'],
  7: ['Question 3 is chemistry, and the structure sits inside the sentence.', 'TestoZa has no structure-drawing tool, so we cut it from the paper.', 'Picture → the cloud button places it exactly where your cursor is.', 'Then the reaction arrow from Sy Pad: ozone above, zinc and water below.', 'It\'s numerical: Question type → Numerical answer → Exact value → 1.'],
  8: ['Now maths. Open Maths & symbols — "Goes into Question 4".', 'f(x) = integral… a fraction… x² dx on top…', '…and (1 + x²)(1 + √(1 + x²)) below.', 'The preview builds it exactly like the paper. Insert, then finish the line.', 'Log, root and π/4 options — all from Sy Pad. Correct answer: B.'],
  9: ['Now the biggest question in this video: a JEE-level multistep reaction.', 'First the bromobenzene structure, placed at the cursor.', 'In Sy Pad → Chemistry, pick the arrow with conditions. Three rows on top, none below.', 'The reagents: Mg and ether, then CO₂ and H⁺; NH₃ and heat; Br₂ and NaOH.', 'The options are structures too — a picture in each option.', 'Five diagrams in one question, still clean. Correct answer: B — aniline.'],
  10: ['Match-the-list needs no table drawing.', 'Sy Pad → Tables → Match List. Reactants left, products right, then Insert.', 'Correct answer: C.'],
  11: ['The paper is ready. Now split it into Physics, Chemistry and Mathematics, like real JEE.', 'First, drag the integral question to the bottom by its handle.'],
  12: ['Switch on "Split into sections" — everything lands in Section A.', 'Click the + between two questions → New question here.', 'One more chemistry question, with Sy Pad\'s chemistry keys.'],
  13: ['Press "Add a new section", name it Bonus, and add a maths question.'],
  14: ['Now split Section A: click + where chemistry starts → Split section here.', 'Name the first part Physics and the new one Chemistry.', 'The integral is still in Chemistry — split it out and name it Mathematics.', 'Finally, merge Bonus into Mathematics.', 'Physics, Chemistry, Mathematics — just like JEE.'],
  15: ['Click Save test. Your test is now in My Tests.', 'And this is exactly what your candidates see — sections, Hindi, diagrams, maths.'],
  16: ['Make your first test today at testoza.com.', 'Liked the video? Subscribe. See you in the next one!'],
};
const CHIP = { 3: [1, 'Test details'], 4: [2, 'One question, two languages'], 5: [2, 'One question, two languages'], 6: [3, 'A diagram from the paper'], 7: [4, 'Chemistry structures'], 8: [5, 'Maths with Sy Pad'], 9: [6, 'The big reaction'], 10: [7, 'Match the list'], 11: [8, 'Sections'], 12: [8, 'Sections'], 13: [8, 'Sections'], 14: [8, 'Sections'], 15: ['✓', 'Save'] };
// Footage for each voice line: [from mark, to mark].
const SEG = { 3: ['open', 'q1'], 4: ['q1', 'q1-hindi'], 5: ['q1-hindi', 'q2'], 6: ['q2', 'q3'], 7: ['q3', 'q4'], 8: ['q4', 'q5'], 9: ['q5', 'q6'], 10: ['q6', 'sectionsOn'], 11: ['sectionsOn', 'sections-switch'], 12: ['sections-switch', 'mathsSection'], 13: ['mathsSection', 'splitMerge'], 14: ['splitMerge', 'saveAndCandidate'], 15: ['saveAndCandidate', 'end'] };

const clips = [], caps = [], audio = [];
let t = 0, id = 0, part2 = 0;
const r2 = (x) => Math.round(x * 100) / 100;
// English video: captions are the spoken sentences. Hindi video: the English translations in CAP.
const sentences = (text) => {
  const out = [];
  for (const s of text.split(/(?<=[.!?…])\s+|\n+/).map((x) => x.trim()).filter(Boolean)) {
    if (out.length && (out.at(-1).length < 28 || s.length < 18) && out.at(-1).length + s.length < 95) out[out.length - 1] += ' ' + s;
    else out.push(s);
  }
  return out;
};
// Pauses inside a voice line (midpoints, seconds from the line start): caption changes snap to them.
const pauses = (file) => {
  const err = spawnSync('ffmpeg', ['-hide_banner', '-i', ROOT + file, '-af', 'silencedetect=n=-38dB:d=0.18', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const s = [...err.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const e = [...err.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  return s.map((x, i) => (x + (e[i] ?? x)) / 2);
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const addCaps = (n, start, dur) => {
  const parts = LANG === 'en' ? sentences(vo(n).text) : CAP[n];
  const total = parts.reduce((s, p) => s + p.length, 0);
  const gaps = pauses(vo(n).file);
  const cuts = [0]; let acc = 0;
  for (const p of parts.slice(0, -1)) {
    acc += p.length; const guess = dur * acc / total;
    const near = gaps.filter((g) => g > cuts.at(-1) + 0.8 && Math.abs(g - guess) < 1.6).sort((a, b) => Math.abs(a - guess) - Math.abs(b - guess))[0];
    cuts.push(near ?? guess);
  }
  cuts.push(dur);
  parts.forEach((p, i) => caps.push({ start: r2(start + cuts[i]), dur: r2(cuts[i + 1] - cuts[i]), text: esc(p) }));
};
const voStart = {};
const addVo = (n, start) => { voStart[n] = start; audio.push(`<audio id="vo${n}" data-audio-group="voiceover" src="${vo(n).file}" data-start="${r2(start)}" data-duration="${r2(vo(n).duration)}" data-track-index="4" data-volume="1"></audio>`); };

function stage(inner, cls = '') { return `<div class="stage ${cls}"><div class="grid"></div>${inner}</div>`; }
function card(start, dur, html) { clips.push(`<div class="clip card" id="c${++id}" data-start="${r2(start)}" data-duration="${r2(dur)}" data-track-index="1">${html}</div>`); }

// 1 — cold open over the candidate's screen
{ const d = vo(1).duration + 1.2; const png = 'assets/holds/candidate.png';
  // The exam screen only finishes loading in the recording's last seconds: open on that frame with a slow push.
  // (the recording's last frames are mid-close; use the full exam-screen capture from the same run)
  clips.push(`<img class="clip foot hold" id="v${++id}" src="${png}" alt="" data-start="0" data-duration="${r2(d)}" data-track-index="0"/>`);
  card(0, d, `<div class="shade"></div>`); addVo(1, 0.6); addCaps(1, 0.6, vo(1).duration); t = d; }
// 2 — logo sting
{ const d = 5; card(t, d, stage(`<div class="logo" id="logo1"><span class="c">Testo</span><span class="z">Z</span><span class="c">a</span></div><div class="tag">Create Test — the complete tutorial</div>`));
  audio.push(`<audio id="sfx1" src=".media/audio/sfx/sfx_001.mp3" data-start="${r2(t)}" data-duration="5" data-track-index="5" data-volume="0.9"></audio>`); t += d; }
// 3 — promise + map
{ const d = vo(2).duration + 1.5; card(t, d, stage(`<img class="paper" src="assets/p08.png" alt=""/><div class="map"><div class="kicker">TODAY WE BUILD</div><div>1&nbsp; Test details</div><div>2&nbsp; One question, two languages</div><div>3&nbsp; A diagram from the paper</div><div>4&nbsp; Chemistry structures</div><div>5&nbsp; Maths with Sy Pad</div><div>6&nbsp; The big reaction</div><div>7&nbsp; Match the list</div><div>8&nbsp; Sections</div></div>`));
  addVo(2, t + 0.5); addCaps(2, t + 0.5, vo(2).duration); t += d; }
// 4–15 — the recording, one voice line each
for (const n of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
  let start = t;
  if (n === 11) { part2 = t; card(t, 3.5, stage(`<div class="kicker k2">PART 2</div><div class="h1">Sections</div><div class="tag t2">Physics · Chemistry · Mathematics, just like JEE</div>`)); start = t + 3.5; }
  const [a, b] = SEG[n]; const raw = M[b] - M[a]; const need = vo(n).duration + 0.8 - (start - t);
  let rate = Math.min(3, Math.max(1, raw / need)); let footDur = raw / rate; let total = Math.max(need, footDur);
  clips.push(`<video class="clip foot" id="v${++id}" src="assets/recording.mp4" muted data-start="${r2(start)}" data-duration="${r2(footDur)}" data-media-start="${r2(M[a])}" data-playback-rate="${r2(rate)}" data-track-index="0"></video>`);
  if (total - footDur > 0.05) {
    const png = `assets/holds/hold-${n}.png`;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(r2(M[b] - 0.15)), '-i', ROOT + 'assets/recording.mp4', '-frames:v', '1', ROOT + png]);
    clips.push(`<img class="clip foot hold" id="h${++id}" src="${png}" alt="" data-start="${r2(start + footDur)}" data-duration="${r2(total - footDur)}" data-track-index="0"/>`);
  }
  addVo(n, t + 0.4); addCaps(n, t + 0.4, vo(n).duration);
  const [num, label] = CHIP[n]; clips.push(`<div class="clip chip" id="k${++id}" data-start="${r2(start)}" data-duration="${r2(total)}" data-track-index="2"><b>${num}</b>${label}</div>`);
  t = start + total;
}
// 17 — close
{ const d = vo(16).duration + 3; const png = 'assets/holds/candidate.png';
  
  card(t, d, `<img class="endbg" src="${png}" alt=""/><div class="shade2"></div><div class="logo small" id="logo2"><span class="c">Testo</span><span class="z">Z</span><span class="c">a</span></div><div class="tag t3">Make your first test today</div><div class="url">testoza.com</div>`);
  audio.push(`<audio id="sfx2" src=".media/audio/sfx/sfx_001.mp3" data-start="${r2(t + 0.2)}" data-duration="5" data-track-index="5" data-volume="0.8"></audio>`);
  addVo(16, t + 1); addCaps(16, t + 1, vo(16).duration); t += d; }
const TOTAL = r2(t);
// Music: an ambient bed for part 1, a calm lo-fi bed for part 2 (sections). Each is looped with 6 s
// crossfades to its exact length, loudness-normalised, and carved under the voiceover group.
const len = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ROOT + f]).toString());
function bed(src, need, out) {
  const L = len(src), X = 6, k = Math.max(1, Math.ceil((need - X) / (L - X)));
  const args = ['-v', 'error', '-y'];
  for (let i = 0; i < k; i++) args.push('-i', ROOT + src);
  let f = '', last = '[0:a]';
  for (let i = 1; i < k; i++) { f += `${last}[${i}:a]acrossfade=d=${X}[x${i}];`; last = `[x${i}]`; }
  f += `${last}atrim=0:${r2(need)},loudnorm=I=-20:TP=-2,afade=t=in:d=2.5,afade=t=out:st=${r2(need - 3)}:d=3[out]`;
  execFileSync('ffmpeg', [...args, '-filter_complex', f, '-map', '[out]', '-ar', '48000', '-ac', '2', '-b:a', '192k', ROOT + out]);
}
const carve = '{&quot;enabled&quot;:true,&quot;sources&quot;:[&quot;voiceover&quot;],&quot;strength&quot;:0.8}';
const beds = [['assets/music/ambient-5802f2cb.mp3', 0, part2 + 2], ['assets/music/lofi-2b3491d5.mp3', part2, TOTAL - part2]];
beds.forEach(([src, s, d], i) => {
  const out = `assets/music/bed-${LANG}-${i + 1}.mp3`; bed(src, d, out);
  audio.push(`<audio id="bed${i + 1}" src="${out}" data-start="${r2(s)}" data-duration="${r2(d)}" data-track-index="${i ? 9 : 6}" data-volume="0.2" data-fx-carve="${carve}"></audio>`);
});

// Presenter in a circle (bottom right) for the welcome, the part-2 break and the goodbye. The ring
// shows her still a beat before she speaks; the lip-synced clip (capture/avatar.mjs) plays on top.
for (const n of [2, 11, 16]) {
  const f = `assets/avatar/${LANG}/line-${String(n).padStart(2, '0')}.mp4`;
  if (!existsSync(ROOT + f) || voStart[n] == null) continue;
  const s = voStart[n], d = Math.min(vo(n).duration, len(f));
  clips.push(`<div class="clip avring" id="ar${n}" data-start="${r2(s - 0.6)}" data-duration="${r2(d + 1.3)}" data-track-index="7"><img src="assets/avatar/still.png" alt=""/></div>`);
  clips.push(`<video class="clip avvid" id="av${n}" src="${f}" muted data-start="${r2(s)}" data-duration="${r2(d)}" data-track-index="8"></video>`);
}

const capHtml = caps.map((c, i) => `<div class="clip cap" id="cap${i}" data-start="${c.start}" data-duration="${c.dur}" data-track-index="3"><span>${c.text}</span></div>`).join('\n');
const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1920, height=1080"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
@font-face{font-family:'Outfit';font-weight:600;src:url('assets/fonts/Outfit-600.woff2') format('woff2');}
@font-face{font-family:'Outfit';font-weight:700;src:url('assets/fonts/Outfit-700.woff2') format('woff2');}
@font-face{font-family:'Outfit';font-weight:800;src:url('assets/fonts/Outfit-800.woff2') format('woff2');}
@font-face{font-family:'Outfit';font-weight:900;src:url('assets/fonts/Outfit-900.woff2') format('woff2');}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden;background:#020617}
#root{position:relative;width:100%;height:100%;overflow:hidden;font-family:'Outfit',sans-serif}
.foot{position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover}
.card{position:absolute;inset:0;overflow:hidden}
.stage{position:absolute;inset:0;background:radial-gradient(1200px 700px at 50% 62%,rgba(14,116,144,.30),rgba(2,6,23,0) 70%),radial-gradient(900px 600px at 82% 18%,rgba(79,70,229,.22),rgba(2,6,23,0) 70%),linear-gradient(180deg,#050b1d,#020617)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(148,163,184,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.05) 1px,transparent 1px);background-size:64px 64px}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,6,23,.15),rgba(2,6,23,.55))}
.logo{position:absolute;left:0;right:0;top:330px;text-align:center;font-weight:700;font-size:210px;line-height:1;letter-spacing:-.02em;white-space:nowrap}
.logo .c{color:#38bdf8}.logo .z{font-size:1.26em;font-weight:900;background:linear-gradient(180deg,#ffe885,#f4b838 55%,#9e6400);-webkit-background-clip:text;background-clip:text;color:transparent}
.logo.small{top:300px;font-size:170px}
.tag{position:absolute;left:0;right:0;top:650px;text-align:center;font:600 46px/1.3 'Outfit';color:#cbd5e1}
.t2{top:560px}.t3{top:560px}
.kicker{font:700 30px 'Outfit';letter-spacing:.22em;color:#38bdf8;margin-bottom:22px}
.k2{position:absolute;left:0;right:0;top:330px;text-align:center}
.h1{position:absolute;left:0;right:0;top:385px;text-align:center;font:800 120px/1.05 'Outfit';color:#f8fafc;letter-spacing:-.02em}
.paper{position:absolute;left:192px;top:150px;height:760px;border-radius:12px;box-shadow:0 30px 80px -20px #000;transform:rotate(-3deg)}
.map{position:absolute;left:930px;top:170px;width:820px;color:#f8fafc;font:600 38px/1.75 'Outfit'}
.endbg{position:absolute;inset:0;width:1920px;height:1080px;filter:blur(14px);transform:scale(1.06)}
.shade2{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 48%,rgba(2,6,23,.55),rgba(2,6,23,.93) 70%)}
.url{position:absolute;left:790px;top:660px;width:340px;height:64px;border-radius:999px;display:flex;align-items:center;justify-content:center;font:600 32px 'Outfit';color:#f8fafc;background:rgba(15,23,42,.7);box-shadow:0 0 0 1.5px rgba(56,189,248,.55)}
.chip{position:absolute;left:192px;top:108px;height:54px;display:flex;align-items:center;gap:12px;padding:0 22px 0 7px;border-radius:999px;background:rgba(2,6,23,.86);box-shadow:0 0 0 1.5px rgba(56,189,248,.55),0 12px 30px -12px rgba(0,0,0,.6);color:#f8fafc;font:600 23px 'Outfit';white-space:nowrap}
.chip b{width:40px;height:40px;border-radius:50%;background:#38bdf8;color:#020617;font:800 22px/40px 'Outfit';text-align:center}
.cap{position:absolute;left:0;right:0;bottom:110px;text-align:center}
.cap span{display:inline-block;max-width:1500px;padding:10px 28px;border-radius:14px;background:rgba(2,6,23,.82);color:#fff;font:600 36px/1.3 'Outfit'}
.avring,.avvid{position:absolute;right:56px;bottom:230px;width:300px;height:300px;border-radius:50%}
.avring{overflow:hidden;background:#0b1530;box-shadow:0 0 0 4px rgba(56,189,248,.9),0 0 0 10px rgba(56,189,248,.18),0 26px 60px -16px rgba(0,0,0,.75)}
.avring img{width:100%;height:100%;object-fit:cover}
.avvid{object-fit:cover;clip-path:circle(50%)}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1920" data-height="1080">
${clips.join('\n')}
${capHtml}
${audio.join('\n')}
</div>
<script>
const tl = gsap.timeline({ paused: true });
document.querySelectorAll('.hold').forEach((el) => {
  const s = +el.dataset.start, d = +el.dataset.duration;
  tl.fromTo(el, { scale: 1 }, { scale: 1.06, duration: d, ease: 'none', transformOrigin: '50% 40%' }, s);
});
document.querySelectorAll('.chip').forEach((el) => { tl.fromTo(el, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'expo.out' }, +el.dataset.start); });
document.querySelectorAll('.avring').forEach((el) => {
  const s = +el.dataset.start, d = +el.dataset.duration;
  tl.fromTo(el, { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }, s);
  tl.to(el, { scale: 0.85, opacity: 0, duration: 0.4, ease: 'power2.in', immediateRender: false }, s + d - 0.45);
});
document.querySelectorAll('.cap span').forEach((el) => { tl.fromTo(el, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }, +el.parentElement.dataset.start); });
['#logo1', '#logo2'].forEach((sel) => {
  const el = document.querySelector(sel); if (!el) return; const s = +el.closest('.card').dataset.start;
  tl.fromTo(el.querySelectorAll('.c'), { y: 90, opacity: 0, filter: 'blur(16px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.85, ease: 'expo.out', stagger: 0.06 }, s + 0.3);
  tl.fromTo(el.querySelector('.z'), { y: -260, rotation: -18, scale: 1.6, opacity: 0 }, { y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(1.6)' }, s + 0.75);
});
window.__timelines['main'] = tl;
</script>
</body></html>`;
writeFileSync(ROOT + 'index.html', html);
console.log('total', TOTAL, 's; clips', clips.length, 'captions', caps.length);
