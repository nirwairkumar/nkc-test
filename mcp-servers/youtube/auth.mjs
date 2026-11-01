#!/usr/bin/env node
// YouTube OAuth helper for the TestoZa channel.
//
//   node mcp-servers/youtube/auth.mjs [path/to/client_secret_XXXX.json]
//
// Passing the OAuth client JSON downloaded from Google Cloud copies its id and
// secret into the repo-root .env (gitignored); after that, run it bare.
// Starts a loopback listener on a free port, prints the consent URL, captures
// the code Google redirects back with, and saves a refresh token to .env.
//
// Prerequisite: an OAuth client of type "Desktop app" in the Google Cloud
// project that has "YouTube Data API v3" enabled. Desktop clients accept any
// http://127.0.0.1:<port> redirect, so nothing has to be registered.

import http from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENV_PATH = path.join(ROOT, '.env');

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',     // upload videos
  'https://www.googleapis.com/auth/youtube',            // manage videos, playlists, thumbnails
  'https://www.googleapis.com/auth/youtube.force-ssl',  // captions and comments
  'https://www.googleapis.com/auth/yt-analytics.readonly', // views/watch-time reports
];

function readEnv() {
  const env = {};
  let text = '';
  try {
    text = readFileSync(ENV_PATH, 'utf8');
  } catch {
    throw new Error('No .env at repo root.');
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

// Rewrite a key in place, preserving comments and ordering.
function setEnv(updates) {
  let text = readFileSync(ENV_PATH, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp('^' + key + '=.*$', 'm');
    if (re.test(text)) {
      text = text.replace(re, key + '=' + value);
    } else {
      if (!text.endsWith(eol)) text += eol;
      text += key + '=' + value + eol;
    }
  }
  writeFileSync(ENV_PATH, text);
}

const clientJson = process.argv[2];
if (clientJson) {
  const json = JSON.parse(readFileSync(clientJson, 'utf8'));
  const c = json.installed || json.web;
  if (!c || !c.client_id || !c.client_secret) {
    console.error('That file has no installed/web client_id + client_secret.');
    process.exit(1);
  }
  if (!json.installed) {
    console.error('Warning: this is a "Web application" client. Use a "Desktop app" client,');
    console.error('or the 127.0.0.1 redirect will be rejected with redirect_uri_mismatch.');
  }
  setEnv({ YOUTUBE_CLIENT_ID: c.client_id, YOUTUBE_CLIENT_SECRET: c.client_secret });
  console.log('Client id and secret saved to .env');
}

const env = readEnv();
const clientId = env.YOUTUBE_CLIENT_ID;
const clientSecret = env.YOUTUBE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET in .env.');
  console.error('Run: node mcp-servers/youtube/auth.mjs path/to/client_secret_XXXX.json');
  process.exit(1);
}

const scopes = (env.YOUTUBE_SCOPES || DEFAULT_SCOPES.join(' ')).trim();
const state = randomBytes(16).toString('hex');
const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');

function page(title, detail) {
  return '<!doctype html><meta charset="utf-8"><title>' + title + '</title>' +
    '<body style="font:16px/1.6 system-ui;max-width:34rem;margin:4rem auto;padding:0 1rem">' +
    '<h1 style="font-size:1.3rem">' + title + '</h1><p>' + detail + '</p>' +
    '<p style="color:#666">You can close this tab and return to Claude Code.</p>';
}

async function exchange(code, redirectUri) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error('Token exchange failed (' + res.status + '): ' + JSON.stringify(json));
  }
  return json;
}

async function channelTitle(accessToken) {
  const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  const json = await res.json().catch(() => ({}));
  const ch = json.items && json.items[0];
  return ch ? ch.snippet.title + ' (' + ch.id + ')' : '(no channel on this account)';
}

let redirectUri = '';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/') {
    res.writeHead(404).end('not found');
    return;
  }

  const err = url.searchParams.get('error');
  if (err) {
    res.writeHead(400, { 'Content-Type': 'text/html' }).end(page('Authorization refused', err));
    console.error('\nGoogle refused the request: ' + err);
    server.close(() => process.exit(2));
    return;
  }

  if (url.searchParams.get('state') !== state) {
    res.writeHead(400, { 'Content-Type': 'text/html' })
       .end(page('State mismatch', 'The callback did not match this session. Re-run the helper.'));
    console.error('State mismatch - possible stale callback. Aborting.');
    server.close(() => process.exit(2));
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' }).end(page('No code', 'Google sent no authorization code.'));
    server.close(() => process.exit(2));
    return;
  }

  try {
    const token = await exchange(code, redirectUri);
    if (!token.refresh_token) {
      throw new Error('Google returned no refresh token. Remove the app at ' +
        'https://myaccount.google.com/permissions and run this again.');
    }
    setEnv({ YOUTUBE_REFRESH_TOKEN: token.refresh_token });
    const channel = await channelTitle(token.access_token);

    res.writeHead(200, { 'Content-Type': 'text/html' })
       .end(page('Connected', 'Channel: ' + channel + '. Refresh token saved to .env.'));
    console.log('\nRefresh token saved to .env');
    console.log('  channel: ' + channel);
    console.log('  scopes:  ' + (token.scope || scopes));
    server.close(() => process.exit(0));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/html' }).end(page('Exchange failed', String(e.message)));
    console.error('\n' + e.message);
    server.close(() => process.exit(1));
  }
});

server.listen(0, '127.0.0.1', () => {
  redirectUri = 'http://127.0.0.1:' + server.address().port + '/';
  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?response_type=code' +
    '&client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&scope=' + encodeURIComponent(scopes) +
    '&state=' + state +
    '&code_challenge=' + challenge + '&code_challenge_method=S256' +
    // offline + consent so Google always hands back a refresh token
    '&access_type=offline&prompt=consent';
  console.log('Listening on ' + redirectUri);
  console.log('\nOpen this URL in a browser signed in as the YouTube channel owner:\n');
  console.log(authUrl + '\n');
});

// Don't hang forever if nobody completes the flow.
setTimeout(() => {
  console.error('\nTimed out after 10 minutes with no callback.');
  server.close(() => process.exit(3));
}, 10 * 60 * 1000);
