// Veo 3.1 image-to-video on Vertex: each approved still becomes a live-action shot.
// GK comes from the environment only.
//
//   GK=... node gen/veo.mjs <shotId> [<shotId> ...] [--fast] [--seed 7]
//
// Uses the newest take of each still (gen/img/<id>-v<n>.png) and MOTION[id] below.
// Writes gen/veo/<id>-v<n>.mp4 plus a .json with the request.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const IMG = path.join(ROOT, 'img');
const OUT = path.join(ROOT, 'veo');
fs.mkdirSync(OUT, { recursive: true });
const KEY = process.env.GK;
if (!KEY) { console.error('GK (Vertex API key) is not set'); process.exit(1); }
const args = process.argv.slice(2);
const fast = args.includes('--fast');
const lastSame = args.includes('--last-same'); // pin the last frame to the still too: subtler motion
const seedArg = args.includes('--seed') ? Number(args[args.indexOf('--seed') + 1]) : 7;
const stillArg = args.includes('--still') ? args[args.indexOf('--still') + 1] : ''; // a specific still instead of the newest take
const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--seed' && args[i - 1] !== '--still');
const MODEL = fast ? 'veo-3.1-fast-generate-001' : 'veo-3.1-generate-001';
const BASE = `https://us-central1-aiplatform.googleapis.com/v1/projects/264800752296/locations/us-central1/publishers/google/models/${MODEL}`;

const STILL = 'Photorealistic live-action footage, natural and subtle human motion, real physics, consistent faces and hands.';
const LOCKED = 'Locked-off tripod shot, absolutely no camera movement.';
export const MOTION = {
  'exam-hall': [8, `${LOCKED} Priya keeps her lips gently closed the whole time; she never opens her mouth or speaks. She sits still, breathes slowly and nervously through her nose, her right hand tightens slightly on the mouse and her head tilts a little as she reads the screen. Candidates in the background shift slightly; the invigilator stands still. The monitor image and the countdown stay steady and legible.`],
  'priya-nervous': [6, `${LOCKED} Close-up. Priya keeps her lips pressed together the whole time; she never opens her mouth or speaks. Her eyes move slowly across the screen, she blinks and swallows once, nervous; a loose strand of hair stirs slightly. The background stays soft.`],
  photocopier: [6, `Sheets of printed question paper slide out of the photocopier one after another and drop onto the growing pile; dust motes drift through the warm light. Very slow push in.`],
  'paper-class': [8, `${LOCKED} The young adult students keep writing on their answer sheets with their heads down; Verma Sir walks slowly a few steps along the aisle between the benches with his hands behind his back, glancing at the papers; the ceiling fans turn. No new people enter the frame.`],
  'night-check': [8, `${LOCKED} Verma Sir marks a tick with the red pen and moves the sheet onto the checked stack, then pauses, takes off his spectacles and rubs his tired eyes. The lamp light stays steady; the family sleeps in the background.`],
  'red-pen': [6, `The red pen draws a small cross beside an answer, then lifts away; the other hand holds the sheet steady. Very slow drift, shallow focus.`],
  'notice-board': [6, `The young woman runs her finger down the results list searching for her name; the students lean in closer; one young man squints at the sheet. Gentle handheld feel.`],
  copying: [6, `${LOCKED} The young man's eyes slide sideways toward his neighbour's answer sheet, flick back down to his own, then sideways again; his pen hovers above the paper.`],
  dawn: [8, `${LOCKED} Verma Sir stands at the window holding the steel tumbler; he takes a slow sip of tea and lowers it, gazing outside thoughtfully as the warm sunlight slowly grows on his face.`],
  laptop: [6, `${LOCKED} Verma Sir opens the silver laptop and looks at the screen with a calm, thoughtful expression; soft daylight from the window; the plant leaves stir slightly.`],
  'board-code': [6, `${LOCKED} Verma Sir lowers the blue marker and turns from the whiteboard toward the class with a warm smile; in the foreground a student holds up a phone. The handwriting on the board stays perfectly still and legible.`],
  'class-phones': [8, `The students tap on their phones, glance at their rough sheets and jot quick calculations with their pencils; Verma Sir stands calmly at the front, watching. Slow, smooth sideways dolly to the right.`],
  'priya-phone': [6, `${LOCKED} Priya taps an answer on her phone, glances at her rough sheet, writes a short calculation with the pencil, then looks back at the phone. Calm and focused.`],
  'lab-wide': [8, `Students work at their computers, reading and clicking; Verma Sir walks slowly down the aisle toward the camera with his hands clasped behind his back. Slow dolly backward.`],
  'lab-screen': [6, `${LOCKED} The young man reads the screen, moves the mouse slightly and shifts in his chair. The monitor stays perfectly still and its screen stays plain light grey.`],
  'laptop-hands': [6, `${LOCKED} His hands lift the laptop lid fully open and settle on the keyboard; soft morning light; the plant leaves stir slightly.`],
  'teacher-ots': [6, `${LOCKED} The man reads the laptop screen and nods slowly, leaning back a little in his chair. The laptop stays perfectly still and its screen stays plain light grey.`],
  'class-result': [6, `${LOCKED} Priya looks at her phone and a small, proud smile spreads across her face; the friend beside her leans in, looks at the phone and smiles too.`],
  'teacher-result': [6, `${LOCKED} Verma Sir reads on his laptop, nods slowly with a quiet, satisfied smile, and leans back in his chair.`],
  'pen-down': [4, `His hand places the red pen into the white ceramic pen stand and lets go; warm sunlight streaks across the desk. Very slow push in.`],
  dinner: [6, `The family laughs together at the dinner table; Verma Sir tears a piece of roti and smiles at his wife; his mother passes a bowl. Very subtle camera drift.`],
  'exam-calm': [6, `${LOCKED} Priya keeps her lips softly closed the whole time; she never opens her mouth or speaks. She rolls her shoulders back, takes one calm breath through her nose and rests her hand lightly on the mouse with quiet confidence. The monitor image and the countdown stay steady and legible.`],
  'priya-calm': [6, `${LOCKED} Close-up. Priya reads the screen steadily; a slight, confident smile forms at the corner of her lips; she blinks calmly.`],
};
const NEGATIVE = 'talking, speaking, open mouth, lip movement, gasping, camera shake, fast motion, morphing, warping faces, distorted or extra fingers, flicker, changing or gibberish text, cartoon, CGI look, low quality, blur, slow motion';

