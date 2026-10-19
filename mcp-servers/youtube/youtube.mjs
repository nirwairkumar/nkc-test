#!/usr/bin/env node
// YouTube channel client for TestoZa. Reads credentials from the repo-root .env
// (run auth.mjs once first).
//
//   node mcp-servers/youtube/youtube.mjs whoami
//   node mcp-servers/youtube/youtube.mjs videos [count]
//   node mcp-servers/youtube/youtube.mjs playlists
//   node mcp-servers/youtube/youtube.mjs upload <video.mp4> --title "..."
//        [--description "..." | --description-file desc.txt] [--tags a,b,c]
//        [--privacy private|unlisted|public] [--publish-at 2026-10-20T18:30:00+05:30]
//        [--category 27] [--lang hi] [--kids] [--thumbnail thumb.png]
//        [--captions subs.srt] [--caption-lang hi] [--playlist <playlistId>]
//        [--dry-run | --confirm]
//   node mcp-servers/youtube/youtube.mjs update <videoId> [--title ...] [--description(-file) ...]
//        [--tags ...] [--privacy ...] [--publish-at ...] [--category ...] [--confirm]
//   node mcp-servers/youtube/youtube.mjs thumbnail <videoId> <image.png|jpg>
//   node mcp-servers/youtube/youtube.mjs captions <videoId> <subs.srt> [--lang hi] [--name "Hindi"]
//   node mcp-servers/youtube/youtube.mjs delete <videoId> --confirm
//
// Uploads default to private. upload, update and delete send nothing without
// --confirm; --dry-run prints the exact metadata instead.

import { readFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3';
const CHUNK = 8 * 1024 * 1024; // must be a multiple of 256 KiB

function loadEnv() {
  const env = {};
  const text = readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
if (!env.YOUTUBE_CLIENT_ID || !env.YOUTUBE_CLIENT_SECRET || !env.YOUTUBE_REFRESH_TOKEN) {
  console.error('YouTube is not connected. Run: node mcp-servers/youtube/auth.mjs <client_secret.json>');
  process.exit(1);
}

// --flag value / --flag (boolean) / positional
function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) opts[key] = true;
      else { opts[key] = next; i++; }
    } else {
      pos.push(a);
    }
  }
  return { pos, opts };
}

let accessToken = '';
async function token() {
  if (accessToken) return accessToken;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: env.YOUTUBE_REFRESH_TOKEN,
      client_id: env.YOUTUBE_CLIENT_ID,
      client_secret: env.YOUTUBE_CLIENT_SECRET,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    if (json.error === 'invalid_grant') {
      throw new Error('Refresh token rejected (invalid_grant). If the OAuth consent screen is still in ' +
        '"Testing", tokens die after 7 days -- publish it to "In production", then re-run auth.mjs.');
    }
    throw new Error('Token refresh failed (' + res.status + '): ' + JSON.stringify(json));
  }
  accessToken = json.access_token;
  return accessToken;
}

async function api(method, url, { body, headers = {} } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + (await token()),
      ...(body && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body && !(body instanceof Uint8Array) ? JSON.stringify(body) : body,
  });
  if (res.status === 204) return {};
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const e = json.error || {};
    const reason = (e.errors && e.errors[0] && e.errors[0].reason) || '';
    throw new Error(method + ' ' + url.split('?')[0] + ' -> ' + res.status + ' ' + reason + ': ' + (e.message || text));
  }
  return json;
}

const MIME = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const mimeOf = (f) => MIME[path.extname(f).toLowerCase()] || 'application/octet-stream';

function description(opts) {
  if (opts['description-file']) return readFileSync(opts['description-file'], 'utf8').replace(/\r\n/g, '\n').trim();
  return typeof opts.description === 'string' ? opts.description : undefined;
}

function tags(opts) {
  return typeof opts.tags === 'string' ? opts.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
}

function status(opts, base = {}) {
  const s = { ...base };
  if (opts['publish-at']) {
    // Scheduled publishing only works on private videos; YouTube flips them public at that time.
    s.privacyStatus = 'private';
    s.publishAt = new Date(opts['publish-at']).toISOString();
  } else if (opts.privacy) {
    s.privacyStatus = opts.privacy;
  }
  return s;
}

async function myChannel() {
  const json = await api('GET', API + '/channels?part=snippet,contentDetails,statistics&mine=true');
  const ch = json.items && json.items[0];
  if (!ch) throw new Error('This Google account has no YouTube channel.');
  return ch;
}

