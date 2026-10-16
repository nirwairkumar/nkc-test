// Synthesize every SCRIPT.md line with the chosen HeyGen voice (Aahana Verma), one file per line,
// with word timestamps. Skips lines already done, so a rerun never spends allowance twice.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const OUT = ROOT + 'assets/vo/';
mkdirSync(OUT, { recursive: true });
const VOICE = '1bd41839492f4f22b97f1a6678aded7b'; // Aahana Verma · Hindi · female
const HELPER = 'C:/Users/kumar/.claude/skills/media-use/audio/scripts/heygen-tts.mjs';

const md = readFileSync(ROOT + 'SCRIPT.md', 'utf8');
const lines = [];
for (const block of md.split(/^## /m).slice(1)) {
  const n = Number(block.match(/^Line (\d+)/)?.[1]);
  const text = block.split('\n').filter((l) => l.startsWith('    ')).map((l) => l.trim()).join(' ');
  if (n && text) lines.push({ n, text });
}
const meta = [];
for (const { n, text } of lines) {
  const id = String(n).padStart(2, '0');
  const mp3 = `${OUT}line-${id}.mp3`, words = `${OUT}line-${id}.words.json`, txt = `${OUT}line-${id}.txt`;
  if (!existsSync(mp3)) {
    writeFileSync(txt, text, 'utf8');
    execFileSync('node', [HELPER, txt, '-o', mp3, '--voice', VOICE, '--lang', 'hi', '--words', words], { stdio: 'inherit' });
  }
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString().trim());
  meta.push({ n, id, file: `assets/vo/line-${id}.mp3`, duration: dur, text });
}
writeFileSync(OUT + 'vo.json', JSON.stringify(meta, null, 2));
console.log(meta.map((m) => `${m.id}  ${m.duration.toFixed(2)}s`).join('\n'));
console.log('total', meta.reduce((s, m) => s + m.duration, 0).toFixed(1) + 's');
