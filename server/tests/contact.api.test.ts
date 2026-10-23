import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

let db: TestDb;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(() => resetDb(db));

// Each call gets its own client IP so the 5-per-hour limit never leaks between tests.
let ipCounter = 0;
const nextIp = () => `10.1.0.${++ipCounter}`;

const valid = {
  name: 'Ana Pérez',
  email: 'ana@example.com',
  message: 'Hola, me gustaría hablar de un proyecto.',
};

const submit = (body: unknown, ip = nextIp()) =>
  request(app)
    .post('/api/v1/contact')
    .set('X-Forwarded-For', ip)
    .send(body as object);

const headerNames = (res: request.Response) =>
  Object.keys(res.headers)
    .filter((name) => !name.startsWith('ratelimit'))
    .sort();

describe('POST /api/v1/contact', () => {
  it('stores the message and answers only { received: true }', async () => {
    const res = await submit({ ...valid, lang: 'en' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: { received: true }, meta: {} });
    expect(res.headers['cache-control']).toBe('no-store');
    const rows = await db.contactMessage.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ...valid, lang: 'en', isRead: false });
  });

  it('defaults the language to es and normalizes name, email and message', async () => {
    const res = await submit({
      name: '  Ana  ',
      email: '  Ana@Example.COM ',
      message: '  Dos líneas\ncon salto  ',
    });

    expect(res.status).toBe(201);
    const row = await db.contactMessage.findFirstOrThrow();
    expect(row).toMatchObject({
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Dos líneas\ncon salto',
      lang: 'es',
    });
  });

  it('accepts a message of exactly 5000 characters and rejects 5001', async () => {
    expect((await submit({ ...valid, message: 'a'.repeat(5000) })).status).toBe(201);
    const res = await submit({ ...valid, message: 'a'.repeat(5001) });

    expect(res.status).toBe(400);
    expect(res.body.error.details.message).toBeDefined();
  });

  it.each([
    ['missing name', { ...valid, name: undefined }, 'name'],
    ['blank name', { ...valid, name: '   ' }, 'name'],
    ['name over 100 characters', { ...valid, name: 'a'.repeat(101) }, 'name'],
    ['name with a line break', { ...valid, name: 'Ana\nBcc: x@y.z' }, 'name'],
    ['name with a tab', { ...valid, name: 'Ana\tPérez' }, 'name'],
    ['name with a Unicode line separator', { ...valid, name: 'Ana Pérez' }, 'name'],
    ['name with NUL', { ...valid, name: 'Ana\u0000x' }, 'name'],
    ['invalid email', { ...valid, email: 'not-an-email' }, 'email'],
    ['email over 254 characters', { ...valid, email: `${'a'.repeat(250)}@example.com` }, 'email'],
    ['message too short', { ...valid, message: 'corto' }, 'message'],
    ['message with NUL', { ...valid, message: 'hola mundo \u0000 adiós' }, 'message'],
    ['unknown language', { ...valid, lang: 'fr' }, 'lang'],
    ['non-string name', { ...valid, name: 42 }, 'name'],
  ])('rejects %s with 400 naming the field', async (_label, body, field) => {
    const res = await submit(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[field]).toBeDefined();
    expect(await db.contactMessage.count()).toBe(0);
  });

  it('allows line breaks in the message but not unknown fields', async () => {
    expect((await submit({ ...valid, message: 'línea uno\n\nlínea dos' })).status).toBe(201);

    const res = await submit({ ...valid, isRead: true });
    expect(res.status).toBe(400);
  });

  it('never echoes the submitted values in validation errors', async () => {
    const res = await submit({ ...valid, email: 'secret-visitor@nope', lang: 'zz-secret' });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/secret/);
  });

  it('answers a malformed JSON body with 400, not 500', async () => {
    const res = await request(app)
      .post('/api/v1/contact')
      .set('X-Forwarded-For', nextIp())
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
  });

  describe('honeypot hp_check', () => {
    it('answers exactly like a real submission and stores nothing', async () => {
      const real = await submit(valid);
      await resetDb(db);
      const trapped = await submit({ ...valid, hp_check: 'http://spam.example' });

      expect(trapped.status).toBe(real.status);
      expect(trapped.body).toEqual(real.body);
      expect(headerNames(trapped)).toEqual(headerNames(real));
      expect(await db.contactMessage.count()).toBe(0);
    });

    it('answers 201 even when the rest of the body is invalid', async () => {
      const res = await submit({ hp_check: 'x', name: '', email: 'nope' });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual({ received: true });
      expect(await db.contactMessage.count()).toBe(0);
    });

    it.each([
      ['non-string', 5],
      ['null', null],
      ['array', ['x']],
    ])('treats a %s value as filled', async (_label, hp_check) => {
      const res = await submit({ ...valid, hp_check });

      expect(res.status).toBe(201);
      expect(await db.contactMessage.count()).toBe(0);
    });

    it('accepts an empty or blank hp_check as a real submission', async () => {
      expect((await submit({ ...valid, hp_check: '' })).status).toBe(201);
      expect((await submit({ ...valid, hp_check: '   ' })).status).toBe(201);
      expect(await db.contactMessage.count()).toBe(2);
    });
  });

  it('refuses a foreign Origin with 403 and stores nothing', async () => {
    const res = await request(app)
      .post('/api/v1/contact')
      .set('X-Forwarded-For', nextIp())
      .set('Origin', 'https://evil.example')
      .send(valid);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
    expect(await db.contactMessage.count()).toBe(0);
  });

  it('allows the configured client origin', async () => {
    const res = await request(app)
      .post('/api/v1/contact')
      .set('X-Forwarded-For', nextIp())
      .set('Origin', 'http://localhost:5173')
      .send(valid);

    expect(res.status).toBe(201);
  });

  it('limits each IP to 5 submissions per hour, successful ones included', async () => {
    const ip = '10.9.9.9';
    for (let i = 0; i < 5; i++) expect((await submit(valid, ip)).status).toBe(201);

    const blocked = await submit(valid, ip);

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(await db.contactMessage.count()).toBe(5);
    expect((await submit(valid, '10.9.9.10')).status).toBe(201);
  });
});
