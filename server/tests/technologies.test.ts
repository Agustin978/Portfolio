import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { createAdminSession } from './helpers/auth.js';
import {
  createCategory,
  createProject,
  createTestDb,
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

const keys = (value: object) => Object.keys(value).sort();
const base = '/api/v1/admin/technologies';
const body = { slug: 'react', name: 'React' };
const create = (data: object = body) => request(app).post(base).set('Cookie', cookie).send(data);

describe('/api/v1/admin/technologies', () => {
  it('creates with defaults and returns the admin shape', async () => {
    const res = await create();

    expect(res.status).toBe(201);
    expect(keys(res.body.data)).toEqual([
      'experiencesCount',
      'id',
      'name',
      'projectsCount',
      'showInSkills',
      'skillGroup',
      'slug',
      'sortOrder',
    ]);
    expect(res.body.data).toMatchObject({
      skillGroup: 'other',
      showInSkills: false,
      sortOrder: 0,
      projectsCount: 0,
      experiencesCount: 0,
    });
  });

  it('lists ordered by sortOrder then id', async () => {
    await create({ ...body, slug: 'b', name: 'B', sortOrder: 1 });
    await create({ ...body, slug: 'c', name: 'C', sortOrder: 0 });
    await create({ ...body, slug: 'a', name: 'A', sortOrder: 1 });

    const res = await request(app).get(base).set('Cookie', cookie);

    expect(res.body.data.map((t: { slug: string }) => t.slug)).toEqual(['c', 'b', 'a']);
    expect(res.body.meta).toEqual({ count: 3 });
  });

  it('updates only the fields sent', async () => {
    const { body: created } = await create();

    const res = await request(app)
      .patch(`${base}/${created.data.id}`)
      .set('Cookie', cookie)
      .send({ skillGroup: 'development', showInSkills: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      slug: 'react',
      name: 'React',
      skillGroup: 'development',
      showInSkills: true,
    });
  });

  it('validates input: unknown skillGroup, blank name, empty patch, extra keys', async () => {
    const { body: created } = await create();
    const patch = (data: object) =>
      request(app).patch(`${base}/${created.data.id}`).set('Cookie', cookie).send(data);

    expect((await create({ ...body, skillGroup: 'cooking' })).status).toBe(400);
    expect((await create({ ...body, name: '  ' })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect((await patch({ id: 5 })).status).toBe(400);
  });

  it('answers a duplicate slug with 409 and a missing id with 404', async () => {
    await create();
    const duplicate = await create();
    const missing = await request(app)
      .patch(`${base}/99999`)
      .set('Cookie', cookie)
      .send({ name: 'X' });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('SLUG_TAKEN');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('TECHNOLOGY_NOT_FOUND');
  });

  it('deletes an unused technology', async () => {
    const { body: created } = await create();

    const res = await request(app).delete(`${base}/${created.data.id}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(await db.technology.count()).toBe(0);
  });

  it('refuses to delete a technology in use, counting deactivated projects too', async () => {
    const { body: created } = await create();
    const category = await createCategory(db);
    const project = await createProject(db, category.id, { deactivatedAt: new Date() });
    await db.projectTechnology.create({
      data: { projectId: project.id, technologyId: created.data.id },
    });
    await db.experience.create({
      data: { company: 'Acme', startDate: new Date('2024-01-01') },
    });
    const experience = await db.experience.findFirstOrThrow();
    await db.experienceTechnology.create({
      data: { experienceId: experience.id, technologyId: created.data.id },
    });

    const res = await request(app).delete(`${base}/${created.data.id}`).set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'TECHNOLOGY_IN_USE',
      details: { projects: 1, experiences: 1 },
    });
    expect(await db.technology.count()).toBe(1);
  });

  it('answers deleting a missing technology with 404', async () => {
    const res = await request(app).delete(`${base}/99999`).set('Cookie', cookie);

    expect(res.status).toBe(404);
  });
});
