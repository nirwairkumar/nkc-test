#!/usr/bin/env node
// LinkedIn 3-legged OAuth helper for the TestoZa company Page.
//
//   node mcp-servers/linkedin/auth.mjs
//
// Starts a local callback listener, prints the consent URL, captures the
// authorization code LinkedIn redirects back with, exchanges it for an access
// token, and writes the token into the repo-root .env (which is gitignored).
//
// Prerequisite in the LinkedIn app's Auth tab:
//   Authorized redirect URL = the LINKEDIN_REDIRECT_URI value in .env

import http from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENV_PATH = path.join(ROOT, '.env');

// Community Management API scopes. Each must be granted to the app in the
// developer portal, or LinkedIn rejects the whole consent request.
// Only scopes carried by Community Management API itself. Identity scopes
// (openid/profile) belong to "Sign In with LinkedIn using OpenID Connect" and
// r_basicprofile is a separate legacy product -- asking for any of them here
// fails the whole consent even when the org scopes are granted.
const DEFAULT_SCOPES = [
  'r_organization_social',   // read Page posts, comments, reactions
  'w_organization_social',   // publish as the Page
  'rw_organization_admin',   // Page admin + follower/visitor analytics
];

function readEnv() {
  const env = {};
  let text = '';
  try {
    text = readFileSync(ENV_PATH, 'utf8');
  } catch {
    throw new Error('No .env at repo root. Expected LinkedIn credentials there.');
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

const env = readEnv();
const clientId = env.LINKEDIN_CLIENT_ID;
const clientSecret = env.LINKEDIN_CLIENT_SECRET;
const redirectUri = env.LINKEDIN_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  console.error('Missing LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET or LINKEDIN_REDIRECT_URI in .env');
  process.exit(1);
}

const scopes = (env.LINKEDIN_SCOPES || DEFAULT_SCOPES.join(' ')).trim();
const state = randomBytes(16).toString('hex');
const port = Number(new URL(redirectUri).port || 80);

const authUrl =
  'https://www.linkedin.com/oauth/v2/authorization?response_type=code' +
  '&client_id=' + encodeURIComponent(clientId) +
  '&redirect_uri=' + encodeURIComponent(redirectUri) +
  '&state=' + state +
  '&scope=' + encodeURIComponent(scopes);

async function exchange(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error('Token exchange failed (' + res.status + '): ' + JSON.stringify(json));
  }
  return json;
}

function page(title, detail) {
  return '<!doctype html><meta charset="utf-8"><title>' + title + '</title>' +
    '<body style="font:16px/1.6 system-ui;max-width:34rem;margin:4rem auto;padding:0 1rem">' +
    '<h1 style="font-size:1.3rem">' + title + '</h1><p>' + detail + '</p>' +
    '<p style="color:#666">You can close this tab and return to Claude Code.</p>';
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + port);
  if (url.pathname !== new URL(redirectUri).pathname) {
    res.writeHead(404).end('not found');
    return;
  }

  const err = url.searchParams.get('error');
  if (err) {
    const desc = url.searchParams.get('error_description') || '';
    res.writeHead(400, { 'Content-Type': 'text/html' })
       .end(page('Authorization refused', err + ' &mdash; ' + desc));
    console.error('\nLinkedIn refused the request:');
    console.error('  error: ' + err);
    console.error('  description: ' + desc);
    if (err === 'unauthorized_scope_error') {
      console.error('\n  => The app lacks one of these scopes: ' + scopes);
      console.error('     Community Management API must be approved in the developer portal.');
    }
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
    res.writeHead(400, { 'Content-Type': 'text/html' }).end(page('No code', 'LinkedIn sent no authorization code.'));
    server.close(() => process.exit(2));
    return;
  }

  try {
    const token = await exchange(code);
    const expires = new Date(Date.now() + token.expires_in * 1000).toISOString();
    const updates = {
      LINKEDIN_ACCESS_TOKEN: token.access_token,
      LINKEDIN_TOKEN_EXPIRES: expires,
    };
    if (token.refresh_token) updates.LINKEDIN_REFRESH_TOKEN = token.refresh_token;
    setEnv(updates);

    res.writeHead(200, { 'Content-Type': 'text/html' })
       .end(page('Connected', 'Access token saved to .env. Expires ' + expires + '.'));
    console.log('\nToken saved to .env');
    console.log('  expires:  ' + expires);
    console.log('  scopes:   ' + (token.scope || scopes));
    console.log('  refresh:  ' + (token.refresh_token ? 'yes' : 'no (re-auth needed at expiry)'));
    server.close(() => process.exit(0));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/html' }).end(page('Exchange failed', String(e.message)));
    console.error('\n' + e.message);
    server.close(() => process.exit(1));
  }
});

server.listen(port, () => {
  console.log('Listening on ' + redirectUri);
  console.log('\nOpen this URL in a browser signed in as a TestoZa Page admin:\n');
  console.log(authUrl + '\n');
});

// Don't hang forever if nobody completes the flow.
setTimeout(() => {
  console.error('\nTimed out after 10 minutes with no callback.');
  server.close(() => process.exit(3));
}, 10 * 60 * 1000);
