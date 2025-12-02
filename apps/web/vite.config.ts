import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig as defineViteConfig, type Plugin } from 'vite';
import { defineConfig as defineVitestConfig, mergeConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin to copy static content files (PDFs, images) from content/ to public/content/
const copyContentAssets = (): Plugin => {
  const contentDir = path.resolve(__dirname, 'content');
  const publicContentDir = path.resolve(__dirname, 'public/content');
  const staticExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

  const copyRecursive = (src: string, dest: string) => {
    if (!fs.existsSync(src)) return;

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else if (staticExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  return {
    name: 'copy-content-assets',
    buildStart() {
      copyRecursive(contentDir, publicContentDir);

      // Copy PDF Worker
      const pdfWorkerSrc = path.resolve(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
      const pdfWorkerDest = path.resolve(__dirname, 'public/pdf.worker.min.mjs');
      if (fs.existsSync(pdfWorkerSrc)) {
        fs.mkdirSync(path.dirname(pdfWorkerDest), { recursive: true });
        fs.copyFileSync(pdfWorkerSrc, pdfWorkerDest);
        console.log('Copied PDF worker to public/');
      } else {
        console.warn('PDF worker not found at:', pdfWorkerSrc);
      }
    },
  };
};

const viteConfig = defineViteConfig({
  plugins: [react(), tanstackRouter(), tailwindcss(), copyContentAssets()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
});

const vitestConfig = defineVitestConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});

export default mergeConfig(viteConfig, vitestConfig);
