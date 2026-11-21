import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { disconnectPrisma, getPrisma } from '../src/shared/db/index.js';

const openSockets = () =>
  process.getActiveResourcesInfo().filter((kind) => kind === 'TCPSocketWrap').length;

describe('app database client lifecycle', () => {
  it('closes the pool opened by the app and is safe to call twice', async () => {
    await request(app).get('/api/v1/health');
    await getPrisma().$queryRaw`SELECT 1`;
    expect(openSockets()).toBeGreaterThan(0);

    await disconnectPrisma();
    await disconnectPrisma();
    // Socket teardown finishes on the next turns of the event loop.
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(openSockets()).toBe(0);
  });

  it('opens a fresh client after a disconnect', async () => {
    const first = getPrisma();
    await disconnectPrisma();

    const second = getPrisma();

    expect(second).not.toBe(first);
    await expect(second.$queryRaw`SELECT 1 AS ok`).resolves.toEqual([{ ok: 1 }]);
  });
});
