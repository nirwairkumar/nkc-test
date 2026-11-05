// ElevenLabs voice for the brand film, with character timings.
// The key is read from videos/.env (ELEVEN_API_KEY, git-ignored).
//
//   node gen/vo.mjs --voice <id> --text "..." --out vo/<name> [--model eleven_multilingual_v2]
//        [--stability 0.5] [--similarity 0.8] [--style 0.2] [--speed 0.95] [--seed 7]
//        [--prev "..."] [--next "..."]
//
// Writes <out>.mp3 and <out>.json (alignment: chars with start/end seconds, plus words).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(ROOT, '../../../.env');
const KEY = fs.readFileSync(ENV, 'utf8').match(/^ELEVEN_API_KEY=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!KEY) { console.error('ELEVEN_API_KEY missing in videos/.env'); process.exit(1); }

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i > -1 ? args[i + 1] : dflt; };
const voice = opt('voice');
const text = opt('text') ?? fs.readFileSync(opt('file'), 'utf8').trim();
const out = path.resolve(ROOT, opt('out'));
const model = opt('model', 'eleven_multilingual_v2');
const format = opt('format', 'mp3_44100_128');
fs.mkdirSync(path.dirname(out), { recursive: true });

const body = {
  text,
  model_id: model,
  voice_settings: {
    stability: Number(opt('stability', '0.5')),
    similarity_boost: Number(opt('similarity', '0.8')),
    style: Number(opt('style', '0.2')),
    use_speaker_boost: true,
    speed: Number(opt('speed', '0.95')),
  },
};
if (opt('seed')) body.seed = Number(opt('seed'));
if (opt('prev')) body.previous_text = opt('prev');
if (opt('next')) body.next_text = opt('next');
if (model === 'eleven_v3') delete body.voice_settings.style; // v3 takes stability only (0, 0.5, 1)

const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=${format}`;
let res, json;
for (let attempt = 1; attempt <= 3; attempt++) {
  res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  json = await res.json().catch(() => ({}));
  if (res.ok) break;
  console.error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  if (res.status !== 429 && res.status < 500) process.exit(1);
  await new Promise(r => setTimeout(r, 5000 * attempt));
}
if (!res.ok) process.exit(1);

const ext = format.startsWith('pcm') ? 'pcm' : 'mp3';
fs.writeFileSync(`${out}.${ext}`, Buffer.from(json.audio_base64, 'base64'));

// words from the character alignment
const a = json.alignment;
const words = [];
let cur = null;
a.characters.forEach((ch, i) => {
  if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
  if (!cur) cur = { w: '', start: a.character_start_times_seconds[i], end: 0 };
  cur.w += ch;
  cur.end = a.character_end_times_seconds[i];
});
if (cur) words.push(cur);
fs.writeFileSync(`${out}.json`, JSON.stringify({ voice, model, settings: body.voice_settings, text, words, alignment: a }, null, 1));
const dur = words.at(-1)?.end ?? 0;
console.log(`${path.relative(process.cwd(), out)}.${ext}  ${words.length} words, speech ends ${dur.toFixed(2)} s, ${(words.length / dur * 60).toFixed(0)} wpm`);
