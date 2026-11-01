// Builds compositions/phone.html (the real phone footage, cut to the voice) and index.html (the
// film: scenes, voice, music, SFX) from the tables below. Times are film seconds (T).
// node capture/build.mjs [--lang hi|ta|te|kn|ml]
import { writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const LANG = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'en';
const P0 = 11.3; // phone section starts
const END = 76.5; // film length
const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();

// ── footage: [T start, file, media in, media out, rate] (a = run A7 upload→My Tests, b = run B3 exam→result)
const CUTS = [
  [12.0, 'a', 0.0, 1.30, 1],
  [19.45, 'a', 1.34, 1.95, 1],
  [20.06, 'a', 3.5, 5.05, 1],
  [22.8, 'a', 5.17, 6.75, 1],
  [24.38, 'a', 6.75, 8.95, 1],
  [26.58, 'a', 8.95, 11.75, 1.5],
  [28.45, 'a', 11.75, 36.05, 6],
  [32.5, 'a', 36.05, 43.8, 1.45],
  [37.85, 'a', 43.8, 47.4, 1],
  [41.45, 'a', 47.4, 56.0, 1.6],
  ...JSON.parse(readFileSync(new URL('./cuts-b.json', import.meta.url), 'utf8')),
];
// stills held while an overlay covers the screen, or before/after the footage: [T start, T end, image]
const HOLDS = JSON.parse(readFileSync(new URL('./holds.json', import.meta.url), 'utf8'));

let t = 0;
const clips = [];
CUTS.forEach(([T, f, a, b, r], i) => {
  const d = +((b - a) / r).toFixed(3);
  const next = CUTS[i + 1] ? CUTS[i + 1][0] : null;
  if (next !== null && Math.abs(T + d - next) > 0.02) console.warn(`cut ${i} ends ${(T + d).toFixed(2)} but next starts ${next}`);
  clips.push(`        <video id="v${String(i).padStart(2, '0')}" class="clip ft" src="assets/footage/run-${f}.mp4" muted playsinline data-start="${(T - P0).toFixed(3)}" data-duration="${d}" data-media-start="${a}"${r !== 1 ? ` data-playback-rate="${r}"` : ''} data-track-index="1"></video>`);
});
HOLDS.forEach(([a, b, img], i) => clips.push(`        <img id="h${String(i).padStart(2, '0')}" class="clip ft" src="assets/stills/${img}" alt="" data-start="${(a - P0).toFixed(3)}" data-duration="${(b - a).toFixed(3)}" data-track-index="2" />`));

const phoneTpl = readFileSync(new URL('./phone.tpl.html', import.meta.url), 'utf8');
writeFileSync(new URL('../compositions/phone.html', import.meta.url), phoneTpl.replace('<!--CLIPS-->', clips.join('\n')).replace(/__P0__/g, P0).replace(/__PD__/g, (END - P0).toFixed(2)).replace('__ZOOMS__', readFileSync(new URL('./zooms.json', import.meta.url), 'utf8').trim()));

// ── voice: [id, T start]
const VO = JSON.parse(readFileSync(new URL(`./vo-${LANG}.json`, import.meta.url), 'utf8'));
const voDir = `assets/voice-${LANG}`;
const vo = VO.map(([id, T]) => `      <audio id="vo-${id}" data-audio-group="voiceover" src="${voDir}/${id}.wav" data-start="${T}" data-duration="${dur(`${voDir}/${id}.wav`).toFixed(2)}" data-track-index="3" data-volume="1"></audio>`);
const SFX = JSON.parse(readFileSync(new URL('./sfx.json', import.meta.url), 'utf8'));
const sfx = SFX.map(([id, file, T, vol]) => `      <audio id="sfx-${id}" data-audio-group="sfx" src="assets/sfx/${file}" data-start="${T}" data-duration="${dur(`assets/sfx/${file}`).toFixed(2)}" data-track-index="5" data-volume="${vol}"></audio>`);

const idxTpl = readFileSync(new URL('./index.tpl.html', import.meta.url), 'utf8');
writeFileSync(new URL('../index.html', import.meta.url), idxTpl.replace('<!--VO-->', vo.join('\n')).replace('<!--SFX-->', sfx.join('\n')).replace(/__END__/g, END).replace(/__P0__/g, P0).replace(/__PD__/g, (END - P0).toFixed(2)));
console.log(`built ${CUTS.length} cuts, ${HOLDS.length} holds, ${VO.length} voice lines (${LANG}), ${SFX.length} sfx`);
