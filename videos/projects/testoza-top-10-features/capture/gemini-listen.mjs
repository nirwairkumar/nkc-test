// Ask gemini-2.5-pro to listen to audio files and answer a prompt (judging voices, checking mixes).
// node capture/gemini-listen.mjs "<prompt>" a.wav b.wav ...   (GEMINI_API_KEY from env, Vertex for AQ. keys)
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
const [prompt, ...files] = process.argv.slice(2);
const key = process.env.GEMINI_API_KEY;
const parts = [{ text: prompt }];
for (const f of files) {
  parts.push({ text: `File: ${basename(f)}` });
  parts.push({ inlineData: { mimeType: f.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav', data: readFileSync(f).toString('base64') } });
}
const model = process.env.MODEL || 'gemini-2.5-pro';
const url = key.startsWith('AIza')
  ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  : `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`;
let json;
for (let attempt = 1; attempt <= 8; attempt++) { // Vertex sometimes 404s the model for a moment
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ role: 'user', parts }] }) });
  json = await res.json();
  if (res.status !== 404 && res.status < 500) break;
  await new Promise((r) => setTimeout(r, 5000 * attempt));
}
console.log(json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? JSON.stringify(json).slice(0, 600));
