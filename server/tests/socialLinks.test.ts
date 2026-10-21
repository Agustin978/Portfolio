import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { createAdminSession } from './helpers/auth.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

let db: TestDb;
let cookie: string;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  ({ cookie } = await createAdminSession(db));
});

const keys = (value: object) => Object.keys(value).sort();
const base = '/api/v1/admin/social-links';
const body = { platform: 'github', url: 'https://github.com/ana' };
const create = (data: object = body) => request(app).post(base).set('Cookie', cookie).send(data);

describe('GET /api/v1/social-links (public)', () => {
  it('returns only visible links, exactly platform and url, ordered by sortOrder then id', async () => {
    await db.socialLink.create({ data: { platform: 'b', url: 'https://b.example', sortOrder: 1 } });
    await db.socialLink.create({
      data: { platform: 'hidden', url: 'https://h.example', isVisible: false },
    });
    await db.socialLink.create({ data: { platform: 'a', url: 'https://a.example', sortOrder: 1 } });
    await db.socialLink.create({
      data: { platform: 'first', url: 'https://f.example', sortOrder: 0 },
    });

    const res = await request(app).get('/api/v1/social-links');

    expect(res.status).toBe(200);
    expect(res.body.data.map((l: { platform: string }) => l.platform)).toEqual(['first', 'b', 'a']);
    expect(keys(res.body.data[0])).toEqual(['platform', 'url']);
    expect(res.body.meta).toEqual({ count: 3 });
  });
});

describe('/api/v1/admin/social-links', () => {
  it('creates with defaults and lists hidden links too', async () => {
    const created = await create();
    await create({ platform: 'linkedin', url: 'https://linkedin.com/in/ana', isVisible: false });

    const res = await request(app).get(base).set('Cookie', cookie);

    expect(created.status).toBe(201);
    expect(keys(created.body.data)).toEqual(['id', 'isVisible', 'platform', 'sortOrder', 'url']);
    expect(created.body.data).toMatchObject({ isVisible: true, sortOrder: 0 });
    expect(res.body.data).toHaveLength(2);
  });

  it('hides and shows a link through PATCH isVisible', async () => {
    const { body: created } = await create();
    const patch = (data: object) =>
      request(app).patch(`${base}/${created.data.id}`).set('Cookie', cookie).send(data);

    expect((await patch({ isVisible: false })).body.data.isVisible).toBe(false);
    expect((await request(app).get('/api/v1/social-links')).body.data).toHaveLength(0);

    expect((await patch({ isVisible: true })).body.data.isVisible).toBe(true);
    expect((await request(app).get('/api/v1/social-links')).body.data).toHaveLength(1);
  });

  it('normalizes the platform key and accepts only http(s) URLs', async () => {
    const ok = await create({ platform: '  GitHub ', url: 'https://github.com/ana' });

    expect(ok.body.data.platform).toBe('github');
    expect((await create({ platform: 'x', url: 'javascript:alert(1)' })).status).toBe(400);
    expect((await create({ platform: 'mail', url: 'mailto:ana@example.com' })).status).toBe(400);
    expect((await create({ platform: 'Bad Key!', url: 'https://x.example' })).status).toBe(400);
  });

  it('answers a duplicate platform with 409 and an unknown id with 404', async () => {
    await create();
    const duplicate = await create();
    const missing = await request(app)
      .patch(`${base}/99999`)
      .set('Cookie', cookie)
      .send({ url: 'https://x.example' });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('PLATFORM_TAKEN');
    expect(missing.status).toBe(404);
  });

  it('rejects an empty patch and unknown keys', async () => {
    const { body: created } = await create();
    const patch = (data: object) =>
      request(app).patch(`${base}/${created.data.id}`).set('Cookie', cookie).send(data);

    expect((await patch({})).status).toBe(400);
    expect((await patch({ color: 'red' })).status).toBe(400);
  });

  it('has no delete endpoint', async () => {
    const { body: created } = await create();

    const res = await request(app).delete(`${base}/${created.data.id}`).set('Cookie', cookie);

    expect(res.status).toBe(404);
    expect(await db.socialLink.count()).toBe(1);
  });
});
