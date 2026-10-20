import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  categoryId = (await createCategory(db)).id;
});

// These guard the hand-written SQL in the init migration, which Prisma does not model.
describe('publish CHECK constraints', () => {
  it('accepts a published project with every es/en field filled', async () => {
    await expect(
      createProject(db, categoryId, { ...fullProjectCopy, status: 'published' }),
    ).resolves.toBeTruthy();
  });

  it('rejects publishing a project with a missing language', async () => {
    await expect(
      createProject(db, categoryId, { ...fullProjectCopy, titleEn: null, status: 'published' }),
    ).rejects.toThrow();
  });

  it('rejects publishing a project whose text is only whitespace', async () => {
    await expect(
      createProject(db, categoryId, { ...fullProjectCopy, summaryEs: '   ', status: 'published' }),
    ).rejects.toThrow();
  });

  it('allows incomplete drafts', async () => {
    await expect(createProject(db, categoryId, { titleEs: 'Solo español' })).resolves.toBeTruthy();
  });

  it('rejects publishing an experience with a blank English role', async () => {
    await expect(
      db.experience.create({
        data: {
          company: 'Acme',
          startDate: new Date('2022-01-01'),
          roleEs: 'Dev',
          roleEn: ' ',
          descriptionEs: 'x',
          descriptionEn: 'x',
          status: 'published',
        },
      }),
    ).rejects.toThrow();
  });
});

describe('other hand-written constraints', () => {
  it('keeps profile a singleton', async () => {
    await db.profile.create({ data: { id: 1, fullName: 'A' } });
    await expect(db.profile.create({ data: { id: 2, fullName: 'B' } })).rejects.toThrow();
  });

  it('allows only one cover image per project', async () => {
    const project = await createProject(db, categoryId);
    const [a, b] = await Promise.all(
      ['a', 'b'].map((id) =>
        db.image.create({
          data: { cloudinaryPublicId: id, url: `https://x/${id}`, width: 1, height: 1 },
        }),
      ),
    );
    await db.projectImage.create({
      data: { projectId: project.id, imageId: a!.id, isCover: true },
    });

    await expect(
      db.projectImage.create({ data: { projectId: project.id, imageId: b!.id, isCover: true } }),
    ).rejects.toThrow();
    await expect(
      db.projectImage.create({ data: { projectId: project.id, imageId: b!.id, isCover: false } }),
    ).resolves.toBeTruthy();
  });

  it('rejects a contact message with an unsupported language', async () => {
    await expect(
      db.$executeRawUnsafe(
        `INSERT INTO contact_messages (name, email, message, lang) VALUES ('a','a@a.com','hi','fr')`,
      ),
    ).rejects.toThrow();
  });
});

describe('uniqueness and RESTRICT rules', () => {
  it('keeps slugs unique even when the owner is deactivated', async () => {
    await createProject(db, categoryId, { slug: 'same', deactivatedAt: new Date() });
    await expect(createProject(db, categoryId, { slug: 'same' })).rejects.toThrow();
  });

  it('blocks deleting a category that has a deactivated project', async () => {
    await createProject(db, categoryId, { deactivatedAt: new Date() });
    await expect(db.projectCategory.delete({ where: { id: categoryId } })).rejects.toThrow();
  });

  it('blocks deleting a technology used by a deactivated project', async () => {
    const project = await createProject(db, categoryId, { deactivatedAt: new Date() });
    const tech = await db.technology.create({ data: { slug: 'react', name: 'React' } });
    await db.projectTechnology.create({ data: { projectId: project.id, technologyId: tech.id } });

    await expect(db.technology.delete({ where: { id: tech.id } })).rejects.toThrow();
  });

  it('allows deleting an unused technology and a contact message', async () => {
    const tech = await db.technology.create({ data: { slug: 'go', name: 'Go' } });
    const message = await db.contactMessage.create({
      data: { name: 'A', email: 'a@a.com', message: 'hola' },
    });

    await expect(db.technology.delete({ where: { id: tech.id } })).resolves.toBeTruthy();
    await expect(db.contactMessage.delete({ where: { id: message.id } })).resolves.toBeTruthy();
  });
});
