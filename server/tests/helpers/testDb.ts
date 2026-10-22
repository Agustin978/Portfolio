import type { Prisma } from '../../src/generated/prisma/client.js';
import { createPrismaClient } from '../../src/shared/db/prisma.js';

export function createTestDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Point it at an empty database such as portfolio_test.',
    );
  }
  // Tests truncate every table, so refuse anything that is not clearly a test database.
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${dbName}": database name must end in _test`);
  }
  return createPrismaClient(url);
}

export type TestDb = ReturnType<typeof createTestDb>;

export async function resetDb(db: TestDb) {
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE project_technologies, experience_technologies, project_images, experience_images,
       images, projects, experiences, technologies, project_categories, social_links,
       contact_messages, profile, admin_users RESTART IDENTITY CASCADE`,
  );
}

let counter = 0;
const uniq = () => `${Date.now()}-${++counter}`;

export async function createCategory(db: TestDb) {
  const n = uniq();
  return db.projectCategory.create({
    data: { slug: `cat-${n}`, nameEs: 'Categoría', nameEn: 'Category' },
  });
}

export async function createProject(
  db: TestDb,
  categoryId: number,
  overrides: Partial<Prisma.ProjectUncheckedCreateInput> = {},
) {
  return db.project.create({
    data: { slug: `project-${uniq()}`, categoryId, ...overrides },
  });
}

// A project can only be published (or reactivated while published) with a cover, so tests that
// need a live project attach this stand-in instead of going through the upload flow.
export async function attachImage(
  db: TestDb,
  projectId: number,
  {
    isCover = true,
    sortOrder = 0,
    altEs = null,
    altEn = null,
  }: { isCover?: boolean; sortOrder?: number; altEs?: string | null; altEn?: string | null } = {},
) {
  const n = uniq();
  const image = await db.image.create({
    data: {
      cloudinaryPublicId: `portfolio/test/seed-${n}`,
      url: `https://res.cloudinary.test/seed-${n}.webp`,
      width: 1200,
      height: 800,
      altEs,
      altEn,
    },
  });
  await db.projectImage.create({ data: { projectId, imageId: image.id, sortOrder, isCover } });
  return image;
}

export const fullProjectCopy = {
  titleEs: 'Título',
  titleEn: 'Title',
  summaryEs: 'Resumen',
  summaryEn: 'Summary',
  descriptionEs: 'Descripción',
  descriptionEn: 'Description',
} as const;
