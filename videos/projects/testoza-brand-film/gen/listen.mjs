// Ask Gemini (Vertex, global) to listen to or watch media files and answer a prompt.
// I can't hear; this is the ear. GK comes from the environment only.
//
//   GK=... node gen/listen.mjs --prompt "..." [--json] file1 [file2 ...]
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GK;
if (!KEY) { console.error('GK (Vertex API key) is not set'); process.exit(1); }
const MODEL = process.env.LISTEN_MODEL || 'gemini-3.5-flash';
const URL = `https://aiplatform.googleapis.com/v1/projects/264800752296/locations/global/publishers/google/models/${MODEL}:generateContent?key=${KEY}`;

const args = process.argv.slice(2);
const pi = args.indexOf('--prompt');
const prompt = args[pi + 1];
const asJson = args.includes('--json');
const files = args.filter((a, i) => i !== pi && i !== pi + 1 && a !== '--json');

const MIME = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const parts = [];
for (const f of files) {
  parts.push({ text: `File "${path.basename(f)}":` });
  parts.push({ inlineData: { mimeType: MIME[path.extname(f).toLowerCase()], data: fs.readFileSync(f).toString('base64') } });
}
parts.push({ text: prompt });

const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.2, ...(asJson ? { responseMimeType: 'application/json' } : {}) } };
for (let attempt = 1; attempt <= 4; attempt++) {
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 10000 * attempt)); continue; }
    process.exit(1);
  }
  console.log((json.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim());
  break;
}
