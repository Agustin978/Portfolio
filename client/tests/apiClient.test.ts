import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient, isRetryable, REQUEST_TIMEOUT_MS } from '../src/services/apiClient';
import { apiError, hang, mockApi, networkError, ok, text } from './helpers/mockApi';

afterEach(() => {
  vi.useRealTimers();
});

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the request to fail');
};

describe('apiClient', () => {
  it('calls the API under /api/v1 and returns the envelope', async () => {
    const api = mockApi().on('GET /profile?lang=es', ok({ fullName: 'Agustín' }));

    const body = await apiClient.get('/profile?lang=es');

    expect(api.calls[0]!.url).toBe('/api/v1/profile?lang=es');
    expect(body).toEqual({ success: true, data: { fullName: 'Agustín' }, meta: {} });
  });

  it('sends Content-Type only when there is a body', async () => {
    const api = mockApi()
      .on('GET /skills', ok([]))
      .on('POST /contact', ok({ received: true }, {}, 201));

    await apiClient.get('/skills');
    await apiClient.post('/contact', { name: 'Ana' });

    expect(api.calls[0]!.headers).not.toHaveProperty('Content-Type');
    expect(api.calls[1]!.headers['Content-Type']).toBe('application/json');
    expect(api.calls[1]!.body).toEqual({ name: 'Ana' });
  });

  it('sends no cookies unless the call asks for them', async () => {
    const api = mockApi().on('GET /skills', ok([]));

    await apiClient.get('/skills');
    await apiClient.get('/skills', { credentials: 'include' });

    expect(api.calls.map((call) => call.credentials)).toEqual(['omit', 'include']);
  });

  it('turns a 400 into an ApiError with the field details', async () => {
    const details = { fieldErrors: { email: ['Invalid email'] } };
    mockApi().on('POST /contact', apiError(400, 'VALIDATION_ERROR', details));

    const error = await rejection(apiClient.post('/contact', {}));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', details });
  });

  it('keeps the code of a 429', async () => {
    mockApi().on('POST /contact', apiError(429, 'RATE_LIMITED'));

    expect(await rejection(apiClient.post('/contact', {}))).toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    });
  });

  it('turns a non-JSON error page into INVALID_RESPONSE with its status', async () => {
    mockApi().on('GET /projects', text(502, '<html>Bad Gateway</html>'));

    expect(await rejection(apiClient.get('/projects'))).toMatchObject({
      status: 502,
      code: 'INVALID_RESPONSE',
    });
  });

  it('rejects a 200 that is not the API envelope (e.g. HTML from a wrong API URL)', async () => {
    mockApi().on('GET /projects', text(200, '<!doctype html><html></html>'));

    expect(await rejection(apiClient.get('/projects'))).toMatchObject({
      status: 200,
      code: 'INVALID_RESPONSE',
    });
  });

  it('turns a network failure into NETWORK_ERROR with status 0', async () => {
    mockApi().on('GET /projects', networkError());

    expect(await rejection(apiClient.get('/projects'))).toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('gives up after 60 s with TIMEOUT', async () => {
    vi.useFakeTimers();
    const api = mockApi().on('GET /projects', hang);

    const result = rejection(apiClient.get('/projects'));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);
    expect(api.calls[0]!.signal!.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(await result).toMatchObject({ status: 0, code: 'TIMEOUT' });
  });

  it('leaves a cancellation by the caller as an abort, not an ApiError', async () => {
    mockApi().on('GET /projects', hang);
    const controller = new AbortController();

    const result = rejection(apiClient.get('/projects', { signal: controller.signal }));
    controller.abort();

    const error = await result;
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});

describe('isRetryable', () => {
  it.each([
    ['a network failure', new ApiError(0, 'NETWORK_ERROR', ''), true],
    ['a 502 error page', new ApiError(502, 'INVALID_RESPONSE', ''), true],
    ['a 503', new ApiError(503, 'SERVICE_UNAVAILABLE', ''), true],
    ['a 504', new ApiError(504, 'INVALID_RESPONSE', ''), true],
    ['a timeout', new ApiError(0, 'TIMEOUT', ''), false],
    ['a 500', new ApiError(500, 'INTERNAL_ERROR', ''), false],
    ['a 404', new ApiError(404, 'PROJECT_NOT_FOUND', ''), false],
    ['a 429', new ApiError(429, 'RATE_LIMITED', ''), false],
    ['an unrelated error', new Error('other'), false],
  ])('%s -> %s', (_, error, expected) => {
    expect(isRetryable(error)).toBe(expected);
  });
});
