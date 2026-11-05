// Writes index.html (the cut) from the edit list below.  node tools/build.mjs
// Film clock = the voice (tools/timing.mjs): every cut is placed on a word of take s11.
import fs from 'node:fs';

// node tools/build.mjs [en|hi]: hi swaps in the Hindi mix and end card, and holds two paper-world
// cuts a little longer where the Hindi line is longer. index.html is the render root either way.
const LANG = process.argv[2] || 'en';

const FPS = 24;
const snap = t => Math.round(t * FPS) / FPS;
const END = 89.8;

// start = film second the shot cuts in; in = second of its source it starts from;
// cam = [scale from, scale to, transform-origin, ease]
const EDL = [
  { id: 'exam-hall', start: 0, in: 0, cam: [1.0, 1.05, '72% 42%'] },                 // One day, your students… And they'll face a screen.
  { id: 'priya-nervous', start: 8.0, in: 0, cam: [1.02, 1.06, '42% 40%'] },          // For many of them,
  { id: 'priya-nervous-close', start: 10.25, in: 3.75, cam: [1.12, 1.16, '45% 42%'] }, // it will be the very first time. (punch-in)
  { id: 'paper-class', start: 12.5, in: 0, cam: [1.0, 1.03, '50% 45%'] },            // (cut) Because until then
  { id: 'photocopier', start: 14.2, in: 0.1, cam: [1.0, 1.035, '40% 55%'] },         // …every practice test is on paper. Printed…
  { id: 'red-pen', start: 20.1, in: 0.4, cam: [1.04, 1.09, '55% 45%'] },             // Checked by hand
  { id: 'night-check', start: 22.0, in: 4.9, cam: [1.0, 1.04, '60% 45%'] },          // long after the house has gone to sleep
  { id: 'notice-board', start: 24.9, in: 0.5, cam: [1.0, 1.04, '60% 45%'] },         // Results that take days
  { id: 'copying', start: 28.0, in: 0.4, cam: [1.03, 1.08, '40% 35%'] },             // And a test that's only as fair
  { id: 'paper-class-watch', start: 31.4, in: 0, cam: [1.04, 1.08, '55% 30%'] }, // framed high: Veo grows uniformed heads at the bottom edge after 1.2 s     // as the eyes watching the room
  { id: 'dawn', start: 32.7, in: 0.6, dissolve: 0.6, cam: [1.0, 1.05, '45% 40%'] },  // But what if every test felt like the real one?
  { id: 'laptop-hands', start: 39.0, in: 0.6, cam: [1.0, 1.03, '45% 50%'] },         // With Testoza,
  { id: 'ai-import', ui: true, start: 40.6, in: 0, cam: [1.0, 1.06, '70% 45%'] },    // your question paper becomes an online test, in minutes
  { id: 'board-code', start: 45.8, in: 0.6, cam: [1.0, 1.035, '68% 35%'] },          // Share one code,
  { id: 'class-phones', start: 47.6, in: 1.0, cam: [1.0, 1.02, '50% 50%'] },         // and your whole class begins.
  { id: 'priya-phone', start: 50.1, in: 0.3, cam: [1.02, 1.05, '45% 45%'] },         // On their phones.
  { id: 'lab-wide', start: 51.4, in: 1.0, cam: [1.0, 1.03, '50% 45%'] },             // Or in your computer lab.
  { id: 'lab-screen', start: 53.5, in: 1.2, cam: [1.0, 1.12, '70% 38%'] },           // Timed like the real exam,
  { id: 'phone', sub: true, start: 56.0 },                                            // and secure from the first question to the last.
  { id: 'results-panel', ui: true, start: 60.0, in: 0, cam: [1.0, 1.05, '60% 25%'] }, // The moment they submit, the results are ready.
  { id: 'class-result', start: 64.0, in: 0.8, cam: [1.0, 1.04, '60% 40%'] },         // Every score.
  { id: 'rank-list', ui: true, start: 66.0, in: 0, cam: [1.03, 1.07, '15% 40%'] },   // Every rank.
  { id: 'teacher-ots', start: 67.6, in: 1.0, cam: [1.0, 1.1, '68% 60%'] },           // And exactly where
  { id: 'results-report', ui: true, start: 69.6, in: 0, cam: [1.1, 1.0, '62% 45%', 'power2.out'] }, // each student needs you.
  { id: 'pen-down', start: 71.4, in: 0.2, cam: [1.0, 1.04, '35% 55%'] },             // Your nights
  { id: 'dinner', start: 73.3, in: 0.5, cam: [1.0, 1.03, '50% 50%'] },               // are yours again.
  { id: 'exam-calm', start: 75.3, in: 1.0, cam: [1.0, 1.06, '72% 42%'] },            // So when the big day comes, the screen won't be new.
  { id: 'priya-calm', start: 79.6, in: 1.2, cam: [1.02, 1.08, '42% 40%'] },          // Because you got them ready.
  { id: 'endcard', sub: true, start: 83.0 },
];

