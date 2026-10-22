import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const sourceEntry = '<script type="module" src="/src/main.tsx"></script>';

export default defineConfig(({ command }) => ({
  // Relative URLs so GitHub Pages can serve the built files from /TASKER/.
  base: command === 'build' ? './' : '/',
  plugins: [
    react(),
    {
      name: 'dev-source-entry',
      apply: 'serve',
      transformIndexHtml: {
        order: 'pre',
        handler(html: string) {
          return html
            .replace(/<link rel="stylesheet"[^>]*href="[^"]*assets\/[^"]+"[^>]*>\s*/g, '')
            .replace(
              /<script type="module"[^>]*src="[^"]*assets\/[^"]+"[^>]*><\/script>/,
              sourceEntry,
            );
        },
      },
    },
  ],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'index.dev.html'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
