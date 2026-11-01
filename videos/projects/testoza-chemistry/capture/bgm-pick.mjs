// List HeyGen library music for a mood with durations; `--get N` downloads pick N to process.env.OUT || 'assets/music/bed.mp3'.
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const lib = await import(pathToFileURL(path.join(os.homedir(), '.claude/skills/media-use/audio/scripts/lib/heygen.mjs')).href);
const headers = await lib.heygenAuthHeaders();
const queries = (process.env.Q || 'calm lofi study background, soft piano, warm|gentle corporate tutorial background, light acoustic, positive|ambient focus education background, soft beat').split('|');
const all = [];
for (const q of queries) for (const r of await lib.searchSounds(q, 'music', headers, { limit: 8 })) if (!all.find((a) => a.audio_url === r.audio_url)) all.push(r);
all.forEach((r, i) => console.log(i, Math.round(r.duration), r.name || r.title || '', (r.tags || []).slice?.(0, 4).join(',') || ''));
const gi = process.argv.indexOf('--get');
if (gi > 0) { const r = all[Number(process.argv[gi + 1])]; await lib.downloadTo(r.audio_url, process.env.OUT || 'assets/music/bed.mp3'); console.log('saved', r.name, r.duration); }
