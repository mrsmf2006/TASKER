import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function siteBase() {
  const raw = process.env.VITE_BASE?.trim();
  if (!raw) return '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

export default defineConfig({
  base: siteBase(),
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
