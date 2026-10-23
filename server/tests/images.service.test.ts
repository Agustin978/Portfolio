import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createImagesRepository } from '../src/modules/images/images.repository.js';
import { createImagesService } from '../src/modules/images/images.service.js';
import { fakeStorage } from './helpers/fakeStorage.js';
import { jpegBuffer, tinyImage } from './helpers/images.js';
import {
  createCategory,
  createProject,
  createTestDb,
  fullProjectCopy,
  resetDb,
  type TestDb,
} from './helpers/testDb.js';

let db: TestDb;
let categoryId: number;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  fakeStorage.reset();
  categoryId = (await createCategory(db)).id;
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

const published = { ...fullProjectCopy, status: 'published' as const };

const repository = () => createImagesRepository(db);
const projects = (repo = repository()) =>
  createImagesService({ repository: repo, storage: fakeStorage, kind: 'project' });
const experiences = () =>
  createImagesService({ repository: repository(), storage: fakeStorage, kind: 'experience' });

const upload = async (service: ReturnType<typeof projects>, ownerId: number, alt = {}) =>
  service.upload(ownerId, await tinyImage(), alt);

const covers = async (projectId: number) =>
  (await db.projectImage.findMany({ where: { projectId, isCover: true } })).map((l) => l.imageId);

// Inserts rows directly so a test can fill a project without 12 round trips through sharp.
const seedImages = async (projectId: number, count: number) => {
  for (let i = 0; i < count; i++) {
    const image = await db.image.create({
      data: {
        cloudinaryPublicId: `seed-${projectId}-${i}`,
        url: 'https://x.test/i.webp',
        width: 1,
        height: 1,
      },
    });
    await db.projectImage.create({
      data: { projectId, imageId: image.id, sortOrder: i, isCover: i === 0 },
    });
  }
};

