import { vi } from 'vitest';

// A stand-in for the API that replaces global fetch (no msw, see plan section 5.7).
// Routes are "METHOD /path?query" relative to /api/v1, e.g. "GET /projects?lang=es".
// Each call takes the next reply in order; the last one repeats.

type Reply = Response | Error | typeof hang | (() => Response | Promise<Response>);

export const API_PREFIX = '/api/v1';

// Never answers; rejects only when the request is aborted (timeout or cancellation).
export const hang = Symbol('hang');

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const ok = (data: unknown, meta: Record<string, unknown> = {}, status = 200) =>
  jsonResponse(status, { success: true, data, meta });

export const apiError = (status: number, code: string, details: unknown = null) =>
  jsonResponse(status, { success: false, error: { code, message: `${code} (test)`, details } });

export const text = (status: number, body: string) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html' } });

// What fetch throws when the network, DNS or CORS fails.
export const networkError = () => new TypeError('Failed to fetch');

export interface RecordedCall {
  method: string;
  route: string;
  url: string;
  headers: Record<string, string>;
  credentials: RequestCredentials | undefined;
  body: unknown;
  signal: AbortSignal | undefined;
}

export function mockApi() {
  const routes = new Map<string, Reply[]>();
  const calls: RecordedCall[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = (init.method ?? 'GET').toUpperCase();
    const { pathname, search } = new URL(url, 'http://localhost');
    const route = `${method} ${pathname.replace(API_PREFIX, '')}${search}`;
    const signal = init.signal ?? undefined;
    calls.push({
      method,
      route,
      url,
      headers: { ...(init.headers as Record<string, string>) },
      credentials: init.credentials,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
      signal,
    });

    const replies = routes.get(route);
    if (!replies) {
      // Distinctive, so an unmocked request shows up in the assertion instead of as a network error.
      return apiError(501, 'UNMOCKED_REQUEST', { route });
    }
    const reply = replies.length > 1 ? replies.shift()! : replies[0]!;
    if (reply === hang) {
      return new Promise<Response>((_, reject) => {
        const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
      });
    }
    if (reply instanceof Error) throw reply;
    if (typeof reply === 'function') return reply();
    // A Response body can be read once; clone so a repeated reply still works.
    return reply.clone();
  });

  vi.stubGlobal('fetch', fetchMock);

  return {
    on(route: string, ...replies: Reply[]) {
      routes.set(route, replies);
      return this;
    },
    calls,
    fetch: fetchMock,
  };
}
