// SCRIPT-en.md → voice lines: { id, raw (with {cues}), text (what is spoken), delivery }.
import { readFileSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../', import.meta.url).pathname.slice(1));

export function lines(file = 'SCRIPT-en.md') {
  const out = [];
  let cur = null;
  for (const l of readFileSync(ROOT + file, 'utf8').split(/\r?\n/)) {
    const h = l.match(/^## (L\d+)/);
    if (h) { cur = { id: h[1], raw: [], delivery: '' }; out.push(cur); continue; }
    if (!cur) continue;
    const d = l.match(/^\*\*Delivery:\*\*\s*(.+)$/);
    if (d) cur.delivery = d[1].trim();
    if (l.startsWith('    ')) cur.raw.push(l.trim());
  }
  return out.map((x) => {
    const raw = x.raw.join('\n');
    return { id: x.id, raw, delivery: x.delivery, text: raw.replace(/\{[a-z0-9]+\}/gi, '').replace(/[ \t]+/g, ' ').trim() };
  });
}
