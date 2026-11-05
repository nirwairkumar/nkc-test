// Stills for the brand film: Gemini 3 Pro Image ("Nano Banana Pro") on Vertex.
// The key comes from the environment only (GK) and is never written to disk.
//
//   GK=... node gen/img.mjs <shotId> [--size 4K] [--n 1] [--ref id,id] [--from file]
//
// Prompts live in gen/shots.mjs. --ref adds earlier stills (by shot id, newest take)
// or character sheets as reference images; --from edits a given still.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOTS, LOOK, CAST } from './shots.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'img');
fs.mkdirSync(OUT, { recursive: true });

const KEY = process.env.GK;
if (!KEY) { console.error('GK (Vertex API key) is not set'); process.exit(1); }
const PROJECT = '264800752296';
const MODEL = process.env.IMG_MODEL || 'gemini-3-pro-image';
const URL = `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/${MODEL}:generateContent?key=${KEY}`;

const args = process.argv.slice(2);
const id = args[0];
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i > -1 ? args[i + 1] : dflt; };
const size = opt('size', '2K');
const n = Number(opt('n', '1'));
const refs = (opt('ref', '') || '').split(',').filter(Boolean);
const from = opt('from', '');

const shot = SHOTS[id];
if (!shot) { console.error(`no shot "${id}" in shots.mjs`); process.exit(1); }

// newest take of a shot id, or a file path
function resolveRef(r) {
  if (fs.existsSync(r)) return r;
  const takes = fs.readdirSync(OUT).filter(f => f.startsWith(`${r}-v`) && f.endsWith('.png')).sort((a, b) => takeNo(a) - takeNo(b));
  if (!takes.length) throw new Error(`no take for ref "${r}"`);
  return path.join(OUT, takes.at(-1));
}
const takeNo = f => Number(f.match(/-v(\d+)\.png$/)?.[1] || 0);
function nextTake() {
  const takes = fs.readdirSync(OUT).filter(f => f.startsWith(`${id}-v`) && f.endsWith('.png'));
  return takes.reduce((m, f) => Math.max(m, takeNo(f)), 0) + 1;
}
const part = file => ({ inlineData: { mimeType: file.endsWith('.png') ? 'image/png' : 'image/jpeg', data: fs.readFileSync(file).toString('base64') } });

const castRefs = (shot.cast || []).map(c => CAST[c].ref).filter(Boolean);
const refFiles = [...(from ? [from] : []), ...castRefs, ...refs].map(resolveRef);
const castText = (shot.cast || []).map(c => CAST[c].text).join(' ');
const prompt = [shot.prompt, castText, shot.noLook ? '' : LOOK].filter(Boolean).join('\n\n');

async function once() {
  const body = {
    contents: [{ role: 'user', parts: [...refFiles.map(part), { text: prompt }] }],
    generationConfig: {
      // imageSize is ignored (1K out, 4K billed) unless the response is image-only
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: shot.aspect || '16:9', imageSize: size },
    },
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) {
      console.error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
      if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 15000 * attempt)); continue; }
      process.exit(1);
    }
    const parts = json.candidates?.[0]?.content?.parts || [];
    const img = parts.find(p => p.inlineData?.data);
    const text = parts.filter(p => p.text).map(p => p.text).join(' ').trim();
    if (!img) {
      console.error(`no image (finish: ${json.candidates?.[0]?.finishReason}) ${text.slice(0, 300)}`);
      if (attempt < 4) continue;
      process.exit(1);
    }
    const take = nextTake();
    const file = path.join(OUT, `${id}-v${take}.png`);
    fs.writeFileSync(file, Buffer.from(img.inlineData.data, 'base64'));
    fs.writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify({ id, take, model: MODEL, size, refs: refFiles.map(f => path.basename(f)), prompt, note: text, usage: json.usageMetadata }, null, 2));
    console.log(`${path.relative(process.cwd(), file)}  ${text ? '— ' + text.slice(0, 120) : ''}`);
    return;
  }
}

for (let i = 0; i < n; i++) await once();
