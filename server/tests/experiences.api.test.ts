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
const admin = '/api/v1/admin/experiences';
const post = (data: object) => request(app).post(admin).set('Cookie', cookie).send(data);
const patch = (id: number, data: object) =>
  request(app).patch(`${admin}/${id}`).set('Cookie', cookie).send(data);
const getAdmin = (id: number) => request(app).get(`${admin}/${id}`).set('Cookie', cookie);

const copy = {
  roleEs: 'Desarrollador',
  roleEn: 'Developer',
  descriptionEs: 'Descripción',
  descriptionEn: 'Description',
};
const publishedRow = (overrides: object = {}) => ({
  company: 'Acme',
  startDate: new Date('2022-01-01'),
  ...copy,
  status: 'published' as const,
  ...overrides,
});
const completeBody = () => ({
  company: 'Acme',
  startDate: '2022-01-01',
  ...copy,
  status: 'published',
});

const createTechnology = (slug: string, sortOrder = 0) =>
  db.technology.create({ data: { slug, name: slug.toUpperCase(), sortOrder } });

describe('GET /api/v1/experiences (public)', () => {
  it('lists only published, active experiences with exactly the public keys', async () => {
    await db.experience.create({ data: publishedRow({ company: 'Visible' }) });
    await db.experience.create({
      data: publishedRow({ company: 'Inactive', deactivatedAt: new Date() }),
    });
    await db.experience.create({ data: { company: 'Draft', startDate: new Date('2022-01-01') } });

    const res = await request(app).get('/api/v1/experiences');

    expect(res.status).toBe(200);
    expect(res.body.data.map((e: { company: string }) => e.company)).toEqual(['Visible']);
    expect(res.body.meta).toEqual({ count: 1 });
    expect(keys(res.body.data[0])).toEqual([
      'company',
      'companyUrl',
      'description',
      'endDate',
      'id',
      'location',
      'role',
      'startDate',
      'technologies',
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/roleEs|descriptionEn|status|deactivated/);
  });

  it('translates to the requested language and rejects an invalid lang', async () => {
    await db.experience.create({
      data: publishedRow({ company: 'Acme' }),
    });
    const es = await request(app).get('/api/v1/experiences');
    const en = await request(app).get('/api/v1/experiences?lang=en');

    expect(es.body.data[0]).toMatchObject({ role: 'Desarrollador', description: 'Descripción' });
    expect(en.body.data[0]).toMatchObject({ role: 'Developer', description: 'Description' });
    expect((await request(app).get('/api/v1/experiences?lang=xx')).status).toBe(400);
  });

  it('puts current positions first, then newest start date first, ties broken by id', async () => {
    const finishedOld = await db.experience.create({
      data: publishedRow({
        company: 'Old',
        startDate: new Date('2015-01-01'),
        endDate: new Date('2024-06-01'),
      }),
    });
    const finishedNew = await db.experience.create({
      data: publishedRow({
        company: 'New',
        startDate: new Date('2019-01-01'),
        endDate: new Date('2020-01-01'),
      }),
    });
    const currentOld = await db.experience.create({
      data: publishedRow({ company: 'Current Old', startDate: new Date('2020-01-01') }),
    });
    const currentNew = await db.experience.create({
      data: publishedRow({ company: 'Current New', startDate: new Date('2023-01-01') }),
    });
    const tieA = await db.experience.create({
      data: publishedRow({
        company: 'Tie A',
        startDate: new Date('2019-01-01'),
        endDate: new Date('2019-12-01'),
      }),
    });

    const res = await request(app).get('/api/v1/experiences');

    // "Old" ended last but started earliest, so it comes after the later-started finished jobs.
    expect(res.body.data.map((e: { id: number }) => e.id)).toEqual([
      currentNew.id,
      currentOld.id,
      finishedNew.id,
      tieA.id,
      finishedOld.id,
    ]);
  });

  it('includes technologies ordered by their own sortOrder', async () => {
    const experience = await db.experience.create({ data: publishedRow() });
    const second = await createTechnology('second', 2);
    const first = await createTechnology('first', 1);
    await db.experienceTechnology.createMany({
      data: [second, first].map((t) => ({ experienceId: experience.id, technologyId: t.id })),
    });

    const res = await request(app).get('/api/v1/experiences');

    expect(res.body.data[0].technologies).toEqual([
      { slug: 'first', name: 'FIRST' },
      { slug: 'second', name: 'SECOND' },
    ]);
  });
});

describe('POST /api/v1/admin/experiences', () => {
  it('saves a minimal draft with defaults and the full admin shape', async () => {
    const res = await post({ company: 'Acme', startDate: '2022-01-01' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      company: 'Acme',
      startDate: '2022-01-01',
      endDate: null,
      status: 'draft',
      sortOrder: 0,
      deactivatedAt: null,
      technologyIds: [],
    });
    expect(keys(res.body.data)).toEqual([
      'company',
      'companyUrl',
      'createdAt',
      'deactivatedAt',
      'descriptionEn',
      'descriptionEs',
      'endDate',
      'id',
      'location',
      'roleEn',
      'roleEs',
      'sortOrder',
      'startDate',
      'status',
      'technologyIds',
      'updatedAt',
    ]);
  });

  it('publishes a complete experience', async () => {
    const res = await post(completeBody());

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('published');
  });

  it('answers an incomplete publication with 422 naming the missing fields', async () => {
    const res = await post({ ...completeBody(), roleEn: '  ', descriptionEs: null });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INCOMPLETE_TRANSLATION');
    expect(res.body.error.details.missing.sort()).toEqual(['descriptionEs', 'roleEn']);
    expect(await db.experience.count()).toBe(0);
  });

  it('assigns technologies without duplicates and 422s on an unknown technology', async () => {
    const a = await createTechnology('a');

    const ok = await post({ ...completeBody(), technologyIds: [a.id, a.id] });
    const bad = await post({ ...completeBody(), technologyIds: [a.id, 99999] });

    expect(ok.body.data.technologyIds).toEqual([a.id]);
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe('INVALID_REFERENCE');
    expect(await db.experience.count()).toBe(1);
  });

  it('validates the body: dates, url, status, unknown and server-controlled keys', async () => {
    const bad = [
      { startDate: '2022-02-31' },
      { startDate: null },
      { startDate: '2022-05-01', endDate: '2022-04-01' },
      { companyUrl: 'javascript:alert(1)' },
      { status: 'archived' },
      { company: '   ' },
      { deactivatedAt: null },
    ];
    for (const extra of bad) {
      const res = await post({ company: 'Acme', startDate: '2022-01-01', ...extra });
      expect(res.status, JSON.stringify(extra)).toBe(400);
    }
    expect((await post({ startDate: '2022-01-01' })).status).toBe(400);
  });
});

describe('PATCH /api/v1/admin/experiences/:id', () => {
  it('changes only the fields sent', async () => {
    const created = (await post({ company: 'Acme', startDate: '2022-01-01', roleEs: 'Dev' })).body
      .data;

    const res = await patch(created.id, { roleEn: 'Dev EN', location: 'Remote' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ roleEs: 'Dev', roleEn: 'Dev EN', location: 'Remote' });
  });

  it('rejects an empty patch and unknown keys', async () => {
    const created = (await post({ company: 'Acme', startDate: '2022-01-01' })).body.data;

    expect((await patch(created.id, {})).status).toBe(400);
    expect((await patch(created.id, { slug: 'x' })).status).toBe(400);
  });

  it('validates the resulting state: emptying a required field of a published item is a 422', async () => {
    const created = (await post(completeBody())).body.data;

    const res = await patch(created.id, { roleEn: '   ' });

    expect(res.status).toBe(422);
    expect(res.body.error.details.missing).toEqual(['roleEn']);
    expect((await getAdmin(created.id)).body.data.roleEn).toBe('Developer');
  });

  it('publishing a draft needs the whole state to be complete, unpublishing never does', async () => {
    const created = (await post({ company: 'Acme', startDate: '2022-01-01', roleEs: 'Dev' })).body
      .data;

    const incomplete = await patch(created.id, { status: 'published' });
    const complete = await patch(created.id, {
      status: 'published',
      roleEn: 'Dev',
      descriptionEs: 'Desc',
      descriptionEn: 'Desc',
    });
    const unpublished = await patch(created.id, { status: 'draft', roleEn: '' });

    expect(incomplete.status).toBe(422);
    expect(incomplete.body.error.details.missing.sort()).toEqual([
      'descriptionEn',
      'descriptionEs',
      'roleEn',
    ]);
    expect(complete.status).toBe(200);
    expect(unpublished.status).toBe(200);
  });

  it('rejects an end date before the stored start date', async () => {
    const created = (await post({ company: 'Acme', startDate: '2022-05-01' })).body.data;

    expect((await patch(created.id, { endDate: '2022-04-01' })).status).toBe(400);
    expect((await patch(created.id, { endDate: '2022-06-01' })).status).toBe(200);
    expect((await patch(created.id, { startDate: '2022-07-01' })).status).toBe(400);
    expect((await patch(created.id, { endDate: null })).body.data.endDate).toBeNull();
  });

  it('technologyIds: omitted changes nothing, [] empties, a list replaces, bad ids roll back', async () => {
    const a = await createTechnology('a');
    const b = await createTechnology('b');
    const created = (
      await post({ company: 'Acme', startDate: '2022-01-01', technologyIds: [a.id] })
    ).body.data;

    const untouched = await patch(created.id, { location: 'Remote' });
    const replaced = await patch(created.id, { technologyIds: [b.id, b.id] });
    const rolledBack = await patch(created.id, { location: 'Lost', technologyIds: [a.id, 99999] });
    const emptied = await patch(created.id, { technologyIds: [] });

    expect(untouched.body.data.technologyIds).toEqual([a.id]);
    expect(replaced.body.data.technologyIds).toEqual([b.id]);
    expect(rolledBack.status).toBe(422);
    expect(emptied.body.data.technologyIds).toEqual([]);
    expect(emptied.body.data.location).toBe('Remote');
  });

  it('404s on an unknown id', async () => {
    const res = await patch(99999, { location: 'Remote' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EXPERIENCE_NOT_FOUND');
  });

  it('editing a deactivated experience works and never reactivates it', async () => {
    const created = (await post({ company: 'Acme', startDate: '2022-01-01' })).body.data;
    await request(app).patch(`${admin}/${created.id}/deactivate`).set('Cookie', cookie);

    const res = await patch(created.id, { location: 'Edited' });

    expect(res.status).toBe(200);
    expect(res.body.data.location).toBe('Edited');
    expect(res.body.data.deactivatedAt).toEqual(expect.any(String));
  });
});

describe('admin listing, deactivation and deletion', () => {
  it('lists active experiences by default and everything with includeDeactivated=true', async () => {
    await db.experience.create({ data: { company: 'A', startDate: new Date('2022-01-01') } });
    await db.experience.create({
      data: { company: 'B', startDate: new Date('2021-01-01'), deactivatedAt: new Date() },
    });

    const byDefault = await request(app).get(admin).set('Cookie', cookie);
    const all = await request(app).get(`${admin}?includeDeactivated=true`).set('Cookie', cookie);
    const bad = await request(app).get(`${admin}?includeDeactivated=yes`).set('Cookie', cookie);

    expect(byDefault.body.data.map((e: { company: string }) => e.company)).toEqual(['A']);
    expect(all.body.data).toHaveLength(2);
    expect(all.body.meta).toEqual({ count: 2 });
    expect(bad.status).toBe(400);
    expect(keys(all.body.data[0])).toEqual([
      'company',
      'deactivatedAt',
      'endDate',
      'id',
      'roleEn',
      'roleEs',
      'sortOrder',
      'startDate',
      'status',
      'updatedAt',
    ]);
  });

  it('deactivates and reactivates, hiding it from the public API meanwhile', async () => {
    const created = (await post(completeBody())).body.data;
    const publicIds = async () =>
      (await request(app).get('/api/v1/experiences')).body.data.map((e: { id: number }) => e.id);

    const off = await request(app).patch(`${admin}/${created.id}/deactivate`).set('Cookie', cookie);
    expect(off.status).toBe(200);
    expect(await publicIds()).toEqual([]);

    const again = await request(app)
      .patch(`${admin}/${created.id}/deactivate`)
      .set('Cookie', cookie);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('EXPERIENCE_ALREADY_DEACTIVATED');

    const on = await request(app).patch(`${admin}/${created.id}/reactivate`).set('Cookie', cookie);
    expect(on.body.data.deactivatedAt).toBeNull();
    expect(await publicIds()).toEqual([created.id]);

    expect(
      (await request(app).patch(`${admin}/${created.id}/reactivate`).set('Cookie', cookie)).status,
    ).toBe(409);
  });

  it('404s on unknown ids and has no DELETE route', async () => {
    const created = (await post({ company: 'Acme', startDate: '2022-01-01' })).body.data;

    expect((await getAdmin(99999)).status).toBe(404);
    expect(
      (await request(app).patch(`${admin}/99999/deactivate`).set('Cookie', cookie)).status,
    ).toBe(404);
    expect((await request(app).delete(`${admin}/${created.id}`).set('Cookie', cookie)).status).toBe(
      404,
    );
    expect(await db.experience.count()).toBe(1);
  });
});