const takeNo = f => Number(f.match(/-v(\d+)\.(png|mp4)$/)?.[1] || 0);
const newest = (dir, id, ext) => fs.readdirSync(dir).filter(f => f.startsWith(`${id}-v`) && f.endsWith(ext)).sort((a, b) => takeNo(a) - takeNo(b)).at(-1);

async function post(url, body) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`${url}?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (res.ok) return json;
    console.error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    if (res.status !== 429 && res.status < 500) throw new Error('request failed');
    await new Promise(r => setTimeout(r, 20000 * attempt));
  }
  throw new Error('gave up');
}

async function one(id) {
  const [dur, motion] = MOTION[id];
  const still = stillArg ? path.basename(stillArg) : newest(IMG, id, '.png');
  if (!still) throw new Error(`no still for ${id}`);
  // exact 16:9, 1920x1080 jpeg for the model
  const jpg = path.join(OUT, `_in-${id}.jpg`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(IMG, still), '-vf', 'crop=min(iw\\,ih*16/9):min(ih\\,iw*9/16),scale=1920:1080:flags=lanczos', '-q:v', '2', jpg]);
  const body = {
    instances: [{ prompt: `${motion} ${STILL}`, image: { bytesBase64Encoded: fs.readFileSync(jpg).toString('base64'), mimeType: 'image/jpeg' },
      ...(lastSame ? { lastFrame: { bytesBase64Encoded: fs.readFileSync(jpg).toString('base64'), mimeType: 'image/jpeg' } } : {}) }],
    parameters: { aspectRatio: '16:9', resolution: '1080p', durationSeconds: dur, generateAudio: false, sampleCount: 1, personGeneration: 'allow_adult', negativePrompt: NEGATIVE, seed: seedArg },
  };
  const op = await post(`${BASE}:predictLongRunning`, body);
  const t0 = Date.now();
  for (;;) {
    await new Promise(r => setTimeout(r, 15000));
    const st = await post(`${BASE}:fetchPredictOperation`, { operationName: op.name });
    if (!st.done) continue;
    if (st.error) throw new Error(`${id}: ${st.error.message}`);
    const vids = st.response?.videos || [];
    if (!vids.length) throw new Error(`${id}: no video (filtered ${st.response?.raiMediaFilteredCount ?? '?'}: ${JSON.stringify(st.response?.raiMediaFilteredReasons ?? '')})`);
    const n = (takeNo(newest(OUT, id, '.mp4') || '') || 0) + 1;
    const file = path.join(OUT, `${id}-v${n}.mp4`);
    fs.writeFileSync(file, Buffer.from(vids[0].bytesBase64Encoded, 'base64'));
    delete body.instances[0].image;
    delete body.instances[0].lastFrame;
    fs.writeFileSync(file.replace(/\.mp4$/, '.json'), JSON.stringify({ id, still, model: MODEL, request: body }, null, 1));
    console.log(`${path.relative(process.cwd(), file)}  (${still}, ${dur}s, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    return;
  }
}

// a few at a time keeps under the per-minute quota
const queue = [...ids];
const workers = Array.from({ length: Number(process.env.VEO_PAR || 3) }, async () => {
  while (queue.length) {
    const id = queue.shift();
    try { await one(id); } catch (e) { console.error(`FAILED ${id}: ${e.message}`); }
  }
});
await Promise.all(workers);
