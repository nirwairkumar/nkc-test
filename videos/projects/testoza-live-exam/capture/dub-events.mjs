// What the Hindi dub has to follow: the English video's picture is final, so every on-screen
// moment is fixed. For each line → its English window and the film time of each event:
// a recorded click/appear (capture/sync.json) or a scene beat (cue word − LEAD, as build.mjs cuts).
// The WhatsApp highlights in L23 follow the English words name/time/link/instructions.
// Usage: node capture/dub-events.mjs → capture/dub-events.json (+ a table on stdout)
import { readFileSync, writeFileSync } from 'node:fs';
import { timeLine } from './words.mjs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));
const J = (f) => JSON.parse(readFileSync(ROOT + f, 'utf8'));
const LEAD = 0.12;
const timing = J('capture/timing.json'), sync = J('capture/sync.json'), VO = J('assets/vo-en/vo.json');
const click = Object.fromEntries(sync.map((s) => [s.cue, s.click]));
const r2 = (x) => Math.round(x * 100) / 100;

const lines = timing.voice.map((v, i) => {
  const vo = VO.find((x) => x.id === v.id);
  const cues = [...vo.raw.matchAll(/\{([a-z0-9]+)\}/gi)].map((m) => m[1]);
  const events = cues.map((c) => ({ cue: c, at: r2(click[c] ?? timing.cues[c] - LEAD), kind: c in click ? 'click' : 'scene' }));
  if (v.id === 'L23') {
    const L = timeLine(vo.raw, J(`assets/vo-en/${v.id}.words.json`), vo.duration);
    for (const [w, cue] of [['name', 'hname'], ['time', 'htime'], ['link', 'hlink'], ['instr', 'hinstr']]) {
      const tok = L.tokens.find((k) => k.display.toLowerCase().replace(/[^a-z]/g, '').startsWith(w) && k.start >= L.cues.walines - 0.05);
      events.push({ cue, at: r2(v.start + tok.start - LEAD), kind: 'scene' });
    }
    events.sort((a, b) => a.at - b.at);
  }
  const next = timing.voice[i + 1]?.start ?? timing.total;
  return { id: v.id, start: r2(v.start), end: r2(v.end), next: r2(next), enDur: r2(vo.duration), events };
});

writeFileSync(ROOT + 'capture/dub-events.json', JSON.stringify({ total: timing.total, lines }, null, 2));
for (const l of lines) {
  console.log(`${l.id} ${l.start.toFixed(2)}–${l.end.toFixed(2)} (next ${l.next.toFixed(2)}, en ${l.enDur}s, room ${r2(l.next - l.start)}s)  `
    + l.events.map((e) => `${e.cue}@+${(e.at - l.start).toFixed(2)}`).join(' '));
}
