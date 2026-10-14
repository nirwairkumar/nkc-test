#!/usr/bin/env node
// LinkedIn Page client for TestoZa. Reads credentials from the repo-root .env.
//
//   node mcp-servers/linkedin/linkedin.mjs whoami
//   node mcp-servers/linkedin/linkedin.mjs posts [count]
//   node mcp-servers/linkedin/linkedin.mjs post --text "..." [--url https://...] [--dry-run]
//   node mcp-servers/linkedin/linkedin.mjs comments <postUrn>
//   node mcp-servers/linkedin/linkedin.mjs followers
//   node mcp-servers/linkedin/linkedin.mjs delete <postUrn>
//
// Posting is irreversible and public, so `post` requires --confirm unless
// --dry-run is passed; dry runs print the exact payload without sending it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const API = 'https://api.linkedin.com';
const VERSION = '202505'; // LinkedIn versioned API month

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
const token = env.LINKEDIN_ACCESS_TOKEN;
const orgUrn = env.LINKEDIN_ORG_URN;

if (!token) {
  console.error('No LINKEDIN_ACCESS_TOKEN in .env. Run: node mcp-servers/linkedin/auth.mjs');
  process.exit(1);
}

const expires = env.LINKEDIN_TOKEN_EXPIRES;
if (expires && new Date(expires) < new Date()) {
  console.error('Access token expired on ' + expires + '. Re-run auth.mjs.');
  process.exit(1);
}

async function api(method, pathname, { body, restli = true, query } = {}) {
  const url = new URL(API + pathname);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  const headers = {
    Authorization: 'Bearer ' + token,
    'LinkedIn-Version': VERSION,
  };
  if (restli) headers['X-Restli-Protocol-Version'] = '2.0.0';
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

  if (!res.ok) {
    const err = new Error('LinkedIn ' + res.status + ': ' + (json.message || text).slice(0, 400));
    err.status = res.status;
    err.body = json;
    err.postUrn = res.headers.get('x-restli-id');
    throw err;
  }
  return { json, headers: res.headers };
}

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name) => process.argv.includes('--' + name);

// --- commands ---------------------------------------------------------------

async function whoami() {
  console.log('Page URN:      ' + orgUrn);
  console.log('Token expires: ' + (expires || 'unknown'));

  // Identity is optional: we only request org scopes, so /v2/userinfo will 403
  // unless "Sign In with LinkedIn using OpenID Connect" is also granted.
  try {
    const { json } = await api('GET', '/v2/userinfo', { restli: false });
    console.log('Authorized as: ' + (json.name || json.sub));
  } catch {
    console.log('Authorized as: (identity scope not granted - not required)');
  }

  // This is the check that matters: can this token act on the Page?
  const acl = await api('GET', '/v2/organizationAcls', {
    query: { q: 'roleAssignee', role: 'ADMINISTRATOR', projection: '(elements*(organization,role,state))' },
  });
  const orgs = (acl.json.elements || []).map((e) => e.organization);
  console.log('Admin of:      ' + (orgs.join(', ') || 'none visible'));
  if (orgUrn && !orgs.includes(orgUrn)) {
    console.log('\nWARNING: ' + orgUrn + ' is not in this token’s admin list.');
    console.log('The authorizing account may not be a TestoZa Page admin.');
  }
}

async function posts(count = 10) {
  const { json } = await api('GET', '/rest/posts', {
    query: { q: 'author', author: orgUrn, count: String(count), sortBy: 'LAST_MODIFIED' },
  });
  const items = json.elements || [];
  if (!items.length) {
    console.log('No posts found for ' + orgUrn);
    return;
  }
  for (const p of items) {
    const text = (p.commentary || '').replace(/\s+/g, ' ').slice(0, 90);
    console.log('[' + (p.lifecycleState || '?') + '] ' + p.id);
    console.log('   ' + text + (text.length === 90 ? '...' : ''));
  }
}

async function post() {
  const text = arg('text');
  const link = arg('url');
  if (!text) {
    console.error('post requires --text "your post body"');
    process.exit(1);
  }

  const payload = {
    author: orgUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  if (link) {
    payload.content = { article: { source: link, title: arg('title') || undefined } };
  }

  if (has('dry-run') || !has('confirm')) {
    console.log('DRY RUN - nothing sent. Payload:\n');
    console.log(JSON.stringify(payload, null, 2));
    if (!has('dry-run')) console.log('\nAdd --confirm to publish this to the Page.');
    return;
  }

  const { headers } = await api('POST', '/rest/posts', { body: payload });
  const urn = headers.get('x-restli-id');
  console.log('Published: ' + urn);
  if (urn) {
    const id = urn.split(':').pop();
    console.log('View: https://www.linkedin.com/feed/update/' + urn);
  }
}

async function comments(postUrn) {
  if (!postUrn) {
    console.error('comments requires a post URN');
    process.exit(1);
  }
  const { json } = await api('GET', '/v2/socialActions/' + encodeURIComponent(postUrn) + '/comments');
  const items = json.elements || [];
  console.log(items.length + ' comment(s)');
  for (const c of items) {
    const who = c.actor || 'unknown';
    const msg = (c.message && c.message.text ? c.message.text : '').replace(/\s+/g, ' ');
    console.log('- ' + who + ': ' + msg);
  }
}

async function followers() {
  const { json } = await api('GET', '/rest/networkSizes/' + encodeURIComponent(orgUrn), {
    query: { edgeType: 'COMPANY_FOLLOWED_BY_MEMBER' },
  });
  console.log('Followers: ' + (json.firstDegreeSize ?? 'unknown'));
}

async function remove(postUrn) {
  if (!postUrn) {
    console.error('delete requires a post URN');
    process.exit(1);
  }
  if (!has('confirm')) {
    console.error('Refusing to delete ' + postUrn + ' without --confirm');
    process.exit(1);
  }
  await api('DELETE', '/rest/posts/' + encodeURIComponent(postUrn));
  console.log('Deleted ' + postUrn);
}

// --- dispatch --------------------------------------------------------------

const cmd = process.argv[2];
const rest = process.argv[3];

const run = {
  whoami,
  posts: () => posts(Number(rest) || 10),
  post,
  comments: () => comments(rest),
  followers,
  delete: () => remove(rest),
}[cmd];

if (!run) {
  console.error('Usage: linkedin.mjs <whoami|posts|post|comments|followers|delete>');
  process.exit(1);
}

run().catch((e) => {
  console.error(e.message);
  if (e.status === 401) console.error('=> Token invalid or expired. Re-run auth.mjs.');
  if (e.status === 403) console.error('=> Scope missing, or this token is not a TestoZa Page admin.');
  process.exit(1);
});
