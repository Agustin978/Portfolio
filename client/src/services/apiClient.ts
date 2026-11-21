import { env } from '../config/env';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details: unknown };
}

// Client-side codes, alongside the server's (VALIDATION_ERROR, RATE_LIMITED, ...).
// NETWORK_ERROR and TIMEOUT carry status 0: no HTTP response arrived.
export const CLIENT_ERROR_CODES = {
  network: 'NETWORK_ERROR',
  timeout: 'TIMEOUT',
  invalidResponse: 'INVALID_RESPONSE',
} as const;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const REQUEST_TIMEOUT_MS = 60_000;

export interface RequestOptions {
  // From TanStack Query: cancels the request when the query is no longer needed.
  signal?: AbortSignal;
  // The public site never sends cookies; the admin panel will opt in with 'include'.
  credentials?: RequestCredentials;
  timeoutMs?: number;
}

interface RequestConfig extends RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

const isEnvelope = (value: unknown): value is ApiSuccess<unknown> | ApiErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  ((value as { success?: unknown }).success === true ||
    (value as { success?: unknown }).success === false);

async function request<T>(
  path: string,
  { method, body, signal, credentials = 'omit', timeoutMs = REQUEST_TIMEOUT_MS }: RequestConfig,
): Promise<ApiSuccess<T>> {
  // One controller for both the caller's cancellation and our timeout, so either one also stops
  // reading the body.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener('abort', forwardAbort, { once: true });

  // Content-Type only with a body: on a cross-origin GET it would force a preflight request.
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    let res: Response;
    let parsed: unknown;
    try {
      res = await fetch(`${env.apiBaseUrl}${path}`, {
        method,
        headers,
        credentials,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      parsed = await res.json().catch((error: unknown) => {
        if (controller.signal.aborted) throw error;
        return undefined;
      });
    } catch (error) {
      if (timedOut) throw new ApiError(0, CLIENT_ERROR_CODES.timeout, 'Request timed out');
      // A cancellation by the caller stays an abort, so TanStack Query treats it as one.
      if (signal?.aborted) throw error;
      throw new ApiError(0, CLIENT_ERROR_CODES.network, 'Network request failed');
    }

    // Not our JSON envelope: a proxy error page (Render's 502), or HTML from a wrong API URL.
    if (!isEnvelope(parsed)) {
      throw new ApiError(res.status, CLIENT_ERROR_CODES.invalidResponse, 'Unexpected response');
    }
    if (!parsed.success || !res.ok) {
      const error = parsed.success ? null : parsed.error;
      throw new ApiError(
        res.status,
        error?.code ?? CLIENT_ERROR_CODES.invalidResponse,
        error?.message ?? 'Unexpected response',
        error?.details ?? null,
      );
    }
    return parsed as ApiSuccess<T>;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

// Only failures that a second attempt can fix: the network, or a gateway in front of a server
// that is starting up. A timeout already waited 60 s, so the person decides whether to retry.
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.code === CLIENT_ERROR_CODES.network || [502, 503, 504].includes(error.status);
}

export const apiClient = {
  get: <T>(path: string, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body: unknown, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body: unknown, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
