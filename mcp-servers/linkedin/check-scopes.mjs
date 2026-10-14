#!/usr/bin/env node
// Browser-free check of which OAuth scopes a LinkedIn app may request.
//
//   node mcp-servers/linkedin/check-scopes.mjs [clientId]
//
// The authorization endpoint validates the scope before asking anyone to sign
// in, so an unauthenticated GET already reveals the app's product state:
//
//   invalid_scope_error       - app has no product granting this scope
//   unauthorized_scope_error  - scope is real, app is not approved for it
//   ACCEPTED                  - app may request it
//
// A control scope that cannot exist is probed first. If the control is not
// rejected, the signal is meaningless and the run aborts rather than report
// a false all-clear.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function envValue(key) {
  const text = readFileSync(path.join(ROOT, '.env'), 'utf8');
  const m = text.match(new RegExp('^' + key + '=(.*)$', 'm'));
  return m ? m[1].trim() : undefined;
}

const clientId = process.argv[2] || envValue('LINKEDIN_CLIENT_ID');
const redirectUri = envValue('LINKEDIN_REDIRECT_URI') || 'http://localhost:4571/callback';

if (!clientId) {
  console.error('No client id given and none in .env');
  process.exit(1);
}

const CONTROL = 'zzz_control_scope_that_cannot_exist';
const SCOPES = [
  'r_organization_social',
  'w_organization_social',
  'rw_organization_admin',
  'r_organization_admin',
  'w_member_social',
];

async function probe(scope) {
  const url =
    'https://www.linkedin.com/oauth/v2/authorization?response_type=code' +
    '&client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&state=probe&scope=' + encodeURIComponent(scope);
  const html = await fetch(url).then((r) => r.text());
  if (html.includes('invalid_scope_error')) return 'invalid_scope_error';
  if (html.includes('unauthorized_scope_error')) return 'unauthorized_scope_error';
  return 'ACCEPTED';
}

const label = {
  invalid_scope_error: 'no product on the app grants this',
  unauthorized_scope_error: 'real scope, app not approved',
  ACCEPTED: 'can be requested',
};

console.log('App: ' + clientId + '\n');

const control = await probe(CONTROL);
if (control !== 'invalid_scope_error') {
  console.error('Control scope returned "' + control + '" instead of invalid_scope_error.');
  console.error('LinkedIn is not validating scopes pre-login; results would be meaningless. Aborting.');
  process.exit(2);
}
console.log('control (nonsense scope): ' + control + '  <- probe is meaningful\n');

let ready = true;
for (const s of SCOPES) {
  const r = await probe(s);
  if (['r_organization_social', 'w_organization_social', 'rw_organization_admin'].includes(s) && r !== 'ACCEPTED') {
    ready = false;
  }
  console.log('  ' + s.padEnd(24) + r.padEnd(26) + label[r]);
}

console.log('');
if (ready) {
  console.log('All three Page scopes are available. Run: node mcp-servers/linkedin/auth.mjs');
} else {
  console.log('Community Management API is not usable on this app yet.');
  console.log('Products tab -> add Community Management API (and nothing else).');
}
