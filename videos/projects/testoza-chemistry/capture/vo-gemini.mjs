// Voiceover with Gemini TTS (voice Puck, as in testoza-live-exam), one WAV per script line
// (## Lnn in SCRIPT-en.md), cues stripped. Each clip is trimmed, gently compressed and levelled
// to the same loudness (the owner found the live-exam voice too quiet).
// Usage: node capture/vo-gemini.mjs [L03,L08]   → assets/vo-en/Lnn.raw.wav (TTS) + Lnn.wav (levelled) + vo.json
//        TZ_FORCE=1 asks the voice again · TZ_RELEVEL=1 re-levels from the kept .raw.wav (no API call)
// Key: GEMINI_API_KEY from env, else read from backend/.env at runtime (never written anywhere).
// AIza keys → Gemini Developer API; others (the production AQ. key) → Vertex AI express mode.
import { readFileSync, mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { spokenHi } from './hindi.mjs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const ONLY = process.argv[2]?.split(',').filter(Boolean);
const MODEL = process.env.TZ_TTS_MODEL || 'gemini-2.5-pro-tts';
const VOICE = process.env.TZ_VOICE || 'Puck';
const LUFS = -16;
const key = process.env.GEMINI_API_KEY
  || readFileSync(ROOT + '../../../backend/.env', 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim();
if (!key) throw new Error('GEMINI_API_KEY not found');

// TZ_LANG=hi → SCRIPT-hi.md → assets/vo-hi/ (the Hindi dub, same voice).
const LANG = process.env.TZ_LANG === 'hi' ? 'hi' : 'en';
const PERSONA = LANG === 'hi'
  ? 'You are an energetic, confident Indian man in his early thirties, a popular Hindi YouTube ed-tech creator '
  + 'sitting beside a chemistry teacher and showing them, on screen, how to type chemistry questions. Speak natural '
  + 'everyday Hindi the way Indian teachers and YouTubers really talk, with the English product and chemistry words '
  + '(Formula, Insert, arrow, Words, Match List, options…) said in clean Indian English. An attractive, warm, smiling '
  + 'voice; enthusiastic and engaging; smooth, flowing delivery with short natural breaths between sentences; punch the '
  + 'key words, a touch slower on formulas. Never shout, never sound like a newsreader or a TV advert. Read the '
  + 'Devanagari exactly as written, and say nothing that is not in the text.'
  : 'You are an energetic, confident Indian man in his early thirties, a popular YouTube ed-tech creator '
  + 'sitting beside a chemistry teacher and showing them, on screen, how to type chemistry questions. Speak natural, '
  + 'educated Indian English with a light Indian accent. Upbeat, warm and smiling; punch the key words; a lively pace '
  + 'with short natural breaths between sentences, a touch slower on formulas. Never shout, never sound like a '
  + 'newsreader or a TV advert. Say "TestoZa" as "test-OH-zah", "Sy Pad" as "sigh pad", "JEE" as "jay-ee-ee".';

// Spoken forms the voice needs (the script keeps readable text for captions).
const SPOKEN = [
  [/\bXeO2F2\b/g, 'X-e-O-two-F-two'], [/\bXeOF4\b/g, 'X-e-O-F-four'], [/\bXeO3\b/g, 'X-e-O-three'], [/\bXeF2\b/g, 'X-e-F-two'],
  [/\bBrF5\b/g, 'B-r-F-five'], [/\bNH3\b/g, 'N-H-three'], [/\bSF4\b/g, 'S-F-four'], [/\bI3 minus\b/g, 'I-three minus'],
  [/573 kelvin/g, 'five-seventy-three kelvin'], [/U-235/g, 'U two-thirty-five'], [/\bM n, B r\b/g, 'M, n, B, r'], [/\bK a, K b\b/g, 'K-a, K-b'],
];

const md = readFileSync(ROOT + `SCRIPT-${LANG}.md`, 'utf8');
const lines = md.split(/^## /m).slice(1).map((block) => {
  const id = block.match(/^(L\d+)/)?.[1];
  const raw = block.split('\n').filter((l) => l.startsWith('    ')).map((l) => l.trim()).join('\n');
  let text = raw.replace(/\{[a-z0-9]+\}/gi, '').replace(/[ \t]{2,}/g, ' ').replace(/TestoZa/g, 'Testoza').trim();
  if (LANG === 'hi') text = spokenHi(raw);
  else for (const [re, to] of SPOKEN) text = text.replace(re, to);
  const delivery = block.match(/\*\*Delivery:\*\*\s*(.+)/)?.[1] ?? '';
  return { id, raw, text, delivery };
}).filter((l) => l.id && l.text);

const url = key.startsWith('AIza')
  ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  // The global endpoint sometimes routes to asia-southeast1, which has no TTS model (404):
  // TZ_TTS_REGION=us-central1 pins a region.
  : `https://${process.env.TZ_TTS_REGION ? process.env.TZ_TTS_REGION + '-' : ''}aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent`;
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
/** Integrated loudness from ebur128's Summary block (its per-frame log also prints "I:"). */
const loud = (f) => {
  const err = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const v = Number(/I:\s+(-?[\d.]+) LUFS/.exec(err.slice(err.lastIndexOf('Summary:')))?.[1]);
  if (!Number.isFinite(v)) throw new Error('no loudness for ' + f);
  return v;
};

async function tts(text, delivery, wav) {
  const prompt = `${PERSONA}\n${delivery ? 'For this part: ' + delivery + '\n' : ''}Read the following aloud exactly as written, and say nothing else:\n\n${text}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
  };
  let data;
  for (let attempt = 1; attempt <= 7 && !data; attempt++) {
    // A dropped connection is retried like any other failed attempt.
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) })
      .catch((e) => ({ status: 0, json: async () => ({ error: String(e.cause?.code || e.message) }) }));
    const json = await res.json().catch(() => ({}));
    data = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (!data) {
      console.error(`✗ ${wav.split('/').pop()} attempt ${attempt}: HTTP ${res.status} ${JSON.stringify(json.error ?? json).slice(0, 240)}`);
      if (res.status === 403 || res.status === 401) process.exit(1);
      await new Promise((r) => setTimeout(r, res.status === 404 ? 1500 : 5000 * attempt));
    }
  }
  if (!data) process.exit(1);
  const rate = Number(/rate=(\d+)/.exec(data.mimeType)?.[1] ?? 24000);
  const pcm = wav.replace(/\.wav$/, '.pcm');
  writeFileSync(pcm, Buffer.from(data.data, 'base64'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', pcm, rawOf(wav)]);
  unlinkSync(pcm);
  level(wav);
}

const rawOf = (wav) => wav.replace(/\.wav$/, '.raw.wav');
/** Raw TTS → the clip the edit uses. Trim the silence the model leaves at either end (the edit
 *  places gaps itself), clean the low end, compress lightly and level every clip to LUFS. */
function level(wav) {
  const tmp = wav.replace(/\.wav$/, '.tmp.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', rawOf(wav),
    '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
      + 'highpass=f=75,acompressor=threshold=-22dB:ratio=3:attack=8:release=140:makeup=1',
    '-ar', '48000', tmp]);
  const gain = LUFS - loud(tmp);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false`, '-ar', '48000', wav]);
  unlinkSync(tmp);
}

const OUT = ROOT + `assets/vo-${LANG}/`;
mkdirSync(OUT, { recursive: true });
const meta = [];
for (const l of lines) {
  const wav = `${OUT}${l.id}.wav`;
  const want = !ONLY || ONLY.includes(l.id);
  if (want && (!existsSync(rawOf(wav)) || process.env.TZ_FORCE)) await tts(l.text, l.delivery, wav);
  else if (want && process.env.TZ_RELEVEL && existsSync(rawOf(wav))) level(wav);
  if (!existsSync(wav)) continue;
  writeFileSync(`${OUT}${l.id}.txt`, l.text, 'utf8');
  meta.push({ id: l.id, file: `assets/vo-${LANG}/${l.id}.wav`, duration: dur(wav), text: l.text, raw: l.raw });
  console.log(l.id, meta.at(-1).duration.toFixed(2) + 's');
}
writeFileSync(OUT + 'vo.json', JSON.stringify(meta, null, 2));
console.log('total', meta.reduce((s, m) => s + m.duration, 0).toFixed(1) + 's', `voice ${VOICE}`);
