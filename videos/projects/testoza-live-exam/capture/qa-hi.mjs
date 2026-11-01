// QA for the Hindi voice: Gemini transcribes each clip back, printed under the script line with a
// rough match score (Devanagari letters only), so skipped, doubled or misread words stand out.
// Usage: node capture/qa-hi.mjs [L03,L08]   (key as in vo-gemini.mjs)
import { readFileSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const ONLY = process.argv[2]?.split(',');
const key = process.env.GEMINI_API_KEY
  || readFileSync(ROOT + '../../../backend/.env', 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim();
const MODEL = 'gemini-2.5-flash';
const url = key.startsWith('AIza')
  ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  : `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent`;
const VO = JSON.parse(readFileSync(ROOT + 'assets/vo-hi/vo.json', 'utf8'));

const deva = (s) => [...s.replace(/[^ऀ-ॿ]/g, '').replace(/[़।॥]/g, '')];
function similarity(a, b) {
  const x = deva(a), y = deva(b);
  const D = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) D[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) {
    D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  }
  return 1 - D[x.length][y.length] / Math.max(1, x.length, y.length);
}

for (const v of VO) {
  if (ONLY && !ONLY.includes(v.id)) continue;
  const audio = readFileSync(ROOT + v.file).toString('base64');
  const body = { contents: [{ role: 'user', parts: [
    { inlineData: { mimeType: 'audio/wav', data: audio } },
    { text: 'Transcribe this Hindi speech exactly as spoken, word for word, nothing added or corrected. Write Hindi words in Devanagari and English words in Latin script. Output only the transcript.' },
  ] }], generationConfig: { temperature: 0 } };
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
  const json = await res.json();
  const heard = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() ?? `ERROR ${res.status} ${JSON.stringify(json.error ?? json).slice(0, 200)}`;
  const s = similarity(v.text, heard);
  console.log(`${v.id} ${(s * 100).toFixed(0)}%${s < 0.9 ? '  ← CHECK' : ''}\n  script: ${v.text.replace(/\n/g, ' ')}\n  heard:  ${heard.replace(/\n/g, ' ')}`);
}
