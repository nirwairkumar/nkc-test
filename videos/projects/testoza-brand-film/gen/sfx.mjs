// Diegetic sound for the brand film, ElevenLabs sound effects. Key from videos/.env.
//   node gen/sfx.mjs [name ...]     (no names = all)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const KEY = fs.readFileSync(path.resolve(ROOT, '../../../.env'), 'utf8').match(/^ELEVEN_API_KEY=(.*)$/m)?.[1].trim();
const OUT = path.join(ROOT, 'sfx');
fs.mkdirSync(OUT, { recursive: true });

export const SFX = {
  'exam-hall': [8, 'Quiet computer-based exam hall room tone: soft air-conditioning hum, a wall clock ticking slowly and clearly, one or two distant mouse clicks. Tense and still.'],
  photocopier: [4, 'An old office photocopier printing page after page: rhythmic mechanical ka-chunk, paper sliding out onto a tray, warm room.'],
  'paper-class': [6, 'A quiet classroom during a written exam: many pens scratching on paper, a ceiling fan whirring, a page turning, someone clears their throat.'],
  'night-desk': [6, 'Late night in a small room: a ballpoint pen ticking marks on paper, paper rustling as a sheet is moved, crickets far outside, a quiet table fan.'],
  corridor: [4, 'Young students murmuring and chattering softly in a narrow school corridor, indistinct voices, footsteps.'],
  dawn: [6, 'Early morning in an Indian city from inside a flat: distant birds chirping, faint distant traffic, a steel tumbler set down gently.'],
  laptop: [2, 'A laptop lid being opened, a soft hinge sound and a gentle click.'],
  marker: [2.5, 'A whiteboard marker writing quickly on a whiteboard with a soft squeak, then the cap clicking on.'],
  taps: [3, 'Soft taps on a smartphone touch screen in a quiet bright classroom, a pencil writing briefly on paper.'],
  lab: [4, 'A calm computer lab: soft keyboard typing and mouse clicks from several students, quiet air-conditioning.'],
  dinner: [4, 'A family at a dinner table at home: warm soft laughter, steel plates and spoons clinking gently.'],
  click: [1, 'A single soft computer mouse click in a quiet room.'],
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SFX);
for (const name of names) {
  const [dur, text] = SFX[name];
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192', {
    method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, duration_seconds: dur, prompt_influence: 0.5 }),
  });
  if (!res.ok) { console.error(`${name}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`); continue; }
  fs.writeFileSync(path.join(OUT, `${name}.mp3`), Buffer.from(await res.arrayBuffer()));
  console.log(`gen/sfx/${name}.mp3 (${dur}s)`);
}
