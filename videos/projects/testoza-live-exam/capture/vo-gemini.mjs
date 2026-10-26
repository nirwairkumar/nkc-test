// Voiceover with Gemini TTS, one WAV per script line (## Lnn in SCRIPT-en.md), cues stripped.
// Usage: node capture/vo-gemini.mjs [L03,L08]            → assets/vo-en/Lnn.wav + vo.json
//        node capture/vo-gemini.mjs --sample Puck L03,L08 → samples/voice-Puck.wav (lines joined)
//        TZ_LANG=hi …                                     → SCRIPT-hi.md → assets/vo-hi/ (Hindi dub)
// Key: GEMINI_API_KEY from env, else read from backend/.env at runtime (never written anywhere).
// AIza keys → Gemini Developer API; others (the production AQ. key) → Vertex AI express mode.
import { readFileSync, mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { spokenHi } from './hindi.mjs';

const LANG = process.env.TZ_LANG === 'hi' ? 'hi' : 'en';
const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const args = process.argv.slice(2);
const sample = args[0] === '--sample' ? args[1] : null;
const ONLY = (sample ? args[2] : args[0])?.split(',').filter(Boolean);
const MODEL = process.env.TZ_TTS_MODEL || 'gemini-2.5-pro-preview-tts';
const VOICE = sample || process.env.TZ_VOICE || 'Puck';
const key = process.env.GEMINI_API_KEY
  || readFileSync(ROOT + '../../../backend/.env', 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim();
if (!key) throw new Error('GEMINI_API_KEY not found');

const PERSONA = LANG === 'hi'
  ? 'You are an energetic, confident Indian man in his early thirties, a popular Hindi YouTube ed-tech creator '
  + 'sitting beside a teacher and helping them run an online exam on screen. Speak natural everyday Hindi, the way Indian '
  + 'teachers and YouTubers really talk, with the English product words (Settings, Full Screen, Submit, WhatsApp, Excel…) '
  + 'said in clean Indian English. Upbeat, warm and smiling; punch the key words; keep a brisk, lively pace with short '
  + 'natural breaths between sentences. Never shout, never sound like a newsreader or a TV advert. Say टेस्टोज़ा as '
  + '"test-OH-zah", JEE as "jay-ee-ee", NEET as "neet".'
  : 'You are an energetic, confident Indian man in his early thirties, a popular YouTube ed-tech creator '
  + 'sitting beside an educator and helping them run an online exam on screen. Speak natural, educated Indian English with '
  + 'a light Indian accent. Upbeat, warm and smiling; punch the key words; keep a brisk, lively pace with short natural '
  + 'breaths between sentences. Never shout, never sound like a newsreader or a TV advert. Say "TestoZa" as "test-OH-zah".';

const md = readFileSync(ROOT + `SCRIPT-${LANG}.md`, 'utf8');
const lines = md.split(/^## /m).slice(1).map((block) => {
  const id = block.match(/^(L\d+)/)?.[1];
  const raw = block.split('\n').filter((l) => l.startsWith('    ')).map((l) => l.trim()).join('\n');
  const text = LANG === 'hi' ? spokenHi(raw)
    : raw.replace(/\{[a-z0-9]+\}/gi, '').replace(/[ \t]{2,}/g, ' ').replace(/TestoZa/g, 'Testoza').trim();
  const delivery = block.match(/\*\*Delivery:\*\*\s*(.+)/)?.[1] ?? '';
  return { id, raw, text, delivery };
}).filter((l) => l.id && l.text);

const url = key.startsWith('AIza')
  ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  : `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent`;
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

async function tts(text, delivery, wav) {
  const prompt = `${PERSONA}\n${delivery ? 'For this part: ' + delivery + '\n' : ''}Read the following aloud exactly as written, and say nothing else:\n\n${text}`;
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
      console.error(`✗ ${wav.split('/').pop()} attempt ${attempt}: HTTP ${res.status} ${JSON.stringify(json.error ?? json).slice(0, 240)}`);
      if (res.status === 403 || res.status === 401) process.exit(1);
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
  if (!data) process.exit(1);
  const rate = Number(/rate=(\d+)/.exec(data.mimeType)?.[1] ?? 24000);
  const pcm = wav.replace(/\.wav$/, '.pcm');
  writeFileSync(pcm, Buffer.from(data.data, 'base64'));
  // Trim the silence the model leaves at either end; the edit places gaps itself.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', pcm,
    '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
    '-ar', '48000', wav]);
  unlinkSync(pcm);
}

if (sample) {
  mkdirSync(ROOT + 'samples', { recursive: true });
  const pick = lines.filter((l) => ONLY.includes(l.id));
  const wav = `${ROOT}samples/voice-${VOICE}.wav`;
  await tts(pick.map((l) => l.text).join('\n\n'), pick[0].delivery, wav);
  console.log(VOICE, dur(wav).toFixed(1) + 's', wav);
} else {
  const OUT = ROOT + `assets/vo-${LANG}/`;
  mkdirSync(OUT, { recursive: true });
  const meta = [];
  for (const l of lines) {
    const wav = `${OUT}${l.id}.wav`;
    if ((!existsSync(wav) || process.env.TZ_FORCE) && (!ONLY || ONLY.includes(l.id))) {
      await tts(l.text, l.delivery, wav);
    }
    if (!existsSync(wav)) continue;
    writeFileSync(`${OUT}${l.id}.txt`, l.text, 'utf8');
    meta.push({ id: l.id, file: `assets/vo-${LANG}/${l.id}.wav`, duration: dur(wav), text: l.text, raw: l.raw });
    console.log(l.id, meta.at(-1).duration.toFixed(2) + 's');
  }
  writeFileSync(OUT + 'vo.json', JSON.stringify(meta, null, 2));
  console.log('total', meta.reduce((s, m) => s + m.duration, 0).toFixed(1) + 's', `voice ${VOICE}`);
}
