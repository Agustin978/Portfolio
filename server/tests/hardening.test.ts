import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { hashPassword } from '../src/shared/security/password.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

const PASSWORD = 'correct-horse-battery';
const CLIENT_ORIGIN = 'http://localhost:5173';

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

let ipCounter = 0;
const credentials = { email: 'admin@example.com', password: PASSWORD };
const post = (path: string, body: object = credentials) =>
  request(app).post(path).set('X-Forwarded-For', `172.16.0.${++ipCounter}`).send(body);

describe('origin guard', () => {
  it('rejects a state-changing request from a foreign Origin with the standard envelope', async () => {
    const res = await post('/api/v1/auth/login').set('Origin', 'https://evil.example');

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN_ORIGIN' } });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('applies to logout too', async () => {
    const res = await post('/api/v1/auth/logout').set('Origin', 'https://evil.example');

    expect(res.status).toBe(403);
  });

  it('allows the configured client origin', async () => {
    const res = await post('/api/v1/auth/login').set('Origin', CLIENT_ORIGIN);

    expect(res.status).toBe(200);
  });

  it('allows requests with no Origin header', async () => {
    expect((await post('/api/v1/auth/login')).status).toBe(200);
  });

  it('does not restrict safe methods', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');

    expect(res.status).toBe(200);
  });
});

describe('Cache-Control on /auth/*', () => {
  it('is no-store on success and on every kind of failure', async () => {
    const responses = [
      await post('/api/v1/auth/login'),
      await post('/api/v1/auth/login', { email: 'admin@example.com', password: 'wrong-pass-123' }),
      await post('/api/v1/auth/login', {}),
      await post('/api/v1/auth/logout'),
      await request(app).get('/api/v1/auth/me'),
    ];

    expect(responses.map((r) => r.status)).toEqual([200, 401, 400, 200, 401]);
    for (const res of responses) {
      expect(res.headers['cache-control']).toBe('no-store');
    }
  });
});
