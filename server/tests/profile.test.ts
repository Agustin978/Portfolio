import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { createAdminSession } from './helpers/auth.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

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
const seedProfile = () =>
  db.profile.create({
    data: {
      id: 1,
      fullName: 'Ana Pérez',
      location: 'Córdoba',
      publicEmail: 'ana@example.com',
      cvUrlEs: 'https://example.com/cv-es.pdf',
      cvUrlEn: 'https://example.com/cv-en.pdf',
      roleEs: 'Desarrolladora',
      roleEn: 'Developer',
      headlineEs: 'Titular',
      headlineEn: 'Headline',
      introEs: 'Intro ES',
      introEn: 'Intro EN',
      bioEs: 'Bio ES',
      bioEn: null,
    },
  });

describe('GET /api/v1/profile (public)', () => {
  it('returns exactly the public keys, in Spanish by default', async () => {
    await seedProfile();

    const res = await request(app).get('/api/v1/profile');

    expect(res.status).toBe(200);
    expect(keys(res.body.data)).toEqual([
      'availability',
      'bio',
      'cvUrl',
      'fullName',
      'headline',
      'intro',
      'location',
      'publicEmail',
      'role',
    ]);
    expect(res.body.data).toMatchObject({
      fullName: 'Ana Pérez',
      role: 'Desarrolladora',
      cvUrl: 'https://example.com/cv-es.pdf',
      availability: null,
    });
  });

  it('serves English and falls back to Spanish where English is missing', async () => {
    await seedProfile();

    const res = await request(app).get('/api/v1/profile?lang=en');

    expect(res.body.data).toMatchObject({
      role: 'Developer',
      cvUrl: 'https://example.com/cv-en.pdf',
      bio: 'Bio ES',
      availability: null,
    });
  });

  it('rejects an invalid lang with 400 and 404s when the seed has not run', async () => {
    expect((await request(app).get('/api/v1/profile?lang=de')).status).toBe(400);

    const res = await request(app).get('/api/v1/profile');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });
});

describe('/api/v1/admin/profile', () => {
  const patch = (data: object) =>
    request(app).patch('/api/v1/admin/profile').set('Cookie', cookie).send(data);

  it('returns every column in both languages plus updatedAt', async () => {
    await seedProfile();

    const res = await request(app).get('/api/v1/admin/profile').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(keys(res.body.data)).toEqual([
      'availabilityEn',
      'availabilityEs',
      'bioEn',
      'bioEs',
      'cvUrlEn',
      'cvUrlEs',
      'fullName',
      'headlineEn',
      'headlineEs',
      'introEn',
      'introEs',
      'location',
      'publicEmail',
      'roleEn',
      'roleEs',
      'updatedAt',
    ]);
  });

  it('updates only the fields sent and clears a field with an empty string', async () => {
    await seedProfile();

    const res = await patch({ bioEn: 'Bio EN', location: '' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ bioEn: 'Bio EN', location: null, fullName: 'Ana Pérez' });
  });

  it('normalizes the public email and rejects invalid values', async () => {
    await seedProfile();

    expect((await patch({ publicEmail: '  New@Example.COM ' })).body.data.publicEmail).toBe(
      'new@example.com',
    );
    expect((await patch({ publicEmail: '' })).body.data.publicEmail).toBeNull();
    expect((await patch({ publicEmail: 'not-an-email' })).status).toBe(400);
    expect((await patch({ cvUrlEs: 'javascript:alert(1)' })).status).toBe(400);
    expect((await patch({ fullName: '  ' })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect((await patch({ id: 2 })).status).toBe(400);
  });

  it('answers 404, not 500, when the singleton row does not exist', async () => {
    const res = await patch({ fullName: 'Ana' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });
});