async function whoami() {
  const ch = await myChannel();
  console.log(ch.snippet.title + '  (' + ch.id + ')');
  console.log('  https://www.youtube.com/channel/' + ch.id);
  console.log('  subscribers: ' + (ch.statistics.subscriberCount ?? 'hidden') +
    '  videos: ' + ch.statistics.videoCount + '  views: ' + ch.statistics.viewCount);
}

async function videos(count = 10) {
  const ch = await myChannel();
  const list = await api('GET', API + '/playlistItems?part=contentDetails&maxResults=' + Math.min(50, count) +
    '&playlistId=' + ch.contentDetails.relatedPlaylists.uploads);
  const ids = list.items.map((i) => i.contentDetails.videoId);
  if (!ids.length) return console.log('No uploads yet.');
  const json = await api('GET', API + '/videos?part=snippet,status,statistics&id=' + ids.join(','));
  for (const v of json.items) {
    console.log(v.id + '  ' + v.status.privacyStatus.padEnd(8) + '  ' + String(v.statistics.viewCount || 0).padStart(6) +
      ' views  ' + v.snippet.publishedAt.slice(0, 10) + '  ' + v.snippet.title);
  }
}

async function playlists() {
  const json = await api('GET', API + '/playlists?part=snippet,contentDetails&mine=true&maxResults=50');
  if (!json.items.length) return console.log('No playlists.');
  for (const p of json.items) console.log(p.id + '  ' + String(p.contentDetails.itemCount).padStart(3) + ' videos  ' + p.snippet.title);
}

// Resumable upload: open a session with the metadata, then PUT the file in chunks.
async function resumableUpload(file, metadata) {
  const size = statSync(file).size;
  const init = await fetch(UPLOAD + '/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (await token()),
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(size),
      'X-Upload-Content-Type': mimeOf(file),
    },
    body: JSON.stringify(metadata),
  });
  if (!init.ok) throw new Error('Upload session refused (' + init.status + '): ' + (await init.text()));
  const session = init.headers.get('location');

  const fd = openSync(file, 'r');
  try {
    let offset = 0;
    while (true) {
      const len = Math.min(CHUNK, size - offset);
      const buf = Buffer.alloc(len);
      readSync(fd, buf, 0, len, offset);
      const res = await fetch(session, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + (await token()),
          'Content-Length': String(len),
          'Content-Range': 'bytes ' + offset + '-' + (offset + len - 1) + '/' + size,
        },
        body: buf,
      });
      if (res.status === 308) {
        const range = res.headers.get('range'); // "bytes=0-N"
        offset = range ? Number(range.split('-')[1]) + 1 : 0;
        process.stdout.write('\r  uploaded ' + Math.round((offset / size) * 100) + '%   ');
        continue;
      }
      if (!res.ok) throw new Error('Upload failed (' + res.status + '): ' + (await res.text()));
      process.stdout.write('\r  uploaded 100%   \n');
      return res.json();
    }
  } finally {
    closeSync(fd);
  }
}

async function setThumbnail(videoId, image) {
  const size = statSync(image).size;
  if (size > 2 * 1024 * 1024) throw new Error('Thumbnail must be under 2 MB (this one is ' + (size / 1048576).toFixed(1) + ' MB).');
  await api('POST', UPLOAD + '/thumbnails/set?uploadType=media&videoId=' + videoId, {
    body: new Uint8Array(readFileSync(image)),
    headers: { 'Content-Type': mimeOf(image) },
  });
  console.log('  thumbnail set');
}

async function addCaptions(videoId, file, lang = 'hi', name = '') {
  const boundary = 'tz' + Date.now().toString(36);
  const meta = JSON.stringify({ snippet: { videoId, language: lang, name, isDraft: false } });
  const body = Buffer.concat([
    Buffer.from('--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n' +
      '--' + boundary + '\r\nContent-Type: application/octet-stream\r\n\r\n'),
    readFileSync(file),
    Buffer.from('\r\n--' + boundary + '--\r\n'),
  ]);
  await api('POST', UPLOAD + '/captions?uploadType=multipart&part=snippet', {
    body: new Uint8Array(body),
    headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
  });
  console.log('  captions added (' + lang + ')');
}

