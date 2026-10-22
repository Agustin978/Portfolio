import request from 'supertest';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { AppError } from '../src/shared/errors/AppError.js';
import { createAdminSession } from './helpers/auth.js';
import { fakeStorage } from './helpers/fakeStorage.js';
import { gifBuffer, pngBuffer, svgBuffer, tinyImage } from './helpers/images.js';
import {
  createCategory,
  createProject,
  createTestDb,
  fullProjectCopy,
  resetDb,
  type TestDb,
} from './helpers/testDb.js';

vi.mock('../src/shared/storage/index.js', async () => ({
  imageStorage: (await import('./helpers/fakeStorage.js')).fakeStorage,
}));

let db: TestDb;
let cookie: string;
let categoryId: number;
let projectId: number;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  fakeStorage.reset();
  ({ cookie } = await createAdminSession(db));
  categoryId = (await createCategory(db)).id;
  projectId = (await createProject(db, categoryId)).id;
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

const base = (id = projectId) => `/api/v1/admin/projects/${id}/images`;
const keys = (value: object) => Object.keys(value).sort();

const send = async (opts: { id?: number; file?: Buffer; name?: string; field?: string } = {}) =>
  request(app)
    .post(base(opts.id))
    .set('Cookie', cookie)
    .attach(opts.field ?? 'image', opts.file ?? (await tinyImage()), opts.name ?? 'photo.png');

const patch = (imageId: number, body: object, id = projectId) =>
  request(app)
    .patch(`${base(id)}/${imageId}`)
    .set('Cookie', cookie)
    .send(body);

const uploadOk = async (id = projectId) => (await send({ id })).body.data as { id: number };

