/**
 * Runs after `vite build`. Two jobs for functions/[[path]].js, the catch-all that
 * answers unknown app.testoza.com paths with a 404:
 *
 * 1. Fail the build when src/App.tsx has a route whose first path segment is
 *    missing from APP_SECTIONS (src/utils/knownPaths.ts). Users would still see the
 *    page, but crawlers would get a 404 for it.
 * 2. Write dist/_routes.json so only page loads invoke Functions. Without it Pages
 *    runs the catch-all for every script, style and image too (~57k requests on a
 *    busy day against the free plan's 100k/day). Every top-level file and folder in
 *    dist/ is excluded; static files are never pages.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

// --- 1. App.tsx routes against APP_SECTIONS ------------------------------------
const knownPaths = fs.readFileSync(path.join(root, 'src/utils/knownPaths.ts'), 'utf8');
const listSource = knownPaths.match(/APP_SECTIONS: readonly string\[\] = \[([\s\S]*?)\];/);
if (!listSource) throw new Error('[routes] APP_SECTIONS not found in src/utils/knownPaths.ts');
const sections = new Set([...listSource[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));

const appTsx = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const missing = new Set();
for (const [, routePath] of appTsx.matchAll(/path="(\/[^"]*)"/g)) {
  const first = routePath.split('/')[1];
  // "/" and the catch-alls ("/:slug" for blog posts, "*") are not sections.
  if (!first || first.startsWith(':') || first === '*') continue;
  if (!sections.has(first.toLowerCase())) missing.add(first);
}
for (const name of fs.readdirSync(path.join(root, 'functions'))) {
  if (name.startsWith('_') || name.startsWith('[')) continue;
  const first = name.replace(/\.(js|ts)$/, '');
  if (!sections.has(first)) missing.add(first);
}
if (missing.size) {
  throw new Error(`[routes] Add ${[...missing].map((s) => `'${s}'`).join(', ')} to APP_SECTIONS in src/utils/knownPaths.ts, or app.testoza.com will answer those pages with 404.`);
}

// --- 2. dist/_routes.json -------------------------------------------------------
const exclude = ['/cdn-cgi/*'];
for (const entry of fs.readdirSync(dist, { withFileTypes: true })) {
  if (entry.name.startsWith('_')) continue; // _redirects, _headers: config, never served
  exclude.push(entry.isDirectory() ? `/${entry.name}/*` : `/${entry.name}`);
}
const routes = { version: 1, include: ['/*'], exclude };
if (routes.include.length + exclude.length > 100) {
  throw new Error(`[routes] ${exclude.length} exclude rules; Pages allows 100 in total. Move public/ files into folders.`);
}
fs.writeFileSync(path.join(dist, '_routes.json'), JSON.stringify(routes, null, 2));
console.log(`[routes] dist/_routes.json: Functions on page loads only (${exclude.length} static paths excluded)`);
