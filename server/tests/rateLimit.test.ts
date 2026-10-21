import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { errorHandler } from '../src/shared/middlewares/errorHandler.js';
import { createRateLimiter } from '../src/shared/middlewares/rateLimit.js';
import { hashPassword } from '../src/shared/security/password.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

// Minimal app: POST /try succeeds only when the body says so, which is what the login does.
const buildLimitedApp = (skipSuccessfulRequests: boolean) => {
  const limited = express();
  limited.set('trust proxy', 1);
  limited.use(express.json());
  limited.post(
    '/try',
    createRateLimiter({ limit: 2, windowMs: 60_000, skipSuccessfulRequests }),
    (req, res) => {
      res.status(req.body.succeed ? 200 : 401).json({ ok: Boolean(req.body.succeed) });
    },
  );
  limited.use(errorHandler);
  return limited;
};

const attempt = (target: express.Express, ip: string, succeed: boolean) =>
  request(target).post('/try').set('X-Forwarded-For', ip).send({ succeed });

describe('createRateLimiter', () => {
  it('blocks after the injected limit with the standard error envelope', async () => {
    const limited = buildLimitedApp(true);

    expect((await attempt(limited, '1.1.1.1', false)).status).toBe(401);
    expect((await attempt(limited, '1.1.1.1', false)).status).toBe(401);
    const blocked = await attempt(limited, '1.1.1.1', false);

    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false, error: { code: 'RATE_LIMITED' } });
  });

  it('does not count successful requests when skipSuccessfulRequests is on', async () => {
    const limited = buildLimitedApp(true);

    for (let i = 0; i < 5; i++) {
      expect((await attempt(limited, '2.2.2.2', true)).status).toBe(200);
    }
  });

  it('counts successful requests when skipSuccessfulRequests is off', async () => {
    const limited = buildLimitedApp(false);

    await attempt(limited, '3.3.3.3', true);
    await attempt(limited, '3.3.3.3', true);

    expect((await attempt(limited, '3.3.3.3', true)).status).toBe(429);
  });

  it('keeps a separate bucket per client IP behind one trusted proxy', async () => {
    const limited = buildLimitedApp(true);
    await attempt(limited, '4.4.4.4', false);
    await attempt(limited, '4.4.4.4', false);

    expect((await attempt(limited, '4.4.4.4', false)).status).toBe(429);
    expect((await attempt(limited, '5.5.5.5', false)).status).toBe(401);
  });
});

describe('POST /api/v1/auth/login rate limit', () => {
  let db: TestDb;

  beforeAll(() => {
    db = createTestDb();
  });
  afterAll(() => db.$disconnect());
  beforeEach(async () => {
    await resetDb(db);
    await db.adminUser.create({
      data: {
        email: 'admin@example.com',
        passwordHash: await hashPassword('correct-horse-battery'),
      },
    });
  });

  const login = (password: string, ip: string) =>
    request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'admin@example.com', password });

  it('locks the IP out after 5 failed attempts, even for the right password', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await login('wrong-password-1', '9.9.9.9')).status).toBe(401);
    }

    const locked = await login('correct-horse-battery', '9.9.9.9');
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('RATE_LIMITED');

    expect((await login('correct-horse-battery', '9.9.9.10')).status).toBe(200);
  });

  it('does not count successful logins toward the limit', async () => {
    for (let i = 0; i < 7; i++) {
      expect((await login('correct-horse-battery', '8.8.8.8')).status).toBe(200);
    }
  });
});
