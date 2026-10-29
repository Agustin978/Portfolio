import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

// env is parsed when the module loads, so each case re-imports the app with its own CLIENT_ORIGIN.
const loadApp = async (clientOrigin: string) => {
  vi.resetModules();
  vi.stubEnv('CLIENT_ORIGIN', clientOrigin);
  return (await import('../src/app.js')).app;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('CORS with a CLIENT_ORIGIN written with a trailing slash', () => {
  // A browser compares Access-Control-Allow-Origin with the page origin as plain text, so a
  // configured "https://app.example.com/" would block every cross-site call in production.
  it('answers with the bare origin on a simple request', async () => {
    const app = await loadApp('http://localhost:5173/');

    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('answers the preflight with the bare origin', async () => {
    const app = await loadApp('http://localhost:5173/');

    const res = await request(app)
      .options('/api/v1/contact')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('drops a path as well, since an Origin header never carries one', async () => {
    const app = await loadApp('https://app.example.com/portfolio/');

    const res = await request(app).get('/api/v1/health').set('Origin', 'https://app.example.com');

    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  it('keeps the origin guard accepting that same origin', async () => {
    const app = await loadApp('http://localhost:5173/');

    // An empty body is rejected by validation (400) before touching the database; a 403 would
    // mean the guard turned the legitimate client away.
    const res = await request(app)
      .post('/api/v1/contact')
      .set('X-Forwarded-For', '172.16.9.1')
      .set('Origin', 'http://localhost:5173')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
