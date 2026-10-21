import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { adminMounts, app } from '../src/app.js';
import { createAdminSession } from './helpers/auth.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

let db: TestDb;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(() => resetDb(db));

// Express doesn't type its router internals, so the few fields read here are declared locally.
type RouteLayer = { route?: { path: string; methods: Record<string, boolean> } };

const listRoutes = () =>
  adminMounts.flatMap(({ path, router }) =>
    (router as unknown as { stack: RouteLayer[] }).stack.flatMap(({ route }) =>
      route
        ? Object.keys(route.methods).map((method) => ({
            method,
            url: `/api/v1/admin${path}${route.path === '/' ? '' : route.path}`,
          }))
        : [],
    ),
  );

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

  it('rejects every registered admin route with 401 when there is no session', async () => {
    const routes = listRoutes();
    expect(routes.length).toBeGreaterThan(0);

    for (const { method, url } of routes) {
      const res = await request(app)[method as 'get'](url.replace(/:\w+/g, '1')).send({});
      expect(res.status, `${method.toUpperCase()} ${url}`).toBe(401);
    }
  });
});
