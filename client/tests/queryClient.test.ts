import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '../src/app/queryClient';
import { apiClient } from '../src/services/apiClient';
import { apiError, hang, mockApi, networkError, ok, text } from './helpers/mockApi';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const fetchProjects = () => {
  const client = createQueryClient();
  const promise = client.fetchQuery({
    queryKey: ['projects'],
    queryFn: ({ signal }) => apiClient.get('/projects', { signal }),
  });
  // Settled into a value right away, so a rejection is never reported as unhandled while the
  // timers advance.
  return promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
};

describe('query retry policy', () => {
  it('retries a 503 and a 502 page, after 1 s and then 2 s', async () => {
    const api = mockApi().on(
      'GET /projects',
      apiError(503, 'SERVICE_UNAVAILABLE'),
      text(502, 'Bad Gateway'),
      ok([]),
    );

    const result = fetchProjects();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(api.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(api.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.fetch).toHaveBeenCalledTimes(3);

    expect(await result).toEqual({ value: { success: true, data: [], meta: {} } });
  });

  it('stops after two retries', async () => {
    const api = mockApi().on('GET /projects', networkError());

    const result = fetchProjects();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(api.fetch).toHaveBeenCalledTimes(3);
    expect(await result).toMatchObject({ error: { code: 'NETWORK_ERROR' } });
  });

  it.each([
    ['a 500', apiError(500, 'INTERNAL_ERROR')],
    ['a 404', apiError(404, 'PROJECT_NOT_FOUND')],
    ['a 400', apiError(400, 'VALIDATION_ERROR')],
  ])('does not retry %s', async (_, reply) => {
    const api = mockApi().on('GET /projects', reply);

    const result = fetchProjects();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(api.fetch).toHaveBeenCalledTimes(1);
    expect(await result).toHaveProperty('error');
  });

  it('does not retry a timeout: the person decides', async () => {
    const api = mockApi().on('GET /projects', hang);

    const result = fetchProjects();
    await vi.advanceTimersByTimeAsync(70_000);

    expect(api.fetch).toHaveBeenCalledTimes(1);
    expect(await result).toMatchObject({ error: { code: 'TIMEOUT' } });
  });
});

describe('query client defaults', () => {
  it('caches for 5 minutes, ignores window focus and never retries mutations', () => {
    const defaults = createQueryClient().getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(5 * 60_000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
  });
});
