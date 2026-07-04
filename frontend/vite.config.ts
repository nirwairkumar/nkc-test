import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from 'url';
import { compression } from 'vite-plugin-compression2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    proxy: {
      '/api/yt': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/yt/, ''),
        headers: {
          'Origin': 'https://www.youtube.com',
          'Referer': 'https://www.youtube.com/'
        }
      },
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      }
    }
  },
  plugins: [
    react(),
    // Brotli & Gzip compression — primary & fallback compression formats
    compression({
      algorithms: ['brotliCompress', 'gzip'],
      exclude: [/\.(br)$/, /\.(gz)$/, /\.(png|jpe?g|gif|ico|webp|svg)$/i],
      threshold: 1024, // Only compress files > 1KB
    }),
    {
      name: 'async-css-plugin',
      transformIndexHtml: {
        order: 'post' as const,
        handler(html: string) {
          // Extract noscript tags to avoid modifying stylesheet links inside them
          const noscripts: string[] = [];
          let cleanHtml = html.replace(/<noscript>([\s\S]*?)<\/noscript>/gi, (match) => {
            noscripts.push(match);
            return `<!--NOSCRIPT_PLACEHOLDER_${noscripts.length - 1}-->`;
          });

          const linkRegex = /<link\s+([^>]*?rel=["']stylesheet["'][^>]*?)>/gi;
          cleanHtml = cleanHtml.replace(linkRegex, (match: string, attributes: string) => {
            if (attributes.includes('media="print"') || attributes.includes('onload=')) {
              return match;
            }
            return `<link ${attributes} media="print" onload="this.media='all'"><noscript><link ${attributes}></noscript>`;
          });

          // Restore noscript tags
          return cleanHtml.replace(/<!--NOSCRIPT_PLACEHOLDER_(\d+)-->/g, (_, index) => {
            return noscripts[parseInt(index, 10)];
          });
        }
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    modulePreload: {
      resolveDependencies(filename: string, deps: string[]) {
        return deps.filter(dep => {
          return !dep.includes('vendor-tiptap') &&
                 !dep.includes('vendor-charts') &&
                 !dep.includes('vendor-files') &&
                 !dep.includes('vendor-motion') &&
                 !dep.includes('vendor-katex');
        });
      }
    },
    rollupOptions: {
      output: {
        // --- Manual Chunk Splitting ---
        // Separates heavy vendor libraries so they don't block the initial page load.
        // Each chunk loads only when the page/component that needs it is visited.
        manualChunks: {
          // Core React runtime — always needed, cached aggressively
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Data fetching & auth — always needed
          'vendor-data': ['@tanstack/react-query', '@supabase/supabase-js'],
          // Rich text editor — only on CreateTestPage (~420KB)
          'vendor-tiptap': [
            '@tiptap/react', '@tiptap/starter-kit',
            '@tiptap/extension-color', '@tiptap/extension-font-family',
            '@tiptap/extension-heading', '@tiptap/extension-highlight',
            '@tiptap/extension-image', '@tiptap/extension-link',
            '@tiptap/extension-placeholder', '@tiptap/extension-table',
            '@tiptap/extension-table-cell', '@tiptap/extension-table-header',
            '@tiptap/extension-table-row', '@tiptap/extension-text-align',
            '@tiptap/extension-text-style', '@tiptap/extension-underline',
            'tiptap-extension-resize-image',
          ],
          // Charts — only on analytics/results pages (~395KB)
          'vendor-charts': ['recharts'],
          // Animations — LandingPage & UI micro-interactions (~140KB)
          'vendor-motion': ['framer-motion'],
          // File processing — AI import & export pages only (~486KB)
          'vendor-files': ['xlsx', 'html2canvas'],
          // KaTeX math rendering — only on test pages (~256KB)
          'vendor-katex': ['katex'],
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(name)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.css$/i.test(name)) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    sourcemap: mode === 'development',
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
  },
}));
