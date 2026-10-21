import { execSync } from 'node:child_process';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { verifyPassword } from '../src/shared/security/password.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

let db: TestDb;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(() => resetDb(db));

// Runs the real seed script as a child process against the test database.
const runSeed = (email: string, password: string) =>
  execSync('npx tsx prisma/seed.ts', {
    cwd: import.meta.dirname + '/..',
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      ADMIN_EMAIL: email,
      ADMIN_PASSWORD: password,
    },
    stdio: 'pipe',
  });

describe('seed', { timeout: 60_000 }, () => {
  it('creates the admin with a normalized email and a verifiable hash', async () => {
    runSeed('  Admin@Example.COM ', 'first-password-123');

    const admins = await db.adminUser.findMany();
    expect(admins).toHaveLength(1);
    expect(admins[0]!.email).toBe('admin@example.com');
    expect(await verifyPassword(admins[0]!.passwordHash, 'first-password-123')).toBe(true);
  });

  it('rewrites password_hash when re-run with another ADMIN_PASSWORD', async () => {
    runSeed('admin@example.com', 'first-password-123');
    const before = await db.adminUser.findFirstOrThrow();

    runSeed('admin@example.com', 'second-password-456');

    const after = await db.adminUser.findMany();
    expect(after).toHaveLength(1);
    expect(after[0]!.passwordHash).not.toBe(before.passwordHash);
    expect(await verifyPassword(after[0]!.passwordHash, 'second-password-456')).toBe(true);
    expect(await verifyPassword(after[0]!.passwordHash, 'first-password-123')).toBe(false);
    expect(after[0]!.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  });

  it('treats a differently-cased email as the same admin', async () => {
    runSeed('admin@example.com', 'first-password-123');
    runSeed('ADMIN@example.com', 'second-password-456');

    expect(await db.adminUser.count()).toBe(1);
  });
});
