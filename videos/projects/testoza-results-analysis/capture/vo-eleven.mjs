// Voiceover with ElevenLabs: one WAV per script line (## Lnn in SCRIPT-en.md), cues stripped. Word
// timings come from the API's own character alignment (/with-timestamps), so every {cue} is exact.
// Each clip is trimmed to its speech (timings shifted with it), cleaned, lightly compressed and levelled.
// Usage: ELEVEN_API_KEY=… ELEVEN_VOICE=<voice id> [TZ_LANG=hi] node capture/vo-eleven.mjs [L03,L08]
//   TZ_LANG        en (default, SCRIPT-en.md → assets/vo-en) | hi (SCRIPT-hi.md → assets/vo-hi, the dub)
//   ELEVEN_MODEL   eleven_multilingual_v2 (default, steadiest) | eleven_v3 (most expressive, no stitching)
//   ELEVEN_SPEED   0.7–1.2 (default 1.0)   ELEVEN_STABILITY / ELEVEN_STYLE (defaults 0.45 / 0.25)
//   TZ_FORCE=1 asks the voice again · TZ_RELEVEL=1 re-levels from the kept .raw.mp3 (no API call)
// Key: env only, never written anywhere.
import './env.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { lines as scriptLines } from './script.mjs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const LANG = process.env.TZ_LANG || 'en';
const OUT = ROOT + `assets/vo-${LANG}/`;
const ONLY = process.argv[2]?.split(',').filter(Boolean);
const KEY = process.env.ELEVEN_API_KEY, VOICE = process.env.ELEVEN_VOICE;
const MODEL = process.env.ELEVEN_MODEL || 'eleven_multilingual_v2';
const SETTINGS = {
  stability: Number(process.env.ELEVEN_STABILITY ?? 0.45),
  similarity_boost: 0.8,
  style: Number(process.env.ELEVEN_STYLE ?? 0.25),
  use_speaker_boost: true,
  speed: Number(process.env.ELEVEN_SPEED ?? 1.0),
};
const LUFS = -16;
if (!process.env.TZ_RELEVEL && (!KEY || !VOICE)) throw new Error('set ELEVEN_API_KEY and ELEVEN_VOICE');
mkdirSync(OUT, { recursive: true });

const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const loud = (f) => {
  const err = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const v = Number(/I:\s+(-?[\d.]+) LUFS/.exec(err.slice(err.lastIndexOf('Summary:')))?.[1]);
  if (!Number.isFinite(v)) throw new Error('no loudness for ' + f);
  return v;
};
// How the voice should say a few words (the script stays readable; only the spoken text changes).
const SAY = LANG === 'en' ? [[/\bQ(\d+)\b/g, 'Q $1']] : [];
const spoken = (t) => SAY.reduce((s, [a, b]) => s.replace(a, b), t);

/** Characters + times → words with start/end (seconds into the raw clip). */
function words(al) {
  const out = [];
  let cur = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = null; } return; }
    if (!cur) cur = { text: '', start: al.character_start_times_seconds[i], end: 0 };
    cur.text += ch;
    cur.end = al.character_end_times_seconds[i];
  });
  if (cur) out.push(cur);
  return out;
}

async function tts(line, prev, next) {
  const body = { text: spoken(line.text), model_id: MODEL, voice_settings: SETTINGS, apply_text_normalization: 'auto' };
  if (MODEL !== 'eleven_v3') { if (prev) body.previous_text = spoken(prev.text); if (next) body.next_text = spoken(next.text); }
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json' }, body: JSON.stringify(body),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e.cause?.code || e.message) }));
    if (res.ok) {
      const j = await res.json();
      writeFileSync(`${OUT}${line.id}.raw.mp3`, Buffer.from(j.audio_base64, 'base64'));
      writeFileSync(`${OUT}${line.id}.align.json`, JSON.stringify(j.alignment));
      return;
    }
    const msg = (await res.text()).slice(0, 300);
    console.error(`✗ ${line.id} attempt ${attempt}: HTTP ${res.status} ${msg}`);
    if ([400, 401, 402, 403, 422].includes(res.status)) process.exit(1);
    await new Promise((r) => setTimeout(r, 4000 * attempt));
  }
  process.exit(1);
}

/** Raw clip → the clip the edit uses: cut to the speech (+ a short tail), clean, compress, level; shift the word times. */
function level(line) {
  const raw = `${OUT}${line.id}.raw.mp3`, wav = `${OUT}${line.id}.wav`, tmp = `${OUT}${line.id}.tmp.wav`;
  const ws = words(JSON.parse(readFileSync(`${OUT}${line.id}.align.json`, 'utf8')));
  const a = Math.max(0, ws[0].start - 0.06), b = Math.min(dur(raw), ws.at(-1).end + 0.3);
  // The alignment folds trailing silence into the last word (up to 1.6 s): cut the tail at the end of
  // the speech itself, keeping 0.15 s; the edit places its own gap between lines.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af',
    `atrim=${a.toFixed(3)}:${b.toFixed(3)},asetpts=PTS-STARTPTS,areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.15,areverse,`
      + 'highpass=f=70,acompressor=threshold=-21dB:ratio=2.5:attack=10:release=160:makeup=1',
    '-ar', '48000', '-ac', '1', tmp]);
  const len = dur(tmp);
  const gain = LUFS - loud(tmp);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false,afade=t=out:st=${(len - 0.06).toFixed(3)}:d=0.06`, '-ar', '48000', wav]);
  try { unlinkSync(tmp); } catch { /* Windows may hold it a moment */ }
  writeFileSync(`${OUT}${line.id}.words.json`, JSON.stringify(ws.map((w, i) => ({ id: `w${i}`, text: w.text, start: +Math.min(w.start - a, len - 0.1).toFixed(3), end: +Math.min(w.end - a, len).toFixed(3) })), null, 1));
}

const all = scriptLines(`SCRIPT-${LANG}.md`);
for (const [i, line] of all.entries()) {
  if (ONLY && !ONLY.includes(line.id)) continue;
  const have = existsSync(`${OUT}${line.id}.raw.mp3`) && existsSync(`${OUT}${line.id}.align.json`);
  if (!have || process.env.TZ_FORCE) { await tts(line, all[i - 1], all[i + 1]); console.log('voiced', line.id); }
  level(line);
}
// Lines not voiced yet keep their placeholder entry (vo-fake.mjs), so the edit still builds.
const old = existsSync(OUT + 'vo.json') ? Object.fromEntries(JSON.parse(readFileSync(OUT + 'vo.json', 'utf8')).map((v) => [v.id, v])) : {};
const meta = all.map((l) => {
  if (!existsSync(`${OUT}${l.id}.raw.mp3`)) return old[l.id];
  writeFileSync(`${OUT}${l.id}.txt`, l.text, 'utf8');
  return { id: l.id, file: `assets/vo-${LANG}/${l.id}.wav`, duration: dur(`${OUT}${l.id}.wav`), text: l.text, raw: l.raw };
}).filter(Boolean);
writeFileSync(OUT + 'vo.json', JSON.stringify(meta, null, 2));
const real = meta.filter((m) => !m.placeholder);
console.log(`${real.length}/${all.length} lines voiced · ${real.reduce((s, m) => s + m.duration, 0).toFixed(1)} s · model ${MODEL} · voice ${VOICE}`);
if (real.length < all.length) console.log('still placeholder:', meta.filter((m) => m.placeholder).map((m) => m.id).join(' '));
