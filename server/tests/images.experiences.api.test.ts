import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { createAdminSession } from './helpers/auth.js';
import { fakeStorage } from './helpers/fakeStorage.js';
import { tinyImage } from './helpers/images.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

vi.mock('../src/shared/storage/index.js', async () => ({
  imageStorage: (await import('./helpers/fakeStorage.js')).fakeStorage,
}));

let db: TestDb;
let cookie: string;
let experienceId: number;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  fakeStorage.reset();
  ({ cookie } = await createAdminSession(db));
  experienceId = await newExperience();
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

const newExperience = async () =>
  (await db.experience.create({ data: { company: 'Acme', startDate: new Date('2024-01-01') } })).id;

const base = (id = experienceId) => `/api/v1/admin/experiences/${id}/images`;

const send = async (id = experienceId) =>
  request(app)
    .post(base(id))
    .set('Cookie', cookie)
    .attach('image', await tinyImage(), 'photo.png');

const uploadOk = async (id = experienceId) => (await send(id)).body.data as { id: number };

const patch = (imageId: number, body: object, id = experienceId) =>
  request(app)
    .patch(`${base(id)}/${imageId}`)
    .set('Cookie', cookie)
    .send(body);

const del = (imageId: number, id = experienceId) =>
  request(app)
    .delete(`${base(id)}/${imageId}`)
    .set('Cookie', cookie);

describe('experience images', () => {
  it('requires a session', async () => {
    const res = await request(app)
      .post(base())
      .attach('image', await tinyImage(), 'a.png');

    expect(res.status).toBe(401);
  });

  it('uploads without a cover and appends in order', async () => {
    const first = await send();
    const second = await send();

    expect(first.status).toBe(201);
    expect(Object.keys(first.body.data).sort()).toEqual([
      'altEn',
      'altEs',
      'height',
      'id',
      'sortOrder',
      'url',
      'width',
    ]);
    expect([first.body.data.sortOrder, second.body.data.sortOrder]).toEqual([0, 1]);
  });

  it('404s for an unknown experience without calling the host', async () => {
    const res = await send(99999);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EXPERIENCE_NOT_FOUND');
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('answers 409 at 12 images', async () => {
    for (let i = 0; i < 12; i++) {
      const image = await db.image.create({
        data: { cloudinaryPublicId: `s-${i}`, url: 'https://x.test/i.webp', width: 1, height: 1 },
      });
      await db.experienceImage.create({ data: { experienceId, imageId: image.id, sortOrder: i } });
    }

    const res = await send();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('IMAGE_LIMIT_REACHED');
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('edits alt text and order but has no isCover', async () => {
    const image = await uploadOk();

    const ok = await patch(image.id, { altEn: 'Office', sortOrder: 3 });
    const cover = await patch(image.id, { isCover: true });

    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ altEn: 'Office', sortOrder: 3 });
    expect(cover.status).toBe(400);
  });

  it('404s for an image of another experience', async () => {
    const other = await newExperience();
    const image = await uploadOk(other);

    expect((await patch(image.id, { sortOrder: 1 })).status).toBe(404);
    expect((await del(image.id)).status).toBe(404);
    expect(await db.image.count()).toBe(1);
  });

  it('removes the last image of a published experience (no cover rule)', async () => {
    const id = (
      await db.experience.create({
        data: {
          company: 'Acme',
          startDate: new Date('2024-01-01'),
          roleEs: 'Dev',
          roleEn: 'Dev',
          descriptionEs: 'x',
          descriptionEn: 'x',
          status: 'published',
        },
      })
    ).id;
    const image = await uploadOk(id);

    const res = await del(image.id, id);

    expect(res.status).toBe(200);
    expect(await db.image.count()).toBe(0);
    expect(fakeStorage.stored.size).toBe(0);
  });
});
