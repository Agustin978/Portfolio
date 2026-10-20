import { execSync } from 'node:child_process';

// Brings the test database to the latest migration before the suite runs.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return; // database tests will fail with an explanatory message

  // Same guard as createTestDb: never run migrations against a database that isn't a test one.
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.endsWith('_test')) return;

  execSync('npx prisma migrate deploy', {
    cwd: import.meta.dirname + '/..',
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