async function upload(file, opts) {
  if (!file) throw new Error('Usage: upload <video.mp4> --title "..." [--confirm]');
  if (!opts.title) throw new Error('--title is required.');
  statSync(file); // fail early if missing
  const metadata = {
    snippet: {
      title: opts.title,
      description: description(opts) || '',
      tags: tags(opts),
      categoryId: String(opts.category || '27'), // 27 = Education
      defaultLanguage: opts.lang,
      defaultAudioLanguage: opts.lang,
    },
    status: status(opts, {
      privacyStatus: 'private',
      selfDeclaredMadeForKids: Boolean(opts.kids),
      embeddable: true,
    }),
  };

  console.log('File: ' + file + '  (' + (statSync(file).size / 1048576).toFixed(1) + ' MB)');
  console.log(JSON.stringify(metadata, null, 2));
  if (opts.thumbnail) console.log('Thumbnail: ' + opts.thumbnail);
  if (opts.captions) console.log('Captions: ' + opts.captions + ' (' + (opts['caption-lang'] || opts.lang || 'hi') + ')');
  if (opts.playlist) console.log('Playlist: ' + opts.playlist);
  if (opts['dry-run'] || !opts.confirm) {
    console.log('\n' + (opts['dry-run'] ? 'Dry run' : 'Not sent -- add --confirm to upload') + '.');
    return;
  }

  const video = await resumableUpload(file, metadata);
  console.log('Uploaded: https://youtu.be/' + video.id + '  (' + video.status.privacyStatus +
    (video.status.publishAt ? ', publishes ' + video.status.publishAt : '') + ')');
  if (opts.thumbnail) await setThumbnail(video.id, opts.thumbnail);
  if (opts.captions) await addCaptions(video.id, opts.captions, opts['caption-lang'] || opts.lang || 'hi');
  if (opts.playlist) {
    await api('POST', API + '/playlistItems?part=snippet', {
      body: { snippet: { playlistId: opts.playlist, resourceId: { kind: 'youtube#video', videoId: video.id } } },
    });
    console.log('  added to playlist');
  }
  console.log('Studio: https://studio.youtube.com/video/' + video.id + '/edit');
}

async function update(videoId, opts) {
  if (!videoId) throw new Error('Usage: update <videoId> [--title ...] [--confirm]');
  const cur = (await api('GET', API + '/videos?part=snippet,status&id=' + videoId)).items[0];
  if (!cur) throw new Error('No video ' + videoId + ' on this channel.');
  // videos.update replaces the whole part, so start from what is there.
  const snippet = { ...cur.snippet };
  delete snippet.thumbnails; delete snippet.localized; delete snippet.publishedAt; delete snippet.channelId; delete snippet.channelTitle;
  if (opts.title) snippet.title = opts.title;
  const d = description(opts); if (d !== undefined) snippet.description = d;
  const t = tags(opts); if (t) snippet.tags = t;
  if (opts.category) snippet.categoryId = String(opts.category);
  const st = status(opts, {
    privacyStatus: cur.status.privacyStatus,
    publishAt: cur.status.publishAt,
    embeddable: cur.status.embeddable,
    selfDeclaredMadeForKids: cur.status.madeForKids,
  });
  const body = { id: videoId, snippet, status: st };

  console.log(JSON.stringify(body, null, 2));
  if (!opts.confirm) return console.log('\nNot sent -- add --confirm to apply.');
  await api('PUT', API + '/videos?part=snippet,status', { body });
  console.log('Updated https://youtu.be/' + videoId);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, opts } = parseArgs(rest);
  switch (cmd) {
    case 'whoami': return whoami();
    case 'videos': return videos(Number(pos[0]) || 10);
    case 'playlists': return playlists();
    case 'upload': return upload(pos[0], opts);
    case 'update': return update(pos[0], opts);
    case 'thumbnail':
      if (!pos[1]) throw new Error('Usage: thumbnail <videoId> <image>');
      return setThumbnail(pos[0], pos[1]);
    case 'captions':
      if (!pos[1]) throw new Error('Usage: captions <videoId> <subs.srt> [--lang hi]');
      return addCaptions(pos[0], pos[1], opts.lang || 'hi', typeof opts.name === 'string' ? opts.name : '');
    case 'delete':
      if (!pos[0]) throw new Error('Usage: delete <videoId> --confirm');
      if (!opts.confirm) return console.log('Not sent -- deleting is permanent; add --confirm.');
      await api('DELETE', API + '/videos?id=' + pos[0]);
      return console.log('Deleted ' + pos[0]);
    default:
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 21)
        .map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
