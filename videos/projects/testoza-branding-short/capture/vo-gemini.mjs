// Voiceover with Gemini TTS (voice Puck), one WAV per script line (## Lnn in SCRIPT-<lang>.md), cues
// stripped (forked from testoza-chemistry). Each clip is trimmed, gently compressed and levelled to
// the same loudness.
// Usage: TZ_LANG=en|hi|ta|te|kn|ml node capture/vo-gemini.mjs [L03,L08]
//          → assets/vo-<lang>/Lnn.raw.wav (TTS) + Lnn.wav (levelled) + vo.json
//        TZ_FORCE=1 asks the voice again · TZ_RELEVEL=1 re-levels from the kept .raw.wav (no API call)
// Key: GEMINI_API_KEY from env only (never written anywhere). AQ. keys → Vertex AI (us-central1:
// the global endpoint can route to a region without the TTS model).
import { readFileSync, mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const ONLY = process.argv[2]?.split(',').filter(Boolean);
const MODEL = process.env.TZ_TTS_MODEL || 'gemini-2.5-pro-tts';
const VOICE = process.env.TZ_VOICE || 'Puck';
const LUFS = -16;
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('GEMINI_API_KEY not set');

const LANG = process.env.TZ_LANG || 'en';
const NAME = { en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam' }[LANG];
if (!NAME) throw new Error('unknown TZ_LANG ' + LANG);
const CREATOR = 'You are a 24-year-old Indian man, a popular YouTube ed-tech creator, recording a fast YouTube Short '
  + 'that shows teachers how to put their institute\'s logo and name on an online test. Smooth, trustworthy and '
  + 'warm, full of energy and genuine enthusiasm — smiling as you speak; punch the key words; a quick, lively, '
  + 'flowing pace with short natural breaths. Never shout, never sound like a newsreader or a TV advert. ';
const PERSONA = LANG === 'en'
  ? CREATOR + 'Speak natural, educated Indian English with a light Indian accent. Say "TestoZa" as "test-OH-zah", '
    + '"Sy Pad" as "sigh pad", "JEE" as "jay-ee-ee", "SSC" as "ess-ess-see".'
  : CREATOR + `Speak natural everyday ${NAME}, the way teachers and YouTubers from that state really talk, with the `
    + 'English product words (button names, Excel, WhatsApp, PDF, AI) said in clean Indian English. Read the text '
    + 'exactly as written in its own script, and say nothing that is not in the text. "Testoza" is "test-OH-zah".';

const md = readFileSync(ROOT + `SCRIPT-${LANG}.md`, 'utf8');
const lines = md.split(/^## /m).slice(1).map((block) => {
  const id = block.match(/^(L\d+)/)?.[1];
  const raw = block.split('\n').filter((l) => l.startsWith('    ')).map((l) => l.trim()).join('\n');
  const text = raw.replace(/\{[a-z0-9]+\}/gi, '').replace(/[ \t]{2,}/g, ' ').replace(/TestoZa/g, 'Testoza').trim();
  const delivery = block.match(/\*\*Delivery:\*\*\s*(.+)/)?.[1] ?? '';
  return { id, raw, text, delivery };
}).filter((l) => l.id && l.text);

const url = key.startsWith('AIza')
  ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  : `https://${process.env.TZ_TTS_REGION || 'us-central1'}-aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent`;
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
  await rmQuiet(pcm);
  level(wav);
}

/** Windows (antivirus) can hold a fresh file for a moment: retry, and never fail the run over a temp file. */
async function rmQuiet(f) {
  for (let i = 0; i < 6; i++) {
    try { unlinkSync(f); return; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
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
  try { unlinkSync(tmp); } catch { /* held by Windows for a moment; ffmpeg -y overwrites it next time */ }
}

const OUT = ROOT + `assets/vo-${LANG}/`;
mkdirSync(OUT, { recursive: true });
const meta = [];
// A few lines at a time: Vertex takes parallel calls, and 32 one-by-one calls take ~10 minutes.
const want = lines.filter((l) => (!ONLY || ONLY.includes(l.id)));
for (let i = 0; i < want.length; i += 4) {
  await Promise.all(want.slice(i, i + 4).map(async (l) => {
    const wav = `${OUT}${l.id}.wav`;
    if (!existsSync(rawOf(wav)) || process.env.TZ_FORCE) await tts(l.text, l.delivery, wav);
    else if (process.env.TZ_RELEVEL) level(wav);
  }));
}
for (const l of lines) {
  const wav = `${OUT}${l.id}.wav`;
  if (!existsSync(wav)) continue;
  writeFileSync(`${OUT}${l.id}.txt`, l.text, 'utf8');
  meta.push({ id: l.id, file: `assets/vo-${LANG}/${l.id}.wav`, duration: dur(wav), text: l.text, raw: l.raw });
  console.log(l.id, meta.at(-1).duration.toFixed(2) + 's');
}
writeFileSync(OUT + 'vo.json', JSON.stringify(meta, null, 2));
console.log('total', meta.reduce((s, m) => s + m.duration, 0).toFixed(1) + 's', `voice ${VOICE}`);
