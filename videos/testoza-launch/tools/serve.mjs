// Local static server for tools/measure.html, plus POST /__measure to save ui/measure.json.
// Run from the project root: node tools/serve.mjs  (http://127.0.0.1:8765)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.tpl': 'text/plain' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/__measure') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      JSON.parse(body);
      fs.writeFileSync(path.join(root, 'ui/measure.json'), body);
      res.end('saved');
    });
    return;
  }
  const file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; res.end(); return; }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(file).pipe(res);
}).listen(8765, '127.0.0.1', () => console.log('http://127.0.0.1:8765'));
