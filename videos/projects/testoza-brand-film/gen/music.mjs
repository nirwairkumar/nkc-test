// Eleven Music for the brand film: the sonic logo and the score.
// The key is read from videos/.env (ELEVEN_API_KEY, git-ignored).
//
//   node gen/music.mjs --out music/<name> --prompt "..." --ms 6000 [--instrumental]
//   node gen/music.mjs --out music/<name> --plan gen/music/<plan>.json [--seed 3]
//
// Writes <out>.mp3 and <out>.json (request + response headers, which carry the song id
// that a later composition plan can reference as an audio chunk).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const KEY = fs.readFileSync(path.resolve(ROOT, '../../../.env'), 'utf8').match(/^ELEVEN_API_KEY=(.*)$/m)?.[1].trim();
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i > -1 ? args[i + 1] : dflt; };
const out = path.resolve(ROOT, opt('out'));
fs.mkdirSync(path.dirname(out), { recursive: true });

const body = { model_id: opt('model', 'music_v2_5'), store_for_inpainting: true };
if (opt('plan')) {
  body.composition_plan = JSON.parse(fs.readFileSync(path.resolve(opt('plan')), 'utf8'));
  if (opt('seed')) body.seed = Number(opt('seed'));
} else {
  body.prompt = opt('prompt');
  body.music_length_ms = Number(opt('ms', '6000'));
  if (args.includes('--instrumental')) body.force_instrumental = true;
}

const format = opt('format', 'mp3_44100_192');
const t0 = Date.now();
const res = await fetch(`https://api.elevenlabs.io/v1/music?output_format=${format}`, {
  method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const headers = Object.fromEntries(res.headers.entries());
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 600)}`);
  process.exit(1);
}
fs.writeFileSync(`${out}.mp3`, Buffer.from(await res.arrayBuffer()));
fs.writeFileSync(`${out}.json`, JSON.stringify({ request: body, headers }, null, 1));
const songId = headers['song-id'] || headers['x-song-id'] || Object.entries(headers).find(([k]) => /song/i.test(k))?.[1];
console.log(`${path.relative(process.cwd(), out)}.mp3  ${((Date.now() - t0) / 1000).toFixed(0)} s  song ${songId ?? '(no id header)'}`);
