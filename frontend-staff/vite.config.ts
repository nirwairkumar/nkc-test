import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// team.testoza.com. The production CSP (public/_headers) allows scripts from this
// origin only, so the build must not emit inline scripts: no modulepreload polyfill.
export default defineConfig({
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 8097, strictPort: true },
    build: {
        target: 'es2020',
        sourcemap: false,
        modulePreload: { polyfill: false },
        assetsInlineLimit: 0,
    },
});
