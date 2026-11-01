// Voiceover with Gemini TTS (same voice as the PDF Short), one file per script line.
// Usage: GEMINI_API_KEY=… node capture/vo-gemini.mjs en|hi [lineNumbers,comma]
//   en → SCRIPT-en.md → assets/vo-en/,  hi → SCRIPT.md → assets/vo-hi/
// AIza keys go to the Gemini Developer API; any other key (the production AQ. key) to Vertex AI express
// mode, like backend/app/routers/ai.py. TZ_FORCE=1 regenerates lines that already have a file.
import { readFileSync, mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const LANG = process.argv[2] === 'hi' ? 'hi' : 'en';
const ONLY = process.argv[3] ? new Set(process.argv[3].split(',').map(Number)) : null;
const OUT = ROOT + `assets/vo-${LANG}/`;
mkdirSync(OUT, { recursive: true });
const MODEL = process.env.TZ_TTS_MODEL || 'gemini-2.5-pro-preview-tts';
const VOICE = process.env.TZ_VOICE || 'Sulafat';
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('GEMINI_API_KEY not set');

const PERSONA = {
  en: 'You are a warm, friendly Indian woman in her late twenties, a teacher sitting beside the viewer and showing them how to build a test on screen. Speak natural, educated Indian English with a light Indian accent, relaxed and smiling, like explaining to a colleague. Never sound like a newsreader or an advert. Keep a smooth, even flow; take a short natural breath between steps and pause briefly at commas and full stops. Read on-screen product names (Create Test, Sy Pad, Insert, Save test) clearly.',
  hi: 'You are a warm, friendly Indian woman in her late twenties, a teacher (a "didi who teaches") sitting beside the viewer and showing them how to build a test on screen. Speak natural everyday Hindi with English product words said the way Indian teachers say them. Relaxed and smiling, never a newsreader or an advert. Keep a smooth, even flow; take a short natural breath between steps and pause briefly at commas and full stops. Say PDF as one quick "pee-dee-eff", JEE as "jay-ee-ee", Sy Pad as "sy pad".',
}[LANG];

const md = readFileSync(ROOT + (LANG === 'en' ? 'SCRIPT-en.md' : 'SCRIPT.md'), 'utf8');
const url = key.startsWith('AIza')
  ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  : `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent`;
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

const meta = [];
for (const block of md.split(/^## /m).slice(1)) {
  const n = Number(block.match(/^Line (\d+)/)?.[1]);
  // Paragraphs stay on their own lines: each is a step, and the voice breathes between them.
  const text = block.split('\n').filter((l) => l.startsWith('    ')).map((l) => l.trim()).join('\n')
    .replace(/TestoZa/g, 'Testoza');
  if (!n || !text) continue;
  const delivery = block.match(/\*\*Delivery:\*\*\s*(.+)/)?.[1] ?? '';
  const id = String(n).padStart(2, '0');
  const wav = `${OUT}line-${id}.wav`;
  writeFileSync(`${OUT}line-${id}.txt`, text, 'utf8');
  if ((!existsSync(wav) || process.env.TZ_FORCE) && (!ONLY || ONLY.has(n))) {
    const prompt = `${PERSONA}\nFor this part: ${delivery}\nRead the following aloud exactly as written, and say nothing else:\n\n${text}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
    };
    let data;
    for (let attempt = 1; attempt <= 4 && !data; attempt++) {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      data = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      if (!data) {
        console.error(`✗ line ${id} attempt ${attempt}: HTTP ${res.status} ${JSON.stringify(json.error ?? json).slice(0, 240)}`);
        if (res.status === 403) process.exit(1);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
    if (!data) process.exit(1);
    const rate = Number(/rate=(\d+)/.exec(data.mimeType)?.[1] ?? 24000);
    const pcm = `${OUT}line-${id}.pcm`;
    writeFileSync(pcm, Buffer.from(data.data, 'base64'));
    // Trim the silence the model leaves at either end; build.mjs places the gaps itself.
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', pcm,
      '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
      '-ar', '48000', wav]);
    unlinkSync(pcm);
  }
  if (!existsSync(wav)) continue;
  meta.push({ n, id, file: `assets/vo-${LANG}/line-${id}.wav`, duration: dur(wav), text });
  console.log(id, meta.at(-1).duration.toFixed(2) + 's');
}
writeFileSync(OUT + 'vo.json', JSON.stringify(meta, null, 2));
console.log('total', meta.reduce((s, m) => s + m.duration, 0).toFixed(1) + 's');
