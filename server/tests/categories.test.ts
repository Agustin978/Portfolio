import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { createAdminSession } from './helpers/auth.js';
import {
  createCategory,
  createProject,
  createTestDb,
  fullProjectCopy,
  resetDb,
  type TestDb,
} from './helpers/testDb.js';

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

const published = { ...fullProjectCopy, status: 'published' as const };
const keys = (value: object) => Object.keys(value).sort();

describe('GET /api/v1/project-categories (public)', () => {
  it('lists only categories with a published, active project, ordered by sortOrder then id', async () => {
    const second = await db.projectCategory.create({
      data: { slug: 'second', nameEs: 'Segunda', nameEn: 'Second', sortOrder: 2 },
    });
    const firstB = await db.projectCategory.create({
      data: { slug: 'first-b', nameEs: 'Primera B', nameEn: 'First B', sortOrder: 1 },
    });
    const firstA = await db.projectCategory.create({
      data: { slug: 'first-a', nameEs: 'Primera A', nameEn: 'First A', sortOrder: 1 },
    });
    const draftOnly = await createCategory(db);
    const deactivatedOnly = await createCategory(db);
    await createProject(db, second.id, published);
    await createProject(db, firstB.id, published);
    await createProject(db, firstA.id, published);
    await createProject(db, draftOnly.id, { status: 'draft' });
    await createProject(db, deactivatedOnly.id, { ...published, deactivatedAt: new Date() });

    const res = await request(app).get('/api/v1/project-categories');

    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { slug: string }) => c.slug)).toEqual([
      'first-b',
      'first-a',
      'second',
    ]);
    expect(res.body.meta).toEqual({ count: 3 });
  });

  it('returns exactly slug and name, in the requested language', async () => {
    const category = await db.projectCategory.create({
      data: { slug: 'web', nameEs: 'Web ES', nameEn: 'Web EN' },
    });
    await createProject(db, category.id, published);

    const es = await request(app).get('/api/v1/project-categories');
    const en = await request(app).get('/api/v1/project-categories?lang=en');

    expect(keys(es.body.data[0])).toEqual(['name', 'slug']);
    expect(es.body.data[0].name).toBe('Web ES');
    expect(en.body.data[0].name).toBe('Web EN');
  });

  it('rejects an invalid lang with 400', async () => {
    const res = await request(app).get('/api/v1/project-categories?lang=fr');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('/api/v1/admin/project-categories', () => {
  const body = { slug: 'web', nameEs: 'Web', nameEn: 'Web' };
  const create = (data: object = body) =>
    request(app).post('/api/v1/admin/project-categories').set('Cookie', cookie).send(data);

  it('creates a category and returns the admin shape', async () => {
    const res = await create();

    expect(res.status).toBe(201);
    expect(keys(res.body.data)).toEqual([
      'id',
      'nameEn',
      'nameEs',
      'projectsCount',
      'slug',
      'sortOrder',
    ]);
    expect(res.body.data).toMatchObject({ slug: 'web', sortOrder: 0, projectsCount: 0 });
  });

  it('lists every category, including ones without published projects', async () => {
    await create();

    const res = await request(app).get('/api/v1/admin/project-categories').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ count: 1 });
  });

  it('gets one by id and 404s on an unknown id', async () => {
    const { body: created } = await create();

    const found = await request(app)
      .get(`/api/v1/admin/project-categories/${created.data.id}`)
      .set('Cookie', cookie);
    const missing = await request(app)
      .get('/api/v1/admin/project-categories/99999')
      .set('Cookie', cookie);

    expect(found.status).toBe(200);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('rejects a bad id with 400', async () => {
    const res = await request(app)
      .get('/api/v1/admin/project-categories/abc')
      .set('Cookie', cookie);

    expect(res.status).toBe(400);
  });

  it('updates only the fields sent', async () => {
    const { body: created } = await create();

    const res = await request(app)
      .patch(`/api/v1/admin/project-categories/${created.data.id}`)
      .set('Cookie', cookie)
      .send({ nameEn: 'Web Dev', sortOrder: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      slug: 'web',
      nameEs: 'Web',
      nameEn: 'Web Dev',
      sortOrder: 5,
    });
  });

  it('rejects an empty patch, unknown keys and blank names with 400', async () => {
    const { body: created } = await create();
    const patch = (data: object) =>
      request(app)
        .patch(`/api/v1/admin/project-categories/${created.data.id}`)
        .set('Cookie', cookie)
        .send(data);

    expect((await patch({})).status).toBe(400);
    expect((await patch({ colour: 'red' })).status).toBe(400);
    expect((await patch({ nameEs: '   ' })).status).toBe(400);
    expect((await create({ ...body, slug: 'Not A Slug' })).status).toBe(400);
  });

  it('answers a duplicate slug with 409 on create and on update', async () => {
    await create();
    const { body: other } = await create({ ...body, slug: 'data' });

    const duplicateCreate = await create();
    const duplicateUpdate = await request(app)
      .patch(`/api/v1/admin/project-categories/${other.data.id}`)
      .set('Cookie', cookie)
      .send({ slug: 'web' });

    expect(duplicateCreate.status).toBe(409);
    expect(duplicateCreate.body.error.code).toBe('SLUG_TAKEN');
    expect(duplicateUpdate.status).toBe(409);
  });

  it('answers an update of a missing category with 404, not 500', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/project-categories/99999')
      .set('Cookie', cookie)
      .send({ nameEs: 'X' });

    expect(res.status).toBe(404);
  });

  it('deletes an unused category', async () => {
    const { body: created } = await create();

    const res = await request(app)
      .delete(`/api/v1/admin/project-categories/${created.data.id}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(await db.projectCategory.count()).toBe(0);
  });

  it('refuses to delete a category used only by a deactivated project (409)', async () => {
    const { body: created } = await create();
    await createProject(db, created.data.id, { deactivatedAt: new Date() });

    const res = await request(app)
      .delete(`/api/v1/admin/project-categories/${created.data.id}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'CATEGORY_IN_USE', details: { projects: 1 } });
    expect(await db.projectCategory.count()).toBe(1);
  });

  it('answers deleting a missing category with 404', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/project-categories/99999')
      .set('Cookie', cookie);

    expect(res.status).toBe(404);
  });

  it('reports how many projects a category has', async () => {
    const { body: created } = await create();
    await createProject(db, created.data.id);
    await createProject(db, created.data.id, { deactivatedAt: new Date() });

    const res = await request(app)
      .get(`/api/v1/admin/project-categories/${created.data.id}`)
      .set('Cookie', cookie);

    expect(res.body.data.projectsCount).toBe(2);
  });
});
