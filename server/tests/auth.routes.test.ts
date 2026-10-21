import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { hashPassword } from '../src/shared/security/password.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

const PASSWORD = 'correct-horse-battery';

let db: TestDb;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  await db.adminUser.create({
    data: { email: 'admin@example.com', passwordHash: await hashPassword(PASSWORD) },
  });
});

// Each call gets its own client IP so the rate limiter's buckets never leak between tests.
let ipCounter = 0;
const nextIp = () => `10.0.0.${++ipCounter}`;

const login = (body: unknown, ip = nextIp()) =>
  request(app)
    .post('/api/v1/auth/login')
    .set('X-Forwarded-For', ip)
    .send(body as object);

const setCookies = (res: request.Response) => (res.headers['set-cookie'] ?? []) as string[];

describe('POST /api/v1/auth/login', () => {
  it('sets an httpOnly session cookie and returns the admin without the hash', async () => {
    const res = await login({ email: 'admin@example.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.admin).toEqual({ id: expect.any(Number), email: 'admin@example.com' });
    expect(JSON.stringify(res.body)).not.toMatch(/hash|\$argon2/i);

    const [cookie] = setCookies(res);
    expect(cookie).toMatch(/^session=[^;]+/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=28800/);
  });

  it('accepts the email with different casing and surrounding spaces', async () => {
    const res = await login({ email: '  Admin@Example.COM ', password: PASSWORD });

    expect(res.status).toBe(200);
  });

  it('answers a wrong password and an unknown email identically', async () => {
    const wrongPassword = await login({ email: 'admin@example.com', password: 'wrong-password-1' });
    const unknownEmail = await login({ email: 'nobody@example.com', password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(unknownEmail.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(setCookies(unknownEmail)).toHaveLength(0);
  });

  it('rejects malformed bodies with field errors and never echoes the password', async () => {
    const missing = await login({});
    const badEmail = await login({ email: 'not-an-email', password: 'secret-value-xyz' });

    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.error.details).toHaveProperty('email');
    expect(JSON.stringify(badEmail.body)).not.toContain('secret-value-xyz');
  });

  it('enforces the length caps on email (254) and password (256)', async () => {
    const longEmail = `${'a'.repeat(250)}@example.com`;

    expect((await login({ email: longEmail, password: PASSWORD })).status).toBe(400);
    expect((await login({ email: 'admin@example.com', password: 'x'.repeat(257) })).status).toBe(
      400,
    );
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('expires the session cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(200);
    const [cookie] = setCookies(res);
    expect(cookie).toMatch(/^session=;/);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
  });
});