describe('upload', () => {
  it('makes the first image the cover and appends the rest', async () => {
    const { id } = await createProject(db, categoryId);
    const service = projects();

    const first = await upload(service, id, { altEs: 'uno' });
    const second = await upload(service, id);
    const third = await upload(service, id);

    expect([first.isCover, second.isCover, third.isCover]).toEqual([true, false, false]);
    expect([first.sortOrder, second.sortOrder, third.sortOrder]).toEqual([0, 1, 2]);
    expect(first).toMatchObject({ altEs: 'uno', altEn: null, width: 8, height: 8 });
    expect(first.url).toMatch(/^https:\/\//);
    expect(Object.keys(first)).not.toContain('publicId');
  });

  it('stores the size of the processed image, not of the original', async () => {
    const { id } = await createProject(db, categoryId);

    const image = await projects().upload(id, await jpegBuffer(3000, 1500), {});

    expect([image.width, image.height]).toEqual([1920, 960]);
  });

  it('leaves exactly one cover when the first two uploads run at the same time', async () => {
    const { id } = await createProject(db, categoryId);
    const service = projects();

    const results = await Promise.all([upload(service, id), upload(service, id)]);

    expect(results.filter((r) => r.isCover)).toHaveLength(1);
    expect(await covers(id)).toHaveLength(1);
    expect(await db.projectImage.count({ where: { projectId: id } })).toBe(2);
  });

  it('gives experiences no cover', async () => {
    const experience = await db.experience.create({
      data: { company: 'Acme', startDate: new Date('2024-01-01') },
    });

    const image = await upload(experiences(), experience.id);

    expect(Object.keys(image)).not.toContain('isCover');
    expect(await db.experienceImage.count({ where: { experienceId: experience.id } })).toBe(1);
  });

  it('never calls the host when the owner does not exist', async () => {
    await expect(upload(projects(), 99999)).rejects.toMatchObject({
      statusCode: 404,
      code: 'PROJECT_NOT_FOUND',
    });
    await expect(upload(experiences(), 99999)).rejects.toMatchObject({
      statusCode: 404,
      code: 'EXPERIENCE_NOT_FOUND',
    });
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('never calls the host when the limit is already reached', async () => {
    const { id } = await createProject(db, categoryId);
    await seedImages(id, 12);

    await expect(upload(projects(), id)).rejects.toMatchObject({
      statusCode: 409,
      code: 'IMAGE_LIMIT_REACHED',
    });
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('never calls the host for a file that cannot be processed', async () => {
    const { id } = await createProject(db, categoryId);

    await expect(projects().upload(id, Buffer.from('nope'), {})).rejects.toMatchObject({
      statusCode: 415,
    });
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('creates nothing when the host fails', async () => {
    const { id } = await createProject(db, categoryId);
    fakeStorage.failUpload = true;

    await expect(upload(projects(), id)).rejects.toMatchObject({
      statusCode: 502,
      code: 'IMAGE_UPLOAD_FAILED',
    });
    expect(await db.image.count()).toBe(0);
  });

  it('deletes the uploaded file when the database write fails', async () => {
    const { id } = await createProject(db, categoryId);
    const real = repository();
    const broken = {
      ...real,
      transaction: () => Promise.reject(new Error('connection lost')),
    } as unknown as ReturnType<typeof repository>;

    await expect(upload(projects(broken), id)).rejects.toThrow('connection lost');

    expect(fakeStorage.destroy).toHaveBeenCalledTimes(1);
    expect(fakeStorage.stored.size).toBe(0);
  });

  it('logs the public id when that cleanup fails too', async () => {
    const { id } = await createProject(db, categoryId);
    const broken = {
      ...repository(),
      transaction: () => Promise.reject(new Error('connection lost')),
    } as unknown as ReturnType<typeof repository>;
    fakeStorage.failDestroy = true;

    await expect(upload(projects(broken), id)).rejects.toThrow('connection lost');

    const [uploadedId] = [...fakeStorage.stored];
    expect(errorSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ publicId: uploadedId }),
    );
  });

  it('deletes the uploaded file when the limit is hit under the lock', async () => {
    const { id } = await createProject(db, categoryId);
    await seedImages(id, 11);
    const service = projects();

    const results = await Promise.allSettled([upload(service, id), upload(service, id)]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: 'IMAGE_LIMIT_REACHED' });
    expect(await db.projectImage.count({ where: { projectId: id } })).toBe(12);
    expect(fakeStorage.stored.size).toBe(1);
  });
});

describe('update', () => {
  it('moves the cover and leaves a single one', async () => {
    const { id } = await createProject(db, categoryId);
    const service = projects();
    const first = await upload(service, id);
    const second = await upload(service, id);

    const moved = await service.update(id, second.id, { isCover: true });

    expect(moved.isCover).toBe(true);
    expect(await covers(id)).toEqual([second.id]);
    expect(first.isCover).toBe(true);
  });

  it('refuses to unset the current cover', async () => {
    const { id } = await createProject(db, categoryId);
    const service = projects();
    const first = await upload(service, id);

    await expect(service.update(id, first.id, { isCover: false })).rejects.toMatchObject({
      statusCode: 400,
      code: 'CANNOT_UNSET_COVER',
    });
    expect(await covers(id)).toEqual([first.id]);
  });

  it('accepts isCover false on an image that is not the cover', async () => {
    const { id } = await createProject(db, categoryId);
    const service = projects();
    await upload(service, id);
    const second = await upload(service, id);

    await expect(service.update(id, second.id, { isCover: false })).resolves.toMatchObject({
      isCover: false,
    });
  });

  it('changes alt text and order, and clears alt with null', async () => {
    const { id } = await createProject(db, categoryId);
    const service = projects();
    const image = await upload(service, id, { altEs: 'viejo' });

    const changed = await service.update(id, image.id, { altEs: null, altEn: 'new', sortOrder: 7 });

    expect(changed).toMatchObject({ altEs: null, altEn: 'new', sortOrder: 7 });
    const row = await db.image.findUniqueOrThrow({ where: { id: image.id } });
    expect([row.altEs, row.altEn]).toEqual([null, 'new']);
  });

  it('404s for an image that belongs to another project', async () => {
    const a = await createProject(db, categoryId);
    const b = await createProject(db, categoryId);
    const service = projects();
    const image = await upload(service, a.id);

    await expect(service.update(b.id, image.id, { sortOrder: 1 })).rejects.toMatchObject({
      statusCode: 404,
      code: 'IMAGE_NOT_FOUND',
    });
    await expect(service.remove(b.id, image.id)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.update(99999, image.id, { sortOrder: 1 })).rejects.toMatchObject({
      code: 'PROJECT_NOT_FOUND',
    });
  });
});

describe('remove', () => {
  it('deletes the link, the image row and the hosted file', async () => {
    const { id } = await createProject(db, categoryId);
    const service = projects();
    await upload(service, id);
    const second = await upload(service, id);

    await service.remove(id, second.id);

    expect(await db.image.count()).toBe(1);
    expect(fakeStorage.stored.size).toBe(1);
    expect(fakeStorage.destroy).toHaveBeenCalledTimes(1);
  });

  it('promotes the next image by order when the cover is removed', async () => {
    const { id } = await createProject(db, categoryId);
    const service = projects();
    const cover = await upload(service, id);
    const b = await upload(service, id);
    const c = await upload(service, id);
    await service.update(id, c.id, { sortOrder: 0.0 });
    await service.update(id, b.id, { sortOrder: 9 });

    await service.remove(id, cover.id);

    expect(await covers(id)).toEqual([c.id]);
  });

  it('breaks an order tie with the lower id', async () => {
    const { id } = await createProject(db, categoryId);
    const service = projects();
    const cover = await upload(service, id);
    const b = await upload(service, id);
    const c = await upload(service, id);
    await service.update(id, b.id, { sortOrder: 5 });
    await service.update(id, c.id, { sortOrder: 5 });

    await service.remove(id, cover.id);

    expect(await covers(id)).toEqual([b.id]);
  });

  it('does not roll anything back when the host fails to delete', async () => {
    const { id } = await createProject(db, categoryId);
    const service = projects();
    const image = await upload(service, id);
    fakeStorage.failDestroy = true;

    await expect(service.remove(id, image.id)).resolves.toBeUndefined();

    expect(await db.image.count()).toBe(0);
    expect(await db.projectImage.count()).toBe(0);
    const [orphan] = [...fakeStorage.stored];
    expect(errorSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ publicId: orphan, error: 'provider says: secret detail' }),
    );
  });

  it('refuses to remove the last image of a published project', async () => {
    const { id } = await createProject(db, categoryId, published);
    const service = projects();
    const image = await upload(service, id);

    await expect(service.remove(id, image.id)).rejects.toMatchObject({
      statusCode: 409,
      code: 'COVER_REQUIRED',
    });
    expect(await db.image.count()).toBe(1);
    expect(fakeStorage.destroy).not.toHaveBeenCalled();
  });

  it('allows emptying a draft or a deactivated project', async () => {
    const draft = await createProject(db, categoryId);
    const off = await createProject(db, categoryId, { ...published, deactivatedAt: new Date() });
    const service = projects();
    const a = await upload(service, draft.id);
    const b = await upload(service, off.id);

    await service.remove(draft.id, a.id);
    await service.remove(off.id, b.id);

    expect(await db.image.count()).toBe(0);
  });

  it('lets a published project drop a non-last image', async () => {
    const { id } = await createProject(db, categoryId, published);
    const service = projects();
    await upload(service, id);
    const second = await upload(service, id);

    await service.remove(id, second.id);

    expect(await db.projectImage.count({ where: { projectId: id } })).toBe(1);
  });

  it('has no last-image rule for experiences', async () => {
    const experience = await db.experience.create({
      data: { company: 'Acme', startDate: new Date('2024-01-01'), status: 'draft' },
    });
    const service = experiences();
    const image = await upload(service, experience.id);

    await service.remove(experience.id, image.id);

    expect(await db.image.count()).toBe(0);
  });
});
