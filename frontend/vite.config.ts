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
    // Brotli compression — primary (smaller than gzip, supported by all modern browsers)
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/, /\.(png|jpe?g|gif|ico|webp|svg)$/i],
      threshold: 1024, // Only compress files > 1KB
    }),
    // Gzip compression — fallback for older browsers/CDNs
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/, /\.(png|jpe?g|gif|ico|webp|svg)$/i],
      threshold: 1024,
    }),
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
          // All Radix UI primitives — used across many pages but stable
          'vendor-radix': [
            '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio', '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox', '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu', '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu', '@radix-ui/react-hover-card',
            '@radix-ui/react-label', '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu', '@radix-ui/react-popover',
            '@radix-ui/react-progress', '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area', '@radix-ui/react-select',
            '@radix-ui/react-separator', '@radix-ui/react-slider',
            '@radix-ui/react-slot', '@radix-ui/react-switch',
            '@radix-ui/react-tabs', '@radix-ui/react-toast',
            '@radix-ui/react-toggle', '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
          ],
          // Rich text editor — only on CreateTestPage (~300KB)
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
          // Charts — only on analytics/results pages (~80KB)
          'vendor-charts': ['recharts'],
          // Animations — LandingPage & UI micro-interactions (~140KB)
          'vendor-motion': ['framer-motion'],
          // Math rendering — wherever LaTeX/formulas appear
          'vendor-math': ['katex', 'react-latex-next', 'rehype-katex', 'remark-math', 'remark-gfm', 'react-markdown'],
          // File processing — AI import & export pages only (~190KB)
          'vendor-files': ['xlsx', 'html2canvas'],
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
