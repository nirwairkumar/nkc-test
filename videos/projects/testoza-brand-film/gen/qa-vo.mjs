// QA a voice take: speech-to-text (ElevenLabs Scribe) against the script, and the gaps between sentences.
//   node gen/qa-vo.mjs gen/vo/take-s11
import fs from 'node:fs';
import path from 'node:path';
const base = process.argv[2];
const KEY = fs.readFileSync(path.resolve('../../.env'), 'utf8').match(/^ELEVEN_API_KEY=(.*)$/m)[1].trim();
const take = JSON.parse(fs.readFileSync(`${base}.json`, 'utf8'));
const norm = s => s.toLowerCase().replace(/\[[^\]]*\]/g, ' ').replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const form = new FormData();
form.append('model_id', 'scribe_v1');
form.append('file', new Blob([fs.readFileSync(`${base}.mp3`)], { type: 'audio/mpeg' }), 'take.mp3');
const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': KEY }, body: form });
const stt = await res.json();
if (!res.ok) { console.log('STT failed', JSON.stringify(stt).slice(0, 300)); process.exit(1); }
const want = norm(take.text), got = norm(stt.text);
// word-level edit distance with the ops listed
const d = Array.from({ length: want.length + 1 }, (_, i) => [i, ...Array(got.length).fill(0)]);
for (let j = 1; j <= got.length; j++) d[0][j] = j;
for (let i = 1; i <= want.length; i++) for (let j = 1; j <= got.length; j++)
  d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (want[i - 1] === got[j - 1] ? 0 : 1));
const ops = []; let i = want.length, j = got.length;
while (i > 0 || j > 0) {
  if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (want[i - 1] === got[j - 1] ? 0 : 1)) { if (want[i - 1] !== got[j - 1]) ops.push(`"${want[i - 1]}"→"${got[j - 1]}"`); i--; j--; }
  else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { ops.push(`missing "${want[i - 1]}"`); i--; }
  else { ops.push(`extra "${got[j - 1]}"`); j--; }
}
// sentence gaps from the TTS alignment (tags dropped)
const words = take.words.filter(w => !/^\[|\]$/.test(w.w));
const gaps = [];
for (let k = 1; k < words.length; k++) { const g = words[k].start - words[k - 1].end; if (g > 0.35) gaps.push(`${words[k - 1].w}|${words[k].w} ${g.toFixed(2)}`); }
console.log(`${path.basename(base)}: WER ${(d[want.length][got.length] / want.length * 100).toFixed(1)}%  ${ops.reverse().join(', ') || 'exact'}`);
console.log(`  gaps>0.35s: ${gaps.join('  ')}`);
