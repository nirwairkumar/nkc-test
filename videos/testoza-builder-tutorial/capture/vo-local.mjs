// Full Hindi voiceover with the free offline voice (Kokoro hf_alpha), one file per SCRIPT.md line.
// Kokoro's Hindi phonemiser can't read Latin words inside Hindi, so English product words are
// spelled in Devanagari for the voice only (captions stay English). Owner chose this on 2026-10-15
// after the HeyGen free allowance ran out.
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const OUT = ROOT + 'assets/vo-local/';
mkdirSync(OUT, { recursive: true });
const VOICE = process.env.TZ_VOICE || 'hf_alpha';

// Longest first, so "Maths & symbols" wins over "Maths".
const SAY = [
  ['Goes into Question 4', 'गोज़ इनटू क्वेश्चन फ़ोर'], ['Split into sections', 'स्प्लिट इनटू सेक्शन्स'], ['Split section here', 'स्प्लिट सेक्शन हियर'],
  ['New question here', 'न्यू क्वेश्चन हियर'], ['Add a new section', 'ऐड अ न्यू सेक्शन'], ['Institution branding', 'इंस्टीट्यूशन ब्रांडिंग'],
  ['Only my students', 'ओनली माय स्टूडेंट्स'], ['Numerical answer', 'न्यूमेरिकल आंसर'], ['Maths & symbols', 'मैथ्स एंड सिंबल्स'],
  ['Match the list', 'मैच द लिस्ट'], ['None of these', 'नन ऑफ़ दीज़'], ['JEE Main Mini Mock', 'जे ई ई मेन मिनी मॉक'], ['JEE / NEET', 'जे ई ई या नीट'],
  ['JEE Main', 'जे ई ई मेन'], ['Create Test', 'क्रिएट टेस्ट'], ['Add question', 'ऐड क्वेश्चन'], ['Question type', 'क्वेश्चन टाइप'],
  ['Exact value', 'एग्ज़ैक्ट वैल्यू'], ['Match List', 'मैच लिस्ट'], ['Save test', 'सेव टेस्ट'], ['My Tests', 'माय टेस्ट्स'],
  ['Section A', 'सेक्शन ए'], ['square root', 'स्क्वेयर रूट'], ['x square dx', 'एक्स स्क्वेयर डी एक्स'], ['x square', 'एक्स स्क्वेयर'],
  ['Control V', 'कंट्रोल वी'], ['testoza.com', 'टेस्टोज़ा डॉट कॉम'], ['e k, p a t t h a r', 'ई के, पी ए टी टी एच ए आर'], ['f x', 'एफ़ एक्स'],
  ['TestoZa', 'टेस्टोज़ा'], ['Sy Pad', 'साई पैड'], ['description', 'डिस्क्रिप्शन'], ['candidates', 'कैंडिडेट्स'], ['Marking', 'मार्किंग'],
  ['institute', 'इंस्टीट्यूट'], ['logo', 'लोगो'], ['Questions', 'क्वेश्चन्स'], ['English', 'इंग्लिश'], ['Hindi', 'हिंदी'], ['space', 'स्पेस'],
  ['Insert', 'इन्सर्ट'], ['Picture', 'पिक्चर'], ['PDF', 'पी डी एफ़'], ['Windows', 'विंडोज़'], ['Shift', 'शिफ़्ट'], ['fractions', 'फ़्रैक्शन्स'],
  ['numerical', 'न्यूमेरिकल'], ['integral', 'इंटीग्रल'], ['fraction', 'फ़्रैक्शन'], ['preview', 'प्रीव्यू'], ['log', 'लॉग'], ['multistep', 'मल्टीस्टेप'],
  ['bromobenzene', 'ब्रोमोबेंज़ीन'], ['Chemistry', 'केमिस्ट्री'], ['reagents', 'रीएजेंट्स'], ['Tables', 'टेबल्स'], ['reactants', 'रिएक्टेंट्स'],
  ['products', 'प्रोडक्ट्स'], ['Physics', 'फ़िज़िक्स'], ['Mathematics', 'मैथमेटिक्स'], ['complex', 'कॉम्प्लेक्स'], ['Bonus', 'बोनस'], ['Merge', 'मर्ज'],
  ['split', 'स्प्लिट'], ['sections', 'सेक्शन्स'], ['subscribe', 'सब्सक्राइब'], ['Integral', 'इंटीग्रल'], ['H प्लस', 'एच प्लस'],
  ['JEE', 'जे ई ई'], ['root', 'रूट'], ['picture', 'पिक्चर'], ['chemistry', 'केमिस्ट्री'],
];
const LETTERS = { L: 'एल', S: 'एस', D: 'डी', B: 'बी', C: 'सी', A: 'ए', H: 'एच' };

function forVoice(text) {
  let t = text;
  for (const [en, hi] of SAY) t = t.split(en).join(hi);
  t = t.replace(/\b([LSDBCAH])\b/g, (m) => LETTERS[m]);
  return t;
}

const md = readFileSync(ROOT + 'SCRIPT.md', 'utf8');
const meta = [];
for (const block of md.split(/^## /m).slice(1)) {
  const n = Number(block.match(/^Line (\d+)/)?.[1]);
  const text = block.split('\n').filter((l) => l.startsWith('    ')).map((l) => l.trim()).join(' ');
  if (!n || !text) continue;
  const id = String(n).padStart(2, '0');
  const spoken = forVoice(text);
  const latin = spoken.match(/[A-Za-z]{2,}/g);
  if (latin) console.warn(`line ${id}: Latin left for the voice: ${[...new Set(latin)].join(', ')}`);
  const txt = `${OUT}line-${id}.txt`, wav = `${OUT}line-${id}.wav`;
  writeFileSync(txt, spoken, 'utf8');
  if (!existsSync(wav) || process.env.TZ_FORCE) {
    execFileSync('npx', ['hyperframes', 'tts', `"${txt}"`, '-v', VOICE, '-l', 'hi', '-o', `"${wav}"`], { stdio: 'ignore', shell: true });
  }
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString().trim());
  meta.push({ n, id, file: `assets/vo-local/line-${id}.wav`, duration: dur, text });
  console.log(id, dur.toFixed(2) + 's');
}
writeFileSync(OUT + 'vo.json', JSON.stringify(meta, null, 2));
console.log('total', meta.reduce((s, m) => s + m.duration, 0).toFixed(1) + 's');
