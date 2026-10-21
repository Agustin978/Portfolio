import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { createAdminSession } from './helpers/auth.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

let db: TestDb;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(() => resetDb(db));

describe('/api/v1/admin', () => {
  it('answers 401 with no-store to any path without a session', async () => {
    const res = await request(app).get('/api/v1/admin/does-not-exist');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('lets an authenticated request through to the 404 handler', async () => {
    const { cookie } = await createAdminSession(db);

    const res = await request(app).get('/api/v1/admin/does-not-exist').set('Cookie', cookie);

    expect(res.status).toBe(404);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
