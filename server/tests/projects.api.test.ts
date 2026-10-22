import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { createAdminSession } from './helpers/auth.js';
import {
  attachImage,
  createCategory,
  createProject,
  createTestDb,
  fullProjectCopy,
  resetDb,
  type TestDb,
} from './helpers/testDb.js';

let db: TestDb;
let cookie: string;
let categoryId: number;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  ({ cookie } = await createAdminSession(db));
  categoryId = (await createCategory(db)).id;
});

const keys = (value: object) => Object.keys(value).sort();
const published = { ...fullProjectCopy, status: 'published' as const };
const admin = '/api/v1/admin/projects';
const post = (data: object) => request(app).post(admin).set('Cookie', cookie).send(data);
const patch = (id: number, data: object) =>
  request(app).patch(`${admin}/${id}`).set('Cookie', cookie).send(data);
const getAdmin = (id: number) => request(app).get(`${admin}/${id}`).set('Cookie', cookie);

const completeBody = () => ({
  slug: 'my-project',
  categoryId,
  titleEs: 'Título',
  titleEn: 'Title',
  summaryEs: 'Resumen',
  summaryEn: 'Summary',
  descriptionEs: 'Descripción',
  descriptionEn: 'Description',
  status: 'published',
});

// Publishing needs a cover, and a brand-new project has none: create the draft, attach an
// image, then publish. Returns the published admin detail.
const createLive = async (overrides: object = {}) => {
  const draft = (await post({ ...completeBody(), status: 'draft', ...overrides })).body.data;
  await attachImage(db, draft.id);
  return (await patch(draft.id, { status: 'published' })).body.data;
};

const createTechnology = (slug: string, sortOrder = 0) =>
  db.technology.create({ data: { slug, name: slug.toUpperCase(), sortOrder } });

describe('GET /api/v1/projects (public)', () => {
  it('lists only published, active projects with exactly the list keys', async () => {
    await createProject(db, categoryId, { ...published, slug: 'visible' });
    await createProject(db, categoryId, {
      ...published,
      slug: 'inactive',
      deactivatedAt: new Date(),
    });
    await createProject(db, categoryId, { slug: 'draft' });

    const res = await request(app).get('/api/v1/projects');

    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { slug: string }) => p.slug)).toEqual(['visible']);
    expect(res.body.meta).toEqual({ count: 1 });
    expect(keys(res.body.data[0])).toEqual([
      'category',
      'endedAt',
      'isFeatured',
      'liveUrl',
      'repoUrl',
      'slug',
      'startedAt',
      'summary',
      'technologies',
      'title',
    ]);
    expect(keys(res.body.data[0].category)).toEqual(['name', 'slug']);
  });

  it('translates to the requested language and leaves out the description', async () => {
    await createProject(db, categoryId, { ...published, slug: 'p' });

    const es = await request(app).get('/api/v1/projects');
    const en = await request(app).get('/api/v1/projects?lang=en');

    expect(es.body.data[0]).toMatchObject({ title: 'Título', summary: 'Resumen' });
    expect(en.body.data[0]).toMatchObject({ title: 'Title', summary: 'Summary' });
    expect(es.body.data[0]).not.toHaveProperty('description');
    expect(JSON.stringify(es.body)).not.toMatch(/titleEs|titleEn|deactivated|status/);
  });

  it('orders by sortOrder then id and lists technologies by their own sortOrder', async () => {
    const late = await createProject(db, categoryId, { ...published, slug: 'late', sortOrder: 2 });
    const firstB = await createProject(db, categoryId, {
      ...published,
      slug: 'first-b',
      sortOrder: 1,
    });
    await createProject(db, categoryId, { ...published, slug: 'first-a', sortOrder: 1 });
    const zed = await createTechnology('zed', 0);
    const alpha = await createTechnology('alpha', 5);
    await db.projectTechnology.createMany({
      data: [alpha, zed].map((t) => ({ projectId: firstB.id, technologyId: t.id })),
    });
    expect(late.id).toBeGreaterThan(0);

    const res = await request(app).get('/api/v1/projects');

    expect(res.body.data.map((p: { slug: string }) => p.slug)).toEqual([
      'first-b',
      'first-a',
      'late',
    ]);
    expect(res.body.data[0].technologies).toEqual([
      { slug: 'zed', name: 'ZED' },
      { slug: 'alpha', name: 'ALPHA' },
    ]);
  });

  it('filters by category slug and answers an unknown slug with 200 and an empty list', async () => {
    const other = await db.projectCategory.create({
      data: { slug: 'data', nameEs: 'Datos', nameEn: 'Data' },
    });
    await createProject(db, categoryId, { ...published, slug: 'web-one' });
    await createProject(db, other.id, { ...published, slug: 'data-one' });

    const filtered = await request(app).get('/api/v1/projects?category=data');
    const unknown = await request(app).get('/api/v1/projects?category=nope');
    const empty = await request(app).get('/api/v1/projects?category=');

    expect(filtered.body.data.map((p: { slug: string }) => p.slug)).toEqual(['data-one']);
    expect(unknown.status).toBe(200);
    expect(unknown.body.data).toEqual([]);
    expect(empty.body.data).toHaveLength(2);
  });

  it('rejects an invalid lang and a repeated category with 400', async () => {
    expect((await request(app).get('/api/v1/projects?lang=fr')).status).toBe(400);
    expect((await request(app).get('/api/v1/projects?category=a&category=b')).status).toBe(400);
  });
});