if (LANG === 'hi') {
  // रिज़ल्ट आने में, दिन लग जाते हैं ends 29.0 s; जितनी कमरे पर नज़र starts 31.57 s (tools/dub-hi.mjs placement)
  EDL.find(s => s.id === 'copying').start = 28.9;
  EDL.find(s => s.id === 'paper-class-watch').start = 31.55;
}

// each shot runs to the next one's start; a dissolving shot overlaps the one before it
const shots = EDL.map((s, i) => {
  const next = EDL[i + 1];
  let end = next ? next.start : END;
  if (next?.dissolve) end = snap(next.start + next.dissolve);
  return { ...s, start: snap(s.start), dur: snap(end - snap(s.start)) };
});

const fmt = n => String(+n.toFixed(4));
let body = '';
let js = '';
for (const s of shots) {
  if (s.sub) {
    body += `      <div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}${s.id === 'endcard' && LANG === 'hi' ? '-hi' : ''}.html" data-start="${fmt(s.start)}" data-duration="${fmt(s.dur)}" data-track-index="2" data-track-kind="graphics" data-width="1920" data-height="1080"></div>\n`;
    continue;
  }
  const src = s.ui ? `assets/ui/${s.id}.mp4` : `assets/footage/${s.id}.mp4`;
  const [a, b, origin, ease = 'none'] = s.cam;
  body += `      <div class="shot" id="sh-${s.id}" data-layout-allow-overflow><div class="cam" id="cam-${s.id}" style="transform-origin: ${origin}">` +
    `<video id="v-${s.id}" class="clip" src="${src}" data-start="${fmt(s.start)}" data-duration="${fmt(s.dur)}" data-media-start="${fmt(s.in)}" data-track-index="${s.ui ? 1 : 0}" muted playsinline></video></div></div>\n`;
  js += `      tl.fromTo('#cam-${s.id}', { scale: ${a} }, { scale: ${b}, duration: ${fmt(s.dur)}, ease: '${ease}' }, ${fmt(s.start)});\n`;
  if (s.dissolve) js += `      tl.fromTo('#sh-${s.id}', { opacity: 0 }, { opacity: 1, duration: ${s.dissolve}, ease: 'sine.inOut' }, ${fmt(s.start)});\n`;
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>TestoZa · First Time${LANG === 'hi' ? ' (Hindi)' : ''}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #000; }
      .shot { position: absolute; inset: 0; overflow: hidden; }
      .cam { position: absolute; inset: 0; }
      .cam video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      #whiteout { position: absolute; inset: 0; background: #fff; opacity: 0; }
    </style>
  </head>
  <body>
    <!-- "First Time" - TestoZa brand film. Cut list generated by tools/build.mjs; the clock is the voice (SCRIPT-en.md). -->
    <div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${END}" data-fps="${FPS}">
${body}      <div id="whiteout" class="clip" data-start="82.4" data-duration="0.65" data-track-index="3"></div>
      <audio id="mix" class="clip" src="assets/audio/${LANG === 'hi' ? 'mix-hi' : 'mix'}.wav" data-start="0" data-duration="${END}" data-track-index="4"></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
${js}      // the last line lands, then the picture goes to white before the signature tune
      tl.fromTo('#whiteout', { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'sine.in' }, 82.45);
      window.__timelines['main'] = tl;
    </script>
  </body>
</html>
`;
fs.writeFileSync('index.html', html);
console.log(shots.map(s => `${s.id.padEnd(18)} ${s.start.toFixed(3).padStart(7)} +${s.dur.toFixed(3)}`).join('\n'));
