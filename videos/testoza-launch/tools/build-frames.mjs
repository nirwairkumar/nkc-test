// Builds compositions/frames/*.html and index.html from ui/frames-src/.
// Tokens in a frame source:
//   <!--@head-->            shared stylesheets, @font-face and GSAP
//   <!--@ssr:name-->        ui/ssr/name.html (a server-rendered TestoZa screen)
//   <!--@chrome:host/path--> browser chrome with that address
//   <!--@cursor-->          cursor layer
//   <!--@measure {...}-->   click targets to measure (read by tools/measure.html, removed here)
//   /*@helpers*/            the shared timeline helpers (needs const ID before it)
//   /*@M*/                  measured points for this frame, from ui/measure.json
// Run from the project root: node tools/build-frames.mjs
import fs from 'node:fs';
import path from 'node:path';

const project = process.cwd();
const src = path.join(project, 'ui/frames-src');
const outDir = path.join(project, 'compositions/frames');
fs.mkdirSync(outDir, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(src, process.env.MANIFEST || 'manifest.json'), 'utf8'));
const measured = fs.existsSync(path.join(project, 'ui/measure.json'))
  ? JSON.parse(fs.readFileSync(path.join(project, 'ui/measure.json'), 'utf8'))
  : {};

const FACES = [['Outfit', [500, 600, 700, 800, 900]], ['Mukta', [400, 500, 600, 700, 800]]]
  .flatMap(([f, ws]) => ws.map((w) => `@font-face{font-family:'${f}';font-weight:${w};font-display:block;src:url("assets/fonts/${f}-${w}.woff2") format("woff2");}`))
  .join('\n') + '\n' +
  // named in the app's own font stacks (emoji, monospace): the system copies are used
  ['Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', 'SFMono-Regular']
    .map((f) => `@font-face{font-family:'${f}';src:local('${f}');}`).join('\n');
const HEAD = `<link rel="stylesheet" href="assets/app.css" />
<link rel="stylesheet" href="assets/film.css" />
<style>
${FACES}
</style>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>`;

const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const chrome = (addr) => {
  const i = addr.indexOf('/');
  const host = i < 0 ? addr : addr.slice(0, i);
  const rest = i < 0 ? '' : addr.slice(i);
  return `<div class="tz-chrome"><div class="tz-dots"><i></i><i></i><i></i></div><div class="tz-url">${LOCK}<span>${host}<b>${rest}</b></span></div></div>`;
};
const CURSOR = `<div class="tz-curlayer" style="position:absolute;inset:0;z-index:70;pointer-events:none">
<div class="tz-cursor"><svg viewBox="0 0 34 34"><path d="M3 2 L3 26 L9.2 20.4 L13.4 30 L17.6 28.2 L13.5 18.8 L22 18.8 Z" fill="#0b0f17" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/></svg></div>
</div>`;

const HELPERS = fs.readFileSync(path.join(project, 'tools/helpers.js'), 'utf8');

const ssr = (name) => {
  const f = path.join(project, 'ui/ssr', `${name}.html`);
  if (!fs.existsSync(f)) throw new Error(`missing ui/ssr/${name}.html`);
  return fs.readFileSync(f, 'utf8');
};

for (const frame of manifest.frames) {
  let html = fs.readFileSync(path.join(src, `${frame.id}.tpl`), 'utf8');
  html = html
    .replace('<!--@head-->', HEAD)
    .replace(/<!--@ssr:([\w-]+)-->/g, (_, n) => ssr(n))
    .replace(/<!--@chrome:([^>]+?)-->/g, (_, a) => chrome(a.trim()))
    .replace('<!--@cursor-->', CURSOR)
    .replace(/<!--@measure[\s\S]*?-->/g, '')
    .replace('/*@helpers*/', HELPERS)
    .replace('/*@M*/', `const M = ${JSON.stringify(measured[frame.id] || {})};`)
    .replaceAll('__DUR__', String(frame.duration))
    .replace('class="clip tz-stage"', `id="${frame.id}-stage" class="clip tz-stage"`)
    // every frame's script runs in the host's global scope: give each its own
    .replace(/<script>([\s\S]*?)<\/script>/g, (_, body) => `<script>\n(function () {${body}})();\n</script>`);
  fs.writeFileSync(path.join(outDir, `${frame.id}.html`), html);
}

// index.html: one graphics row of frame hosts, back to back.
// --only=a,b builds an index with just those frames (for isolating a problem)
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',') : null;
let t = 0;
const hosts = manifest.frames.filter((f) => !only || only.includes(f.id)).map((f) => {
  const line = `      <div id="host-${f.id}" data-composition-id="${f.id}" data-composition-src="compositions/frames/${f.id}.html" data-start="${t.toFixed(2)}" data-duration="${f.duration}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`;
  t += f.duration;
  return line;
});
const total = t.toFixed(2);
// one music bed on its own audio row (the file carries its own fades)
const mu = manifest.music;
if (mu && !only) hosts.push(`      <audio id="el-bgm" src="${mu.src}" data-start="${mu.start}" data-duration="${mu.duration}" data-track-index="2" data-volume="${mu.volume}"></audio>`);
const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>TestoZa launch film</title>
    <link rel="stylesheet" href="assets/app.css" />
    <link rel="stylesheet" href="assets/film.css" />
    <style>
${FACES}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #020617; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #020617; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
${hosts.join('\n')}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(project, 'index.html'), index);
console.log(`${manifest.frames.length} frames, ${total}s`);