describe('GET /api/v1/projects/:slug (public)', () => {
  it('returns the detail keys, the list keys plus description', async () => {
    await createProject(db, categoryId, { ...published, slug: 'one' });

    const res = await request(app).get('/api/v1/projects/one?lang=en');

    expect(res.status).toBe(200);
    expect(keys(res.body.data)).toEqual([
      'category',
      'description',
      'endedAt',
      'isFeatured',
      'liveUrl',
      'repoUrl',
      'slug',
      'startedAt',
      'summary',
      'technologies',
      'title',
    ]);
    expect(res.body.data.description).toBe('Description');
  });

  it('404s for a draft, a deactivated project and an unknown slug', async () => {
    await createProject(db, categoryId, { slug: 'draft' });
    await createProject(db, categoryId, {
      ...published,
      slug: 'inactive',
      deactivatedAt: new Date(),
    });

    for (const slug of ['draft', 'inactive', 'missing']) {
      const res = await request(app).get(`/api/v1/projects/${slug}`);
      expect(res.status, slug).toBe(404);
      expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
    }
  });

  it('formats dates as plain calendar dates', async () => {
    await createProject(db, categoryId, {
      ...published,
      slug: 'dated',
      startedAt: new Date('2024-03-05'),
      endedAt: null,
    });

    const res = await request(app).get('/api/v1/projects/dated');

    expect(res.body.data).toMatchObject({ startedAt: '2024-03-05', endedAt: null });
  });
});

