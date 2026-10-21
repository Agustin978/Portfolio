import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthRepository } from '../src/modules/auth/auth.repository.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import { AppError } from '../src/shared/errors/AppError.js';
import { hashPassword, verifyPassword } from '../src/shared/security/password.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

vi.mock('../src/shared/security/password.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/shared/security/password.js')>();
  return { ...actual, verifyPassword: vi.fn(actual.verifyPassword) };
});

const SECRET = 'service-test-secret-0123456789-abcdefghij';
const PASSWORD = 'correct-horse-battery';

let db: TestDb;
let service: ReturnType<typeof createAuthService>;
let adminId: number;

beforeAll(() => {
  db = createTestDb();
  service = createAuthService(createAuthRepository(db), {
    jwtSecret: SECRET,
    expiresInSeconds: 28800,
  });
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  vi.mocked(verifyPassword).mockClear();
  const admin = await db.adminUser.create({
    data: { email: 'admin@example.com', passwordHash: await hashPassword(PASSWORD) },
  });
  adminId = admin.id;
});

const rejection = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('login', () => {
  it('returns a token and the public admin for valid credentials', async () => {
    const { token, admin } = await service.login('admin@example.com', PASSWORD);

    expect(admin).toEqual({ id: adminId, email: 'admin@example.com' });
    expect(admin).not.toHaveProperty('passwordHash');
    expect(typeof token).toBe('string');
  });

  it('puts only sub (plus iat/exp) in the token and expires after the configured seconds', async () => {
    const { token } = await service.login('admin@example.com', PASSWORD);
    const payload = jwt.decode(token) as jwt.JwtPayload;

    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(payload.sub).toBe(String(adminId));
    expect(payload.exp! - payload.iat!).toBe(28800);
  });

  it('answers a wrong password and an unknown email with the same error', async () => {
    const wrongPassword = await rejection(service.login('admin@example.com', 'wrong-password-123'));
    const unknownEmail = await rejection(service.login('nobody@example.com', PASSWORD));

    expect(unknownEmail.statusCode).toBe(401);
    expect(unknownEmail.code).toBe('INVALID_CREDENTIALS');
    expect(unknownEmail.message).toBe(wrongPassword.message);
    expect(unknownEmail.code).toBe(wrongPassword.code);
  });

  it('still runs one argon2 verification when the email does not exist', async () => {
    await rejection(service.login('nobody@example.com', PASSWORD));

    expect(verifyPassword).toHaveBeenCalledTimes(1);
  });
});

describe('authenticate', () => {
  it('accepts a freshly issued token', async () => {
    const { token } = await service.login('admin@example.com', PASSWORD);

    expect(await service.authenticate(token)).toEqual({ id: adminId, email: 'admin@example.com' });
  });

  it('rejects a token signed with another secret', async () => {
    const forged = jwt.sign({}, 'another-secret-0123456789-abcdefghijkl', {
      subject: String(adminId),
    });

    expect((await rejection(service.authenticate(forged))).code).toBe('UNAUTHENTICATED');
  });

  it('rejects a token with alg none', async () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      sub: String(adminId),
      iat: nowSeconds(),
    })}.`;

    expect((await rejection(service.authenticate(unsigned))).code).toBe('UNAUTHENTICATED');
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({}, SECRET, {
      subject: String(adminId),
      algorithm: 'HS256',
      expiresIn: -10,
    });

    expect((await rejection(service.authenticate(expired))).code).toBe('UNAUTHENTICATED');
  });

  it('rejects a valid token whose admin no longer exists', async () => {
    const { token } = await service.login('admin@example.com', PASSWORD);
    await db.adminUser.delete({ where: { id: adminId } });

    expect((await rejection(service.authenticate(token))).code).toBe('UNAUTHENTICATED');
  });

  it('rejects a token issued before admin_users.updated_at', async () => {
    const { token } = await service.login('admin@example.com', PASSWORD);
    await db.adminUser.update({
      where: { id: adminId },
      data: { updatedAt: new Date(Date.now() + 5000) },
    });

    expect((await rejection(service.authenticate(token))).code).toBe('UNAUTHENTICATED');
  });

  it('rejects garbage and a non-numeric subject', async () => {
    const strangeSub = jwt.sign({}, SECRET, { subject: 'abc', algorithm: 'HS256' });

    expect((await rejection(service.authenticate('not-a-jwt'))).code).toBe('UNAUTHENTICATED');
    expect((await rejection(service.authenticate(strangeSub))).code).toBe('UNAUTHENTICATED');
  });
});
