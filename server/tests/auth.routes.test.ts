import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { hashPassword } from '../src/shared/security/password.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

const PASSWORD = 'correct-horse-battery';

let db: TestDb;
let adminId: number;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  const admin = await db.adminUser.create({
    data: { email: 'admin@example.com', passwordHash: await hashPassword(PASSWORD) },
  });
  adminId = admin.id;
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

describe('GET /api/v1/auth/me', () => {
  const secret = process.env.JWT_SECRET!;
  const me = (token?: string) => {
    const req = request(app).get('/api/v1/auth/me');
    return token === undefined ? req : req.set('Cookie', `session=${token}`);
  };
  const sign = (options: jwt.SignOptions = {}, key = secret, subject = String(adminId)) =>
    jwt.sign({}, key, { algorithm: 'HS256', subject, ...options });

  const expectUnauthenticated = (res: request.Response) => {
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHENTICATED' } });
  };

  it('returns the admin for the cookie issued by login', async () => {
    const loginRes = await login({ email: 'admin@example.com', password: PASSWORD });
    const cookie = setCookies(loginRes)[0]!.split(';')[0]!;

    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.admin).toEqual({ id: adminId, email: 'admin@example.com' });
    expect(JSON.stringify(res.body)).not.toMatch(/hash/i);
  });

  it('rejects a request without a cookie', async () => {
    expectUnauthenticated(await me());
  });

  it('rejects a tampered token', async () => {
    expectUnauthenticated(await me(`${sign()}x`));
  });

  it('rejects a token signed with another secret', async () => {
    expectUnauthenticated(await me(sign({}, 'another-secret-0123456789-abcdefghijkl')));
  });

  it('rejects a token with alg none', async () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: String(adminId) })}.`;

    expectUnauthenticated(await me(unsigned));
  });

  it('rejects an expired token', async () => {
    expectUnauthenticated(await me(sign({ expiresIn: -10 })));
  });

  it('rejects a token for an admin that does not exist', async () => {
    expectUnauthenticated(await me(sign({}, secret, String(adminId + 999))));
  });

  it('rejects a token issued before admin_users.updated_at', async () => {
    const token = sign();
    await db.adminUser.update({
      where: { id: adminId },
      data: { updatedAt: new Date(Date.now() + 5000) },
    });

    expectUnauthenticated(await me(token));
  });
});
