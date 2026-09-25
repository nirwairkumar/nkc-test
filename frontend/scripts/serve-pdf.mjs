/**
 * Local preview of dist-pdf that behaves like Cloudflare Pages:
 * "/edit-pdf" serves edit-pdf.html, _redirects rules answer with 301s,
 * unknown paths get 404.html with a real 404 status, and the path rules in
 * _headers are applied. Usage: npm run preview:pdf  (PORT=8096 by default)
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist-pdf');
const port = Number(process.env.PORT || 8096);

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.wasm': 'application/wasm',
};

const redirects = new Map(
    fs
        .readFileSync(path.join(dist, '_redirects'), 'utf8')
        .split('\n')
        .filter((l) => l.trim() && !l.startsWith('#'))
        .map((l) => l.trim().split(/\s+/))
        .map(([from, to, status]) => [from, { to, status: Number(status || 301) }]),
);

const headerRules = [];
{
    let current = null;
    for (const line of fs.readFileSync(path.join(dist, '_headers'), 'utf8').split('\n')) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        if (!/^\s/.test(line)) {
            current = { pattern: line.trim(), headers: [] };
            headerRules.push(current);
        } else if (current) {
            const i = line.indexOf(':');
            current.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
        }
    }
}
const matches = (pattern, p) => (pattern.startsWith('/') ? (pattern.endsWith('*') ? p.startsWith(pattern.slice(0, -1)) : p === pattern) : false);

const COMPRESSIBLE = /\.(html|js|mjs|css|json|webmanifest|txt|xml|svg|ttf)$/;

function send(req, res, status, file, pathname) {
    const headers = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' };
    for (const rule of headerRules) if (matches(rule.pattern, pathname)) for (const [k, v] of rule.headers) headers[k] = v;
    // Compress like Cloudflare does, so local measurements are realistic.
    const accept = String(req.headers['accept-encoding'] || '');
    const stream = fs.createReadStream(file);
    if (COMPRESSIBLE.test(file) && /\bbr\b/.test(accept)) {
        res.writeHead(status, { ...headers, 'Content-Encoding': 'br', Vary: 'Accept-Encoding' });
        return stream.pipe(zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } })).pipe(res);
    }
    if (COMPRESSIBLE.test(file) && /\bgzip\b/.test(accept)) {
        res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
        return stream.pipe(zlib.createGzip()).pipe(res);
    }
    res.writeHead(status, headers);
    stream.pipe(res);
}

http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    const rule = redirects.get(pathname);
    if (rule) {
        res.writeHead(rule.status, { Location: rule.to + url.search });
        return res.end();
    }
    if (pathname.endsWith('.html')) {
        const clean = pathname === '/index.html' ? '/' : pathname.slice(0, -5);
        res.writeHead(308, { Location: clean + url.search });
        return res.end();
    }
    const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const candidates = pathname === '/' ? ['index.html'] : [safe, `${safe}.html`];
    for (const c of candidates) {
        const file = path.join(dist, c);
        if (file.startsWith(dist) && fs.existsSync(file) && fs.statSync(file).isFile()) return send(req, res, 200, file, pathname);
    }
    return send(req, res, 404, path.join(dist, '404.html'), pathname);
}).listen(port, () => console.log(`pdf.testoza.com preview: http://localhost:${port}`));