describe('POST /admin/projects/:id/images', () => {
  it('requires a session', async () => {
    const res = await request(app)
      .post(base())
      .attach('image', await tinyImage(), 'a.png');

    expect(res.status).toBe(401);
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('stores a WebP, creates the image and answers with exactly the admin keys', async () => {
    const res = await send({ file: await pngBuffer(40, 20) });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(keys(res.body.data)).toEqual([
      'altEn',
      'altEs',
      'height',
      'id',
      'isCover',
      'sortOrder',
      'url',
      'width',
    ]);
    expect(res.body.data).toMatchObject({ width: 40, height: 20, isCover: true, sortOrder: 0 });
    expect(res.body.data.url).toMatch(/^https:\/\//);

    const sent = fakeStorage.upload.mock.calls[0]![0];
    expect((await sharp(sent).metadata()).format).toBe('webp');
    const row = await db.image.findFirstOrThrow();
    expect(row.cloudinaryPublicId).toMatch(/^portfolio\/test\/fake-/);
  });

  it('saves the optional alt texts', async () => {
    const res = await request(app)
      .post(base())
      .set('Cookie', cookie)
      .field('altEs', 'Captura')
      .field('altEn', 'Screenshot')
      .attach('image', await tinyImage(), 'a.png');

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ altEs: 'Captura', altEn: 'Screenshot' });
  });

  it('rejects bad form fields before touching the host', async () => {
    const png = await tinyImage();
    const post = () => request(app).post(base()).set('Cookie', cookie);

    const tooLong = await post().field('altEs', 'x'.repeat(301)).attach('image', png, 'a.png');
    const unknown = await post().field('title', 'hi').attach('image', png, 'a.png');

    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.code).toBe('VALIDATION_ERROR');
    expect(unknown.status).toBe(400);
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('answers 400 when the file is missing or in the wrong field', async () => {
    const noFile = await request(app).post(base()).set('Cookie', cookie).field('altEs', 'x');
    const wrongField = await send({ field: 'photo' });
    const json = await request(app).post(base()).set('Cookie', cookie).send({ altEs: 'x' });

    for (const res of [noFile, wrongField, json]) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('answers 400 for a broken multipart body, not 500', async () => {
    const res = await request(app)
      .post(base())
      .set('Cookie', cookie)
      .set('Content-Type', 'multipart/form-data; boundary=xyz')
      .send('--xyz\r\nContent-Disposition: form-data; name="image"; filename="a.png"\r\n\r\nabc');

    expect(res.status).toBe(400);
  });

  it('answers 413 above 10 MB', async () => {
    const res = await send({ file: Buffer.alloc(10 * 1024 * 1024 + 1) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('IMAGE_TOO_LARGE');
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('answers 415 for SVG, GIF and files that only look like images', async () => {
    const files = [
      { file: svgBuffer(), name: 'logo.svg' },
      { file: await gifBuffer(), name: 'anim.gif' },
      { file: Buffer.from('<?php echo 1;'), name: 'shell.png' },
    ];

    for (const f of files) {
      const res = await send(f);
      expect(res.status, f.name).toBe(415);
      expect(res.body.error.code).toBe('UNSUPPORTED_IMAGE');
    }
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('404s for an unknown project and a bad id, without calling the host', async () => {
    expect((await send({ id: 99999 })).status).toBe(404);
    expect((await send({ id: 0 })).status).toBe(400);
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('answers 409 when the project already has 12 images', async () => {
    for (let i = 0; i < 12; i++) {
      const image = await db.image.create({
        data: { cloudinaryPublicId: `s-${i}`, url: 'https://x.test/i.webp', width: 1, height: 1 },
      });
      await db.projectImage.create({
        data: { projectId, imageId: image.id, sortOrder: i, isCover: i === 0 },
      });
    }

    const res = await send();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('IMAGE_LIMIT_REACHED');
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('answers 502 and creates nothing when the host fails', async () => {
    fakeStorage.failUpload = true;

    const res = await send();

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('IMAGE_UPLOAD_FAILED');
    expect(await db.image.count()).toBe(0);
  });

  it('answers 503 when storage is not configured', async () => {
    fakeStorage.upload.mockRejectedValueOnce(
      new AppError(503, 'STORAGE_NOT_CONFIGURED', 'Image storage is not configured'),
    );

    const res = await send();

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('STORAGE_NOT_CONFIGURED');
    expect(await db.image.count()).toBe(0);
  });

  it('never repeats provider text to the client', async () => {
    fakeStorage.upload.mockRejectedValueOnce({ message: 'Invalid api_key abc123', http_code: 401 });

    const res = await send();

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('abc123');
  });
});

describe('PATCH /admin/projects/:id/images/:imageId', () => {
  it('edits alt text and order', async () => {
    const image = await uploadOk();

    const res = await patch(image.id, { altEs: 'Nuevo', sortOrder: 4 });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: image.id, altEs: 'Nuevo', sortOrder: 4 });
  });

  it('moves the cover to another image', async () => {
    const first = await uploadOk();
    const second = await uploadOk();

    const res = await patch(second.id, { isCover: true });

    expect(res.status).toBe(200);
    expect(res.body.data.isCover).toBe(true);
    const covers = await db.projectImage.findMany({ where: { projectId, isCover: true } });
    expect(covers.map((c) => c.imageId)).toEqual([second.id]);
    expect(first.id).not.toBe(second.id);
  });

  it('answers 400 when asked to unset the only cover', async () => {
    const image = await uploadOk();

    const res = await patch(image.id, { isCover: false });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_UNSET_COVER');
  });

  it('rejects an empty body and unknown keys', async () => {
    const image = await uploadOk();

    expect((await patch(image.id, {})).status).toBe(400);
    expect((await patch(image.id, { url: 'https://evil.test/x.png' })).status).toBe(400);
    expect((await patch(image.id, { altEs: 'x'.repeat(301) })).status).toBe(400);
  });

  it('404s for an image of another project', async () => {
    const other = (await createProject(db, categoryId)).id;
    const image = await uploadOk(other);

    const res = await patch(image.id, { sortOrder: 1 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('IMAGE_NOT_FOUND');
  });
});

describe('DELETE /admin/projects/:id/images/:imageId', () => {
  const del = (imageId: number, id = projectId) =>
    request(app)
      .delete(`${base(id)}/${imageId}`)
      .set('Cookie', cookie);

  it('removes the image and its hosted file', async () => {
    await uploadOk();
    const second = await uploadOk();

    const res = await del(second.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: null, meta: {} });
    expect(await db.image.count()).toBe(1);
    expect(fakeStorage.stored.size).toBe(1);
  });

  it('still answers 200 when the host cannot delete the file', async () => {
    await uploadOk();
    const second = await uploadOk();
    fakeStorage.failDestroy = true;

    const res = await del(second.id);

    expect(res.status).toBe(200);
    expect(await db.image.count()).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('404s for an image of another project', async () => {
    const other = (await createProject(db, categoryId)).id;
    const image = await uploadOk(other);

    expect((await del(image.id)).status).toBe(404);
    expect(await db.image.count()).toBe(1);
  });

  it('answers 409 COVER_REQUIRED for the last image of a published project', async () => {
    const live = (await createProject(db, categoryId, { ...fullProjectCopy, status: 'published' }))
      .id;
    const image = await uploadOk(live);

    const res = await del(image.id, live);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('COVER_REQUIRED');
    expect(await db.image.count()).toBe(1);
  });
});
