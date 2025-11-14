import path from 'path';
import { fileURLToPath } from 'url';

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig as defineViteConfig } from 'vite';
import { defineConfig as defineVitestConfig, mergeConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const viteConfig = defineViteConfig({
  plugins: [react(), tanstackRouter(), tailwindcss()],
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
