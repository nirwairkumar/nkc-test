// List HeyGen starfish voices whose language is Hindi (all pages), using the skill's auth helper.
import { heygenAuthHeaders, heygenJSON } from 'file:///C:/Users/kumar/.claude/skills/media-use/audio/scripts/lib/heygen.mjs';

const headers = await heygenAuthHeaders();
const seen = [];
let token = '';
for (let page = 0; page < 40; page++) {
  const q = `/voices?engine=starfish&type=public&limit=100${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  const p = await heygenJSON(q, { headers });
  const list = p.data ?? p.voices ?? [];
  seen.push(...list);
  token = p.next_token ?? p.token ?? p.pagination?.next_token ?? '';
  if (!token || !list.length) break;
}
console.log('total voices', seen.length, 'keys', Object.keys(seen[0] || {}).join(','));
for (const v of seen.filter((v) => /hindi/i.test(v.language ?? '') || /hindi|india/i.test(JSON.stringify(v.labels ?? v.tags ?? '')))) {
  console.log([v.voice_id, v.name, v.language, v.gender, v.preview_audio_url ?? v.preview_audio ?? ''].join('\t'));
}
