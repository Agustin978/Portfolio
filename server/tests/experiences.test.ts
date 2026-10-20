import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createExperiencesRepository } from '../src/modules/experiences/experiences.repository.js';
import { createExperiencesService } from '../src/modules/experiences/experiences.service.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

let db: TestDb;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(() => resetDb(db));

const base = { company: 'Acme', startDate: new Date('2022-01-01') };
const copy = {
  roleEs: 'Desarrollador',
  roleEn: 'Developer',
  descriptionEs: 'Descripción',
  descriptionEn: 'Description',
};
const published = { ...base, ...copy, status: 'published' as const };

describe('experiences repository: deactivated_at IS NULL', () => {
  it('findPublished returns only published and active experiences', async () => {
    const visible = await db.experience.create({ data: published });
    await db.experience.create({ data: { ...published, deactivatedAt: new Date() } });
    await db.experience.create({ data: base }); // draft

    const rows = await createExperiencesRepository(db).findPublished();

    expect(rows.map((e) => e.id)).toEqual([visible.id]);
  });

  it('findAll hides deactivated experiences by default and includes them on request', async () => {
    const active = await db.experience.create({ data: base });
    const inactive = await db.experience.create({ data: { ...base, deactivatedAt: new Date() } });
    const repository = createExperiencesRepository(db);

    expect((await repository.findAll()).map((e) => e.id)).toEqual([active.id]);
    expect(
      (await repository.findAll({ includeDeactivated: true })).map((e) => e.id).sort(),
    ).toEqual([active.id, inactive.id].sort());
  });

  it('lists the current position before finished ones', async () => {
    const finished = await db.experience.create({
      data: { ...base, endDate: new Date('2023-01-01') },
    });
    const current = await db.experience.create({
      data: { ...base, startDate: new Date('2021-01-01') },
    });

    const rows = await createExperiencesRepository(db).findAll();

    expect(rows.map((e) => e.id)).toEqual([current.id, finished.id]);
  });
});

describe('experiences service', () => {
  const build = () => createExperiencesService(createExperiencesRepository(db));

  it('deactivate hides the experience from public reads and reactivate brings it back', async () => {
    const experience = await db.experience.create({ data: published });
    const repository = createExperiencesRepository(db);

    await build().deactivate(experience.id);
    expect(await repository.findPublished()).toHaveLength(0);

    await build().reactivate(experience.id);
    expect(await repository.findPublished()).toHaveLength(1);
  });

  it('rejects unknown ids and repeated transitions', async () => {
    const experience = await db.experience.create({ data: base });

    await expect(build().deactivate(9999)).rejects.toMatchObject({ statusCode: 404 });
    await expect(build().reactivate(experience.id)).rejects.toMatchObject({ statusCode: 409 });
    await build().deactivate(experience.id);
    await expect(build().deactivate(experience.id)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('offers no way to physically delete an experience', () => {
    expect(Object.keys(build())).toEqual(['deactivate', 'reactivate']);
    expect(Object.keys(createExperiencesRepository(db))).not.toContain('delete');
  });
});
