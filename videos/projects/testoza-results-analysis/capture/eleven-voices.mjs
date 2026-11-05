// Pick the voice: list candidate voices, then voice the same short passage in each so the owner can
// listen side by side. Key from env only.
// Usage: ELEVEN_API_KEY=… node capture/eleven-voices.mjs list            (account voices + Indian male voices in the library)
//        ELEVEN_API_KEY=… node capture/eleven-voices.mjs sample <id,id,…> (→ assets/voice-samples/<name>.mp3)
//        ELEVEN_API_KEY=… node capture/eleven-voices.mjs add <public_owner_id> <voice_id> <name>  (library voice → My Voices)
import './env.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const KEY = process.env.ELEVEN_API_KEY;
if (!KEY) throw new Error('set ELEVEN_API_KEY');
const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const H = { 'xi-api-key': KEY, 'content-type': 'application/json' };
const get = async (path) => { const r = await fetch('https://api.elevenlabs.io' + path, { headers: H }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); };
// Two lines from the script: warm (cold open) and explaining (Q13).
const PASSAGE = 'Sunday night. Forty-eight answer sheets from this morning\'s mock test. One red pen. And a cup of chai that went cold an hour ago. '
  + 'Now, honestly, the most useful card on the whole page: Teach these again. Click Q 13. The answer is twenty-eight. But look: fifty-four percent picked thirty. They simply added the two discounts.';

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'list') {
  const mine = await get('/v1/voices');
  console.log('── Your voices');
  for (const v of mine.voices) console.log(`${v.voice_id}  ${v.name}  ${JSON.stringify(v.labels || {})}`);
  const lib = await get('/v1/shared-voices?page_size=40&gender=male&language=en&accent=indian&sort=trending');
  console.log('\n── Library: Indian English, male (trending)');
  for (const v of lib.voices) console.log(`${v.voice_id}  owner ${v.public_owner_id}  ${v.name}  [${v.age || '?'}] ${v.use_case || ''} — ${(v.description || '').replace(/\s+/g, ' ').slice(0, 110)}`);
} else if (cmd === 'sample') {
  const out = ROOT + 'assets/voice-samples/';
  mkdirSync(out, { recursive: true });
  const names = Object.fromEntries((await get('/v1/voices')).voices.map((v) => [v.voice_id, v.name]));
  for (const id of args[0].split(',')) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ text: PASSAGE, model_id: process.env.ELEVEN_MODEL || 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true } }),
    });
    if (!r.ok) { console.error(id, r.status, (await r.text()).slice(0, 200)); continue; }
    const model = process.env.ELEVEN_MODEL || 'eleven_multilingual_v2';
    const file = `${out}${(names[id] || id).replace(/[^a-z0-9]+/gi, '-')}${model === 'eleven_v3' ? '-v3' : ''}.mp3`;
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    console.log('sample', file);
  }
} else if (cmd === 'add') {
  const [owner, id, name] = args;
  const r = await fetch(`https://api.elevenlabs.io/v1/voices/add/${owner}/${id}`, { method: 'POST', headers: H, body: JSON.stringify({ new_name: name }) });
  console.log(r.status, await r.text());
} else console.log('list | sample <ids> | add <owner> <id> <name>');
