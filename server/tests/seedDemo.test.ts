import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  demoCategories,
  demoExperiences,
  demoProfile,
  demoProjects,
  demoSocialLinks,
  demoTechnologies,
} from '../prisma/demo/content.js';
import { assertDemoTarget } from '../prisma/demo/guard.js';
import { experienceBody, imagesLabel, projectBody, runSeedDemo } from '../prisma/demo/run.js';
import { createCategoryBody } from '../src/modules/categories/categories.schemas.js';
import { createExperienceBody } from '../src/modules/experiences/experiences.schemas.js';
import { updateProfileBody } from '../src/modules/profile/profile.schemas.js';
import { createProjectBody } from '../src/modules/projects/projects.schemas.js';
import { createProjectsRepository } from '../src/modules/projects/projects.repository.js';
import { createProjectsService } from '../src/modules/projects/projects.service.js';
import { createSocialLinkBody } from '../src/modules/social-links/social-links.schemas.js';
import { createTechnologyBody } from '../src/modules/technologies/technologies.schemas.js';
import { fakeStorage } from './helpers/fakeStorage.js';
import {
  attachImage,
  createCategory,
  createProject,
  createTestDb,
  resetDb,
  type TestDb,
} from './helpers/testDb.js';

const totalImages = demoProjects.reduce((sum, project) => sum + project.images.length, 0);

describe('assertDemoTarget', () => {
  it('accepts a development database outside production', () => {
    expect(() =>
      assertDemoTarget({ nodeEnv: 'development', databaseName: 'portfolio_dev' }),
    ).not.toThrow();
  });

  it('refuses production even on a _dev database', () => {
    expect(() =>
      assertDemoTarget({ nodeEnv: 'production', databaseName: 'portfolio_dev' }),
    ).toThrow(/NODE_ENV=production/);
  });

  it.each(['portfolio_test', 'portfolio', 'neondb', 'portfolio_dev_backup'])(
    'refuses the database %s',
    (databaseName) => {
      expect(() => assertDemoTarget({ nodeEnv: 'development', databaseName })).toThrow(/_dev/);
    },
  );
});

describe('imagesLabel', () => {
  it('uses the singular only for one image', () => {
    expect(imagesLabel(1)).toBe('1 imagen');
    expect(imagesLabel(3)).toBe('3 imágenes');
  });
});
describe('demo content integrity', () => {
  const technologySlugs = new Set(demoTechnologies.map((t) => t.slug));
  const categorySlugs = new Set(demoCategories.map((c) => c.slug));

  it('gives every project both languages, a known category and at least one image (cover)', () => {
    for (const project of demoProjects) {
      for (const field of [
        'titleEs',
        'titleEn',
        'summaryEs',
        'summaryEn',
        'descriptionEs',
        'descriptionEn',
      ] as const) {
        expect(project[field].trim(), `${project.slug}.${field}`).not.toBe('');
      }
      expect(categorySlugs.has(project.categorySlug), project.slug).toBe(true);
      expect(project.images.length, project.slug).toBeGreaterThan(0);
    }
  });

  it('only references technologies that the demo creates', () => {
    const referenced = [
      ...demoProjects.flatMap((p) => p.technologySlugs),
      ...demoExperiences.flatMap((e) => e.technologySlugs),
    ];
    for (const slug of referenced) expect(technologySlugs.has(slug), slug).toBe(true);
  });

  it('has unique keys for every idempotency lookup', () => {
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(demoCategories.map((c) => c.slug))).toBe(true);
    expect(unique(demoTechnologies.map((t) => t.slug))).toBe(true);
    expect(unique(demoTechnologies.map((t) => t.name.toLowerCase()))).toBe(true);
    expect(unique(demoProjects.map((p) => p.slug))).toBe(true);
    expect(unique(demoExperiences.map((e) => e.company))).toBe(true);
    expect(unique(demoSocialLinks.map((l) => l.platform))).toBe(true);
  });

  it('keeps every demo URL under example.com', () => {
    const urls = [
      demoProfile.publicEmail.split('@')[1],
      ...demoProjects.flatMap((p) => [p.repoUrl, p.liveUrl]),
      ...demoExperiences.map((e) => e.companyUrl),
      ...demoSocialLinks.map((l) => l.url),
    ].filter((url): url is string => url !== null);
    for (const url of urls) expect(url, url).toMatch(/^(https:\/\/)?example\.com(\/|$)/);
  });

  it('passes the same Zod bodies the admin API uses', () => {
    expect(() => updateProfileBody.parse(demoProfile)).not.toThrow();
    for (const category of demoCategories) createCategoryBody.parse(category);
    for (const technology of demoTechnologies) createTechnologyBody.parse(technology);
    for (const link of demoSocialLinks) createSocialLinkBody.parse(link);
    // strictObject bodies: an extra key in the helpers would fail here too.
    for (const project of demoProjects) {
      createProjectBody.parse({ ...projectBody(project, 1, [1]), status: 'published' });
    }
    for (const experience of demoExperiences) {
      createExperienceBody.parse(experienceBody(experience, [1]));
    }
  });
});

