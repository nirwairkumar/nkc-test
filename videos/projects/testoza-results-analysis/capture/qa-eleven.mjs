// QA for a dub track: ElevenLabs speech-to-text hears every clip back (Hindi included) and the lines
// whose words differ from the script are listed. Numbers are left out of the comparison (the
// transcript writes "54%" where the script says चौवन percent).
// Usage: node capture/qa-eleven.mjs hi [L03,L08]   → assets/vo-<lang>/qa/Lnn.txt + a report
import './env.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const LANG = process.argv[2] || 'hi', ONLY = process.argv[3]?.split(',');
const VO = `${ROOT}assets/vo-${LANG}/`, QA = VO + 'qa/';
mkdirSync(QA, { recursive: true });
const CODE = { hi: 'hin', en: 'eng' }[LANG];
const NUM = /^(एक|दो|तीन|चार|पाँच|छह|सात|आठ|नौ|दस|ग्यारह|बारह|तेरह|चौदह|पंद्रह|उन्नीस|बीस|बाईस|अट्ठाईस|तीस|तैंतीस|चालीस|उनतालीस|बावन|चौवन|अड़तालीस|छियालीस|पचास|सत्तावन|सत्तर|पचहत्तर|चौवालीस|चौरानवे|इक्कीस|अठारह|सौ|साठ|शून्य|zero|percent|प्रतिशत|माइनस)$/i;
const toks = (s) => s.replace(/\{[a-z0-9]+\}/gi, '').toLowerCase().split(/[\s,.;:!?…—–।"'()-]+/).filter((w) => w && !/\d/.test(w) && !NUM.test(w));
function dist(a, b) {
  const D = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) D[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return D[a.length][b.length];
}
for (const line of JSON.parse(readFileSync(VO + 'vo.json', 'utf8'))) {
  if (ONLY && !ONLY.includes(line.id)) continue;
  const out = `${QA}${line.id}.txt`;
  if (!existsSync(out)) {
    const fd = new FormData();
    fd.append('model_id', 'scribe_v1');
    if (CODE) fd.append('language_code', CODE);
    fd.append('file', new Blob([readFileSync(`${VO}${line.id}.raw.mp3`)], { type: 'audio/mpeg' }), `${line.id}.mp3`);
    const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': process.env.ELEVEN_API_KEY }, body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(`${line.id}: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    writeFileSync(out, j.text, 'utf8');
  }
  const heard = readFileSync(out, 'utf8');
  const a = toks(line.text), b = toks(heard), d = dist(a, b);
  const flag = d > Math.max(3, a.length * 0.12) ? '  ⚠ CHECK' : '';
  console.log(`${line.id}  words ${a.length}  diff ${d}${flag}${flag ? `\n   script: ${line.text}\n   heard:  ${heard}` : ''}`);
}
