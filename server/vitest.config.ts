import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

dotenv.config({ path: path.resolve(import.meta.dirname, '../.env'), quiet: true });

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    // Database tests never touch DATABASE_URL: the app config is pointed at the test database.
    // The placeholder keeps non-database tests (e.g. /health) runnable without one.
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      CLIENT_ORIGIN: 'http://localhost:5173',
      // Fixed here so auth tests never depend on (or leak) the developer's real secret.
      JWT_SECRET: 'test-only-jwt-secret-0123456789-abcdefghij',
      JWT_EXPIRES_IN_SECONDS: '28800',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgresql://unused:unused@localhost:5432/unused_test',
    },
    // Database tests share one database, so files must not run in parallel.
    fileParallelism: false,
  },
});
