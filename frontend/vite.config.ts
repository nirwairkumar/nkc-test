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
          const linkRegex = /<link\s+([^>]*?rel=["']stylesheet["'][^>]*?)>/gi;
          return html.replace(linkRegex, (match: string, attributes: string) => {
            if (attributes.includes('media="print"') || attributes.includes('onload=')) {
              return match;
            }
            return `<link ${attributes} media="print" onload="this.media='all'"><noscript><link ${attributes}></noscript>`;
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
                 !dep.includes('vendor-motion');
        });
      }
    },
    rollupOptions: {
      output: {
        hoistTransitiveImports: false,
        // --- Manual Chunk Splitting ---
        // Separates heavy vendor libraries so they don't block the initial page load.
        // Each chunk loads only when the page/component that needs it is visited.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core React, Routing & Global Utilities (clsx, tailwind-merge, lucide-react)
            // Placing shared utilities here prevents Rollup from leaking them into lazy-loaded vendor chunks.
            if (
              id.includes('react') ||
              id.includes('scheduler') ||
              id.includes('prop-types') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge') ||
              id.includes('lucide-react')
            ) {
              return 'vendor-react';
            }
            // Data fetching & database client
            if (
              id.includes('@supabase') ||
              id.includes('@tanstack')
            ) {
              return 'vendor-data';
            }
            // Rich text editor
            if (
              id.includes('@tiptap') ||
              id.includes('tiptap-extension') ||
              id.includes('prosemirror')
            ) {
              return 'vendor-tiptap';
            }
            // Charts
            if (
              id.includes('recharts') ||
              id.includes('d3-') ||
              id.includes('internmap') ||
              id.includes('victory-vendor')
            ) {
              return 'vendor-charts';
            }
            // Animations
            if (
              id.includes('framer-motion') ||
              id.includes('motion-dom') ||
              id.includes('motion-utils')
            ) {
              return 'vendor-motion';
            }
            // File processing
            if (
              id.includes('xlsx') ||
              id.includes('html2canvas')
            ) {
              return 'vendor-files';
            }
          }
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
