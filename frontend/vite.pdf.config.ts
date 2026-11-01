/**
 * Build for pdf.testoza.com (Panna PDF tools) — a separate, lightweight site
 * from the same source tree. `npm run build:pdf` builds the client into
 * dist-pdf/, builds a server renderer, and pre-renders every page to HTML
 * (scripts/prerender-pdf.mjs). `npm run dev:pdf` serves it on :8095.
 */
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { pdfjsAssets } from './vite.pdfjs-assets';

const root = path.dirname(fileURLToPath(import.meta.url));

/** Dev server: every page URL is served from pdf.html (the pre-renderer does this in production). */
function devPages(): Plugin {
    return {
        name: 'panna-dev-pages',
        configureServer(server) {
            server.middlewares.use((req, _res, next) => {
                const url = req.url || '/';
                const pathOnly = url.split('?')[0];
                const isPage = req.method === 'GET' && (req.headers.accept || '').includes('text/html') && !/\.[a-z0-9]+$/i.test(pathOnly) && !pathOnly.startsWith('/@');
                if (isPage) req.url = '/pdf.html';
                next();
            });
        },
    };
}

export default defineConfig(({ isSsrBuild }) => ({
    root,
    publicDir: path.resolve(root, 'pdf-public'),
    plugins: [react(), pdfjsAssets(root), devPages()],
    resolve: { alias: { '@': path.resolve(root, 'src') } },
    css: {
        postcss: { plugins: [tailwindcss({ config: path.resolve(root, 'tailwind.pdf.config.ts') }), autoprefixer()] },
    },
    server: { port: 8095 },
    ssr: { noExternal: true },
    build: isSsrBuild
        ? { outDir: 'dist-pdf-server', emptyOutDir: true, target: 'node18', copyPublicDir: false }
        : {
              outDir: 'dist-pdf',
              emptyOutDir: true,
              target: 'es2020',
              manifest: true,
              reportCompressedSize: false,
              chunkSizeWarningLimit: 1200,
              rollupOptions: {
                  input: path.resolve(root, 'pdf.html'),
                  output: {
                      manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] },
                  },
              },
          },
}));