describe('POST /api/v1/admin/projects', () => {
  it('saves a minimal draft with defaults', async () => {
    const res = await post({ slug: 'draft-one', categoryId });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      slug: 'draft-one',
      status: 'draft',
      isFeatured: false,
      sortOrder: 0,
      publishedAt: null,
      deactivatedAt: null,
      titleEs: null,
      technologyIds: [],
    });
    expect(keys(res.body.data)).toEqual([
      'categoryId',
      'createdAt',
      'deactivatedAt',
      'descriptionEn',
      'descriptionEs',
      'endedAt',
      'id',
      'isFeatured',
      'liveUrl',
      'publishedAt',
      'repoUrl',
      'slug',
      'sortOrder',
      'startedAt',
      'status',
      'summaryEn',
      'summaryEs',
      'technologyIds',
      'titleEn',
      'titleEs',
      'updatedAt',
    ]);
  });

  it('cannot be created already published: a new project has no cover yet', async () => {
    const res = await post(completeBody());

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('MISSING_COVER');
    expect(await db.project.count()).toBe(0);
  });

  it('answers an incomplete publication with 422 naming the missing fields', async () => {
    const res = await post({
      ...completeBody(),
      titleEn: '   ',
      summaryEs: null,
      descriptionEn: undefined,
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INCOMPLETE_TRANSLATION');
    expect(res.body.error.details.missing.sort()).toEqual([
      'descriptionEn',
      'summaryEs',
      'titleEn',
    ]);
    expect(await db.project.count()).toBe(0);
  });

  it('assigns technologies, dropping duplicate ids', async () => {
    const a = await createTechnology('a');
    const b = await createTechnology('b');

    const res = await post({ slug: 'with-tech', categoryId, technologyIds: [b.id, a.id, b.id] });

    expect(res.status).toBe(201);
    expect(res.body.data.technologyIds).toEqual([a.id, b.id].sort((x, y) => x - y));
  });

  it('answers an unknown category with 422, not 500', async () => {
    const res = await post({ slug: 'bad-cat', categoryId: 99999 });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({
      code: 'INVALID_REFERENCE',
      details: { categoryId: expect.any(Array) },
    });
  });

  it('answers an unknown technology with 422 and creates nothing', async () => {
    const a = await createTechnology('a');

    const res = await post({ slug: 'bad-tech', categoryId, technologyIds: [a.id, 99999] });

    expect(res.status).toBe(422);
    expect(res.body.error.details).toHaveProperty('technologyIds');
    expect(await db.project.count()).toBe(0);
  });

  it('answers a duplicate slug with 409 and says whether the clash is deactivated', async () => {
    await createProject(db, categoryId, { slug: 'active-one' });
    await createProject(db, categoryId, { slug: 'hidden-one', deactivatedAt: new Date() });

    const active = await post({ slug: 'active-one', categoryId });
    const hidden = await post({ slug: 'hidden-one', categoryId });

    expect(active.status).toBe(409);
    expect(active.body.error.details).toMatchObject({ deactivated: false });
    expect(hidden.status).toBe(409);
    expect(hidden.body.error.code).toBe('SLUG_TAKEN');
    expect(hidden.body.error.details).toMatchObject({ deactivated: true });
  });

  it('validates the body: dates, urls, status, unknown and server-controlled keys', async () => {
    const bad = [
      { startedAt: '2024-02-31' },
      { startedAt: '2024-13-45' },
      { startedAt: '2024-02-10', endedAt: '2024-01-01' },
      { repoUrl: 'javascript:alert(1)' },
      { status: 'archived' },
      { slug: 'Bad Slug' },
      { publishedAt: '2024-01-01' },
      { deactivatedAt: null },
      { technologyIds: 'all' },
    ];
    for (const extra of bad) {
      const res = await post({ slug: 'x', categoryId, ...extra });
      expect(res.status, JSON.stringify(extra)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('PATCH /api/v1/admin/projects/:id', () => {
  it('changes only the fields sent', async () => {
    const created = (await post({ slug: 'p', categoryId, titleEs: 'Uno' })).body.data;

    const res = await patch(created.id, { titleEn: 'One', isFeatured: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ titleEs: 'Uno', titleEn: 'One', isFeatured: true });
  });

  it('rejects an empty patch and unknown keys', async () => {
    const created = (await post({ slug: 'p', categoryId })).body.data;

    expect((await patch(created.id, {})).status).toBe(400);
    expect((await patch(created.id, { colour: 'red' })).status).toBe(400);
  });

  it('validates the resulting state: emptying a required field of a published project is a 422', async () => {
    const created = await createLive();

    const blank = await patch(created.id, { titleEn: '   ' });
    const nulled = await patch(created.id, { summaryEs: null, descriptionEs: '' });

    expect(blank.status).toBe(422);
    expect(blank.body.error.details.missing).toEqual(['titleEn']);
    expect(nulled.status).toBe(422);
    expect(nulled.body.error.details.missing.sort()).toEqual(['descriptionEs', 'summaryEs']);
    expect((await getAdmin(created.id)).body.data.titleEn).toBe('Title');
  });

  it('publishes a complete draft that has a cover and stamps publishedAt', async () => {
    const draft = (await post({ ...completeBody(), status: 'draft' })).body.data;
    await attachImage(db, draft.id);

    const res = await patch(draft.id, { status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.publishedAt).toEqual(expect.any(String));
  });

  it('answers 422 MISSING_COVER when publishing a complete draft without images', async () => {
    const draft = (await post({ ...completeBody(), status: 'draft' })).body.data;

    const res = await patch(draft.id, { status: 'published' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('MISSING_COVER');
    expect((await getAdmin(draft.id)).body.data.status).toBe('draft');
  });

  it('reports incomplete copy before the missing cover', async () => {
    const draft = (await post({ slug: 'p', categoryId })).body.data;

    const res = await patch(draft.id, { status: 'published' });

    expect(res.body.error.code).toBe('INCOMPLETE_TRANSLATION');
  });

  it('publishing a draft needs the whole state to be complete, not just the patch', async () => {
    const created = (await post({ slug: 'p', categoryId, titleEs: 'Uno' })).body.data;
    await attachImage(db, created.id);

    const incomplete = await patch(created.id, { status: 'published' });
    const complete = await patch(created.id, {
      status: 'published',
      titleEn: 'One',
      summaryEs: 'Resumen',
      summaryEn: 'Summary',
      descriptionEs: 'Descripción',
      descriptionEn: 'Description',
    });

    expect(incomplete.status).toBe(422);
    expect(incomplete.body.error.details.missing).toContain('titleEn');
    expect(complete.status).toBe(200);
    expect(complete.body.data.publishedAt).toEqual(expect.any(String));
  });

  it('unpublishing never needs completeness and keeps publishedAt', async () => {
    const created = await createLive();

    const unpublished = await patch(created.id, { status: 'draft', titleEn: '' });
    const republished = await patch(created.id, { status: 'published', titleEn: 'Title' });

    expect(unpublished.status).toBe(200);
    expect(unpublished.body.data.publishedAt).toBe(created.publishedAt);
    expect(republished.body.data.publishedAt).toBe(created.publishedAt);
  });

  it('rejects an end date before the start date, using the stored start date too', async () => {
    const created = (await post({ slug: 'p', categoryId, startedAt: '2024-05-01' })).body.data;

    const res = await patch(created.id, { endedAt: '2024-04-01' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('endedAt');
    expect((await patch(created.id, { endedAt: '2024-06-01' })).status).toBe(200);
  });

  it('locks the slug once published but allows changing it before, and re-sending it', async () => {
    const draft = (await post({ slug: 'draft-slug', categoryId })).body.data;
    const live = await createLive();

    const renamedDraft = await patch(draft.id, { slug: 'renamed' });
    const locked = await patch(live.id, { slug: 'other-slug' });
    const same = await patch(live.id, { slug: 'my-project', isFeatured: true });

    expect(renamedDraft.status).toBe(200);
    expect(renamedDraft.body.data.slug).toBe('renamed');
    expect(locked.status).toBe(409);
    expect(locked.body.error.code).toBe('SLUG_LOCKED');
    expect(same.status).toBe(200);
  });

  it('keeps the slug locked after unpublishing', async () => {
    const live = await createLive();
    await patch(live.id, { status: 'draft' });

    expect((await patch(live.id, { slug: 'other-slug' })).status).toBe(409);
  });

  it('answers a slug already taken with 409', async () => {
    await post({ slug: 'taken', categoryId });
    const other = (await post({ slug: 'free', categoryId })).body.data;

    const res = await patch(other.id, { slug: 'taken' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLUG_TAKEN');
  });

  it('technologyIds: omitted changes nothing, [] empties, a list replaces, duplicates collapse', async () => {
    const a = await createTechnology('a');
    const b = await createTechnology('b');
    const c = await createTechnology('c');
    const created = (await post({ slug: 'p', categoryId, technologyIds: [a.id, b.id] })).body.data;

    const untouched = await patch(created.id, { isFeatured: true });
    const replaced = await patch(created.id, { technologyIds: [c.id, b.id, c.id] });
    const emptied = await patch(created.id, { technologyIds: [] });

    expect(untouched.body.data.technologyIds).toEqual([a.id, b.id]);
    expect(replaced.body.data.technologyIds).toEqual([b.id, c.id]);
    expect(emptied.body.data.technologyIds).toEqual([]);
  });

  it('rolls everything back when a technology id does not exist', async () => {
    const a = await createTechnology('a');
    const created = (await post({ slug: 'p', categoryId, titleEs: 'Uno', technologyIds: [a.id] }))
      .body.data;

    const res = await patch(created.id, { titleEs: 'Dos', technologyIds: [a.id, 99999] });

    expect(res.status).toBe(422);
    const after = (await getAdmin(created.id)).body.data;
    expect(after.titleEs).toBe('Uno');
    expect(after.technologyIds).toEqual([a.id]);
  });

  it('answers an unknown category with 422 and an unknown id with 404', async () => {
    const created = (await post({ slug: 'p', categoryId })).body.data;

    expect((await patch(created.id, { categoryId: 99999 })).status).toBe(422);
    const missing = await patch(99999, { isFeatured: true });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('editing a deactivated project works and never reactivates it', async () => {
    const created = (await post({ slug: 'p', categoryId })).body.data;
    await request(app).patch(`${admin}/${created.id}/deactivate`).set('Cookie', cookie);

    const res = await patch(created.id, { titleEs: 'Editado', technologyIds: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.titleEs).toBe('Editado');
    expect(res.body.data.deactivatedAt).toEqual(expect.any(String));
    expect(
      (await db.project.findUniqueOrThrow({ where: { id: created.id } })).deactivatedAt,
    ).not.toBeNull();
  });
});

describe('admin listing, deactivation and deletion', () => {
  it('lists active projects by default and every project with includeDeactivated=true', async () => {
    await createProject(db, categoryId, { slug: 'a' });
    await createProject(db, categoryId, { slug: 'b', deactivatedAt: new Date() });

    const byDefault = await request(app).get(admin).set('Cookie', cookie);
    const explicitFalse = await request(app)
      .get(`${admin}?includeDeactivated=false`)
      .set('Cookie', cookie);
    const all = await request(app).get(`${admin}?includeDeactivated=true`).set('Cookie', cookie);

    expect(byDefault.body.data.map((p: { slug: string }) => p.slug)).toEqual(['a']);
    expect(explicitFalse.body.data).toHaveLength(1);
    expect(all.body.data).toHaveLength(2);
    expect(all.body.meta).toEqual({ count: 2 });
    expect(keys(all.body.data[0])).toEqual([
      'categoryId',
      'deactivatedAt',
      'id',
      'isFeatured',
      'publishedAt',
      'slug',
      'sortOrder',
      'status',
      'titleEn',
      'titleEs',
      'updatedAt',
    ]);
  });

  it('rejects includeDeactivated values other than true/false', async () => {
    for (const value of ['yes', '1', 'TRUE', '']) {
      const res = await request(app)
        .get(`${admin}?includeDeactivated=${value}`)
        .set('Cookie', cookie);
      expect(res.status, value).toBe(400);
    }
  });

  it('deactivates and reactivates through PATCH, hiding it from the public API meanwhile', async () => {
    const created = await createLive();

    const off = await request(app).patch(`${admin}/${created.id}/deactivate`).set('Cookie', cookie);
    expect(off.status).toBe(200);
    expect(off.body.data.deactivatedAt).toEqual(expect.any(String));
    expect((await request(app).get('/api/v1/projects/my-project')).status).toBe(404);

    const again = await request(app)
      .patch(`${admin}/${created.id}/deactivate`)
      .set('Cookie', cookie);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('PROJECT_ALREADY_DEACTIVATED');

    const on = await request(app).patch(`${admin}/${created.id}/reactivate`).set('Cookie', cookie);
    expect(on.status).toBe(200);
    expect(on.body.data.deactivatedAt).toBeNull();
    expect((await request(app).get('/api/v1/projects/my-project')).status).toBe(200);

    const notOff = await request(app)
      .patch(`${admin}/${created.id}/reactivate`)
      .set('Cookie', cookie);
    expect(notOff.status).toBe(409);
  });

  it('lets a deactivated published project lose its cover but not come back without one', async () => {
    const live = await createLive();
    await request(app).patch(`${admin}/${live.id}/deactivate`).set('Cookie', cookie);
    await db.projectImage.deleteMany({ where: { projectId: live.id } });

    const edit = await patch(live.id, { titleEn: 'Still editable' });
    const blocked = await request(app)
      .patch(`${admin}/${live.id}/reactivate`)
      .set('Cookie', cookie);
    await attachImage(db, live.id);
    const back = await request(app).patch(`${admin}/${live.id}/reactivate`).set('Cookie', cookie);

    expect(edit.status).toBe(200);
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.code).toBe('MISSING_COVER');
    expect(back.status).toBe(200);
    expect(back.body.data.deactivatedAt).toBeNull();
  });

  it('404s on unknown ids and has no DELETE route', async () => {
    const created = (await post({ slug: 'p', categoryId })).body.data;

    expect((await getAdmin(99999)).status).toBe(404);
    expect(
      (await request(app).patch(`${admin}/99999/deactivate`).set('Cookie', cookie)).status,
    ).toBe(404);
    expect((await request(app).delete(`${admin}/${created.id}`).set('Cookie', cookie)).status).toBe(
      404,
    );
    expect(await db.project.count()).toBe(1);
  });
});
