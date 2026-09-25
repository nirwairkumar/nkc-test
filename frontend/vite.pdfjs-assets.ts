import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

/**
 * Serves pdf.js runtime assets (CMaps, standard fonts, wasm decoders, ICC
 * profiles) at /pdfjs/* in dev and copies them into the build output.
 * Self-hosting keeps the PDF editor free of third-party requests.
 */
export function pdfjsAssets(root: string): Plugin {
    const src = path.resolve(root, 'node_modules/pdfjs-dist');
    const dirs = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];
    let outDir = path.resolve(root, 'dist');
    let ssr = false;
    return {
        name: 'pdfjs-assets',
        configResolved(config) {
            outDir = path.resolve(config.root, config.build.outDir);
            ssr = !!config.build.ssr;
        },
        configureServer(server) {
            server.middlewares.use('/pdfjs', (req, res, next) => {
                const rel = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '');
                const file = path.join(src, rel);
                if (!dirs.some((d) => rel.startsWith(d + '/')) || !file.startsWith(src) || !fs.existsSync(file)) return next();
                if (file.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm');
                fs.createReadStream(file).pipe(res);
            });
        },
        closeBundle() {
            if (ssr) return;
            for (const d of dirs) fs.cpSync(path.join(src, d), path.join(outDir, 'pdfjs', d), { recursive: true });
        },
    };
}
