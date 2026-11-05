// Keys for the video tools live in videos/.env (git-ignored). A real environment variable wins.
import { existsSync, readFileSync } from 'node:fs';

const FILE = decodeURIComponent(new URL('../../../.env', import.meta.url).pathname.slice(1));
if (existsSync(FILE)) {
  for (const l of readFileSync(FILE, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
