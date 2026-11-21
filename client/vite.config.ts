/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Same-origin in dev: the browser talks to Vite, which forwards /api to the Express server.
    proxy: { '/api': 'http://localhost:4000' },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    env: {
      // Fixed here so tests never depend on a developer's client/.env.
      VITE_API_URL: '',
      // West of UTC, like the site's visitors: a date read in local time slips to the day before.
      TZ: 'America/Argentina/Buenos_Aires',
    },
    restoreMocks: true,
    unstubGlobals: true,
  },
});
