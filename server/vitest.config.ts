import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Fixed values so tests never depend on a developer's local .env
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
  },
});
