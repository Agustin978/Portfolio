import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createProjectsRepository } from '../src/modules/projects/projects.repository.js';
import { createProjectsService } from '../src/modules/projects/projects.service.js';
import { AppError } from '../src/shared/errors/AppError.js';
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
let categoryId: number;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  categoryId = (await createCategory(db)).id;
});

const published = { ...fullProjectCopy, status: 'published' as const };

describe('projects repository: deactivated_at IS NULL', () => {
  it('findPublished returns only published and active projects', async () => {
    const visible = await createProject(db, categoryId, published);
    await createProject(db, categoryId, { ...published, deactivatedAt: new Date() });
    await createProject(db, categoryId, {}); // draft
    await createProject(db, categoryId, { deactivatedAt: new Date() }); // deactivated draft

    const rows = await createProjectsRepository(db).findPublished();

    expect(rows.map((p) => p.slug)).toEqual([visible.slug]);
  });

  it('findPublishedBySlug does not return a deactivated project', async () => {
    const project = await createProject(db, categoryId, {
      ...published,
      deactivatedAt: new Date(),
    });

    const row = await createProjectsRepository(db).findPublishedBySlug(project.slug);

    expect(row).toBeNull();
  });

  it('findAll hides deactivated projects by default and includes them on request', async () => {
    const active = await createProject(db, categoryId);
    const inactive = await createProject(db, categoryId, { deactivatedAt: new Date() });
    const repository = createProjectsRepository(db);

    expect((await repository.findAll()).map((p) => p.id)).toEqual([active.id]);
    const all = await repository.findAll({ includeDeactivated: true });
    expect(all.map((p) => p.id).sort()).toEqual([active.id, inactive.id].sort());
  });

  it('findById still finds a deactivated project so it can be reactivated', async () => {
    const inactive = await createProject(db, categoryId, { deactivatedAt: new Date() });

    expect(await createProjectsRepository(db).findById(inactive.id)).not.toBeNull();
  });
});

describe('projects service', () => {
  const build = () => createProjectsService(createProjectsRepository(db));

  it('deactivate hides the project from public reads and reactivate brings it back', async () => {
    const project = await createProject(db, categoryId, published);
    await attachImage(db, project.id);
    const repository = createProjectsRepository(db);

    await build().deactivate(project.id);
    expect(await repository.findPublished()).toHaveLength(0);

    await build().reactivate(project.id);
    expect(await repository.findPublished()).toHaveLength(1);
  });

  it('rejects unknown ids and repeated transitions with AppError', async () => {
    const project = await createProject(db, categoryId);

    await expect(build().deactivate(9999)).rejects.toMatchObject({ statusCode: 404 });
    await expect(build().reactivate(project.id)).rejects.toMatchObject({ statusCode: 409 });
    await build().deactivate(project.id);
    await expect(build().deactivate(project.id)).rejects.toBeInstanceOf(AppError);
  });

  it('offers no way to physically delete a project', () => {
    for (const name of ['delete', 'remove', 'destroy']) {
      expect(Object.keys(build())).not.toContain(name);
      expect(Object.keys(createProjectsRepository(db))).not.toContain(name);
    }
  });
});
