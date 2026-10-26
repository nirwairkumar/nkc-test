// QA for a dub voice: all clips joined (with a spoken-free 0.8 s gap) and checked by Gemini against
// the script, line by line. Usage: GEMINI_API_KEY=… node capture/qa-dub.mjs <lang> → capture/qa-<lang>.txt
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const LANG = process.argv[2];
const NAME = { hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam' }[LANG];
const vo = JSON.parse(readFileSync(ROOT + `assets/vo-${LANG}/vo.json`, 'utf8'));
const list = vo.map((v) => `file '${ROOT}${v.file}'\nfile '${ROOT}capture/probe/gap.wav'`).join('\n');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '0.8', ROOT + 'capture/probe/gap.wav']);
writeFileSync(ROOT + `capture/probe/qa-${LANG}.txt`, list);
const mp3 = ROOT + `capture/probe/qa-${LANG}.mp3`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', ROOT + `capture/probe/qa-${LANG}.txt`, '-ac', '1', '-b:a', '48k', mp3]);
const script = vo.map((v, i) => `${i + 1} (${v.id}): ${v.text}`).join('\n');
const prompt = `This audio is ${vo.length} ${NAME} voice-over lines for a YouTube video, in order, separated by short silences. The speaker mixes ${NAME} with English product words (that is intended). Here is the exact script of each line:\n\n${script}\n\nCheck every line against its script. List ONLY the lines with a real problem: a missing or added word or phrase, a garbled or wrongly pronounced word, English read in the wrong way (e.g. "Testoza" or "testoza dot com" said wrongly), wrong language, cut-off ending, or odd long pause. Format: "Lnn: problem". If a line is fine, do not mention it. Be strict but do not invent problems.`;
const parts = [{ text: prompt }, { inlineData: { mimeType: 'audio/mpeg', data: readFileSync(mp3).toString('base64') } }];
let json;
for (let a = 1; a <= 6; a++) {
  const res = await fetch('https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-3.5-flash:generateContent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body: JSON.stringify({ contents: [{ role: 'user', parts }] }) });
  json = await res.json();
  if (res.ok) break;
  await new Promise((r) => setTimeout(r, 4000 * a));
}
const out = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? JSON.stringify(json).slice(0, 400);
writeFileSync(ROOT + `capture/qa-${LANG}.txt`, out);
console.log(`== ${LANG}\n${out}`);
