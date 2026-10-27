import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { createAdminSession } from './helpers/auth.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

const BASE = '/api/v1/admin/contact-messages';

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

const get = (url: string) => request(app).get(url).set('Cookie', cookie);

// Explicit timestamps make the newest-first order checkable; equal ones test the id tie-break.
const seed = (count: number, overrides: Record<string, unknown> = {}) =>
  db.contactMessage.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      name: `Visitor ${i + 1}`,
      email: `v${i + 1}@example.com`,
      message: `Message number ${i + 1} body`,
      createdAt: new Date(Date.UTC(2026, 9, 1, 0, i)),
      ...overrides,
    })),
  });

describe('GET /admin/contact-messages', () => {
  it('requires a session', async () => {
    const res = await request(app).get(BASE);

    expect(res.status).toBe(401);
  });

  it('lists newest first with the total in meta, without the message body', async () => {
    await seed(3);

    const res = await get(BASE);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.data.map((m: { name: string }) => m.name)).toEqual([
      'Visitor 3',
      'Visitor 2',
      'Visitor 1',
    ]);
    expect(res.body.meta).toEqual({ count: 3, total: 3, page: 1, limit: 20 });
    expect(res.body.data[0]).toEqual({
      id: expect.any(Number),
      name: 'Visitor 3',
      email: 'v3@example.com',
      lang: 'es',
      emailStatus: 'pending',
      sentAt: null,
      isRead: false,
      createdAt: '2026-10-01T00:02:00.000Z',
    });
  });

  it('breaks createdAt ties by id descending', async () => {
    const same = new Date('2026-10-01T00:00:00Z');
    await seed(3, { createdAt: same });

    const res = await get(BASE);

    const ids = res.body.data.map((m: { id: number }) => m.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });

  it('defaults to 20 per page, and pages through the rest', async () => {
    await seed(25);

    const first = await get(BASE);
    const second = await get(`${BASE}?page=2`);

    expect(first.body.data).toHaveLength(20);
    expect(first.body.meta).toEqual({ count: 20, total: 25, page: 1, limit: 20 });
    expect(second.body.data).toHaveLength(5);
    expect(second.body.meta).toEqual({ count: 5, total: 25, page: 2, limit: 20 });
    expect(second.body.data[4].name).toBe('Visitor 1');
  });

  it('honours limit up to 100 and rejects anything beyond or malformed', async () => {
    await seed(5);

    const small = await get(`${BASE}?limit=2&page=3`);
    expect(small.body.data.map((m: { name: string }) => m.name)).toEqual(['Visitor 1']);
    expect(small.body.meta).toEqual({ count: 1, total: 5, page: 3, limit: 2 });

    expect((await get(`${BASE}?limit=100`)).status).toBe(200);
    for (const bad of ['limit=101', 'limit=0', 'limit=-1', 'limit=abc', 'limit=', 'limit=1e1']) {
      expect((await get(`${BASE}?${bad}`)).status, bad).toBe(400);
    }
    for (const bad of ['page=0', 'page=-2', 'page=x', 'page=1.5']) {
      expect((await get(`${BASE}?${bad}`)).status, bad).toBe(400);
    }
  });

  it('answers an empty page past the end with the real total', async () => {
    await seed(3);

    const res = await get(`${BASE}?page=9`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({ count: 0, total: 3, page: 9, limit: 20 });
  });

  it('filters by isRead and counts only the filtered rows in total', async () => {
    await seed(3);
    await db.contactMessage.updateMany({ where: { name: 'Visitor 1' }, data: { isRead: true } });

    const unread = await get(`${BASE}?isRead=false`);
    const read = await get(`${BASE}?isRead=true`);

    expect(unread.body.data.map((m: { name: string }) => m.name)).toEqual([
      'Visitor 3',
      'Visitor 2',
    ]);
    expect(unread.body.meta.total).toBe(2);
    expect(read.body.data.map((m: { name: string }) => m.name)).toEqual(['Visitor 1']);
    expect(read.body.meta.total).toBe(1);
    expect((await get(`${BASE}?isRead=maybe`)).status).toBe(400);
  });
});

describe('GET /admin/contact-messages/:id', () => {
  it('returns the full message with the email outcome', async () => {
    const row = await db.contactMessage.create({
      data: {
        name: 'Ana',
        email: 'ana@example.com',
        message: 'Línea uno\nLínea dos',
        lang: 'en',
        emailStatus: 'failed',
        emailError: 'timeout',
      },
    });

    const res = await get(`${BASE}/${row.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: row.id,
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Línea uno\nLínea dos',
      lang: 'en',
      emailStatus: 'failed',
      emailError: 'timeout',
      isRead: false,
    });
  });

  it('answers 404 for a missing id and 400 for a malformed one', async () => {
    const missing = await get(`${BASE}/999`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('CONTACT_MESSAGE_NOT_FOUND');
    expect((await get(`${BASE}/abc`)).status).toBe(400);
    expect((await get(`${BASE}/99999999999`)).status).toBe(400);
  });
});

describe('PATCH /admin/contact-messages/:id', () => {
  it('marks a message read and unread', async () => {
    await seed(1);
    const { id } = await db.contactMessage.findFirstOrThrow();

    const read = await request(app)
      .patch(`${BASE}/${id}`)
      .set('Cookie', cookie)
      .send({ isRead: true });
    expect(read.status).toBe(200);
    expect(read.body.data.isRead).toBe(true);
    expect((await db.contactMessage.findUniqueOrThrow({ where: { id } })).isRead).toBe(true);

    const unread = await request(app)
      .patch(`${BASE}/${id}`)
      .set('Cookie', cookie)
      .send({ isRead: false });
    expect(unread.body.data.isRead).toBe(false);
  });

  it('rejects other fields, an empty body and a non-boolean, and 404s a missing id', async () => {
    await seed(1);
    const { id } = await db.contactMessage.findFirstOrThrow();
    const patch = (target: number, body: object) =>
      request(app).patch(`${BASE}/${target}`).set('Cookie', cookie).send(body);

    expect((await patch(id, { message: 'edited' })).status).toBe(400);
    expect((await patch(id, { isRead: true, name: 'x' })).status).toBe(400);
    expect((await patch(id, {})).status).toBe(400);
    expect((await patch(id, { isRead: 'true' })).status).toBe(400);
    const missing = await patch(999, { isRead: true });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('CONTACT_MESSAGE_NOT_FOUND');
    expect((await db.contactMessage.findUniqueOrThrow({ where: { id } })).isRead).toBe(false);
  });
});

describe('DELETE /admin/contact-messages/:id', () => {
  it('deletes the row for real and answers data null', async () => {
    await seed(2);
    const { id } = await db.contactMessage.findFirstOrThrow();

    const res = await request(app).delete(`${BASE}/${id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: null, meta: {} });
    expect(await db.contactMessage.count()).toBe(1);
    expect((await get(`${BASE}/${id}`)).status).toBe(404);
  });

  it('answers 404 the second time and for an unknown id', async () => {
    await seed(1);
    const { id } = await db.contactMessage.findFirstOrThrow();
    await request(app).delete(`${BASE}/${id}`).set('Cookie', cookie);

    const again = await request(app).delete(`${BASE}/${id}`).set('Cookie', cookie);

    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('CONTACT_MESSAGE_NOT_FOUND');
    expect((await request(app).delete(`${BASE}/abc`).set('Cookie', cookie)).status).toBe(400);
  });

  it('refuses a foreign Origin before touching the row', async () => {
    await seed(1);
    const { id } = await db.contactMessage.findFirstOrThrow();

    const res = await request(app)
      .delete(`${BASE}/${id}`)
      .set('Cookie', cookie)
      .set('Origin', 'https://evil.example');

    expect(res.status).toBe(403);
    expect(await db.contactMessage.count()).toBe(1);
  });
});