describe('runSeedDemo', { timeout: 60_000 }, () => {
  let db: TestDb;

  beforeAll(() => {
    db = createTestDb();
  });
  afterAll(() => db.$disconnect());
  beforeEach(async () => {
    await resetDb(db);
    fakeStorage.reset();
    // The base seed always leaves this placeholder profile in place.
    await db.profile.create({ data: { id: 1, fullName: 'Nombre Apellido' } });
  });

  const run = (storageConfigured = true) =>
    runSeedDemo({ db, storage: fakeStorage, storageConfigured });

  const counts = async () => ({
    categories: await db.projectCategory.count(),
    technologies: await db.technology.count(),
    projects: await db.project.count(),
    experiences: await db.experience.count(),
    socialLinks: await db.socialLink.count(),
    images: await db.image.count(),
  });

  it('creates published content that the public API serves with covers', async () => {
    const report = await run();

    expect(report.failed).toEqual([]);
    expect(await counts()).toEqual({
      categories: demoCategories.length,
      technologies: demoTechnologies.length,
      projects: demoProjects.length,
      experiences: demoExperiences.length,
      socialLinks: demoSocialLinks.length,
      images: totalImages,
    });
    expect(fakeStorage.upload).toHaveBeenCalledTimes(totalImages);

    const projects = createProjectsService(createProjectsRepository(db));
    for (const lang of ['es', 'en'] as const) {
      const listed = await projects.listPublic(lang);
      expect(listed).toHaveLength(demoProjects.length);
      for (const project of listed) expect(project.cover, project.slug).not.toBeNull();
    }
    const detail = await projects.getPublic('rucvm', 'en');
    expect(detail.images).toHaveLength(3);
    expect(detail.title).toBe('RUCVM');

    const profile = await db.profile.findUniqueOrThrow({ where: { id: 1 } });
    expect(profile.fullName).toBe('Agustín');
    expect(profile.headlineEn).toBe(demoProfile.headlineEn);
  });

  it('is idempotent: a second run creates nothing and uploads nothing', async () => {
    await run();
    const before = await counts();
    fakeStorage.upload.mockClear();

    const second = await run();

    expect(second.created).toEqual([]);
    expect(second.failed).toEqual([]);
    expect(await counts()).toEqual(before);
    expect(fakeStorage.upload).not.toHaveBeenCalled();
  });

  it('never overwrites existing data', async () => {
    await db.profile.update({
      where: { id: 1 },
      data: { fullName: 'Nombre Real', headlineEs: 'Mi titular' },
    });
    await db.socialLink.create({ data: { platform: 'github', url: 'https://example.org/me' } });
    await db.technology.create({
      data: { slug: 'my-laravel', name: 'laravel', skillGroup: 'other' },
    });
    const leftover = await db.projectCategory.create({
      data: { slug: 'web-123', nameEs: 'Desarrollo web', nameEn: 'Web development' },
    });

    await run();

    const profile = await db.profile.findUniqueOrThrow({ where: { id: 1 } });
    expect(profile.fullName).toBe('Nombre Real');
    expect(profile.headlineEs).toBe('Mi titular');
    expect(profile.headlineEn).toBe(demoProfile.headlineEn);
    expect((await db.socialLink.findUniqueOrThrow({ where: { platform: 'github' } })).url).toBe(
      'https://example.org/me',
    );
    // Matched by name, so the hand-made technology is reused instead of duplicated.
    const laravel = await db.technology.findMany({
      where: { name: { in: ['laravel', 'Laravel'] } },
    });
    expect(laravel).toHaveLength(1);
    expect(laravel[0]!.skillGroup).toBe('other');
    expect(await db.projectCategory.findUnique({ where: { id: leftover.id } })).toEqual(leftover);
  });

  it('leaves projects as drafts without images when Cloudinary is not configured', async () => {
    const report = await run(false);

    expect(fakeStorage.upload).not.toHaveBeenCalled();
    expect(report.warnings).toHaveLength(1);
    expect(await db.project.count({ where: { status: 'draft' } })).toBe(demoProjects.length);
    expect(await db.image.count()).toBe(0);
  });

  it('reports a failed upload, keeps the project as a draft and carries on', async () => {
    fakeStorage.failUpload = true;

    const report = await run();

    expect(report.failed).toHaveLength(demoProjects.length);
    expect(await db.project.count({ where: { status: 'draft' } })).toBe(demoProjects.length);
    expect(await db.experience.count()).toBe(demoExperiences.length);
    expect(await db.socialLink.count()).toBe(demoSocialLinks.length);
  });

  it('recovers the imageless drafts of a run without Cloudinary', async () => {
    await run(false);

    const report = await run();

    expect(report.failed).toEqual([]);
    expect(report.created.filter((line) => line.includes('recuperado'))).toHaveLength(
      demoProjects.length,
    );
    expect(fakeStorage.upload).toHaveBeenCalledTimes(totalImages);
    expect(await db.project.count({ where: { status: 'published' } })).toBe(demoProjects.length);
    expect(await db.project.count()).toBe(demoProjects.length);
  });

  it('recovers the drafts left by a failed upload once uploads work again', async () => {
    fakeStorage.failUpload = true;
    await run();
    fakeStorage.failUpload = false;

    const report = await run();

    expect(report.failed).toEqual([]);
    expect(await db.project.count({ where: { status: 'published' } })).toBe(demoProjects.length);
    expect(await db.image.count()).toBe(totalImages);
  });

  it('leaves alone drafts that have an image or are deactivated', async () => {
    const category = await createCategory(db);
    const withImage = await createProject(db, category.id, { slug: 'rucvm', titleEs: 'A mano' });
    await attachImage(db, withImage.id);
    const deactivated = await createProject(db, category.id, {
      slug: 'laboratorios-de-redes',
      deactivatedAt: new Date(),
    });

    const report = await run();

    expect(report.skipped).toEqual(
      expect.arrayContaining(['proyecto rucvm', 'proyecto laboratorios-de-redes']),
    );
    const rucvm = await db.project.findUniqueOrThrow({
      where: { id: withImage.id },
      include: { images: true },
    });
    expect(rucvm).toMatchObject({ status: 'draft', titleEs: 'A mano' });
    expect(rucvm.images).toHaveLength(1);
    const labs = await db.project.findUniqueOrThrow({
      where: { id: deactivated.id },
      include: { images: true },
    });
    expect(labs.status).toBe('draft');
    expect(labs.images).toHaveLength(0);
  });
});
