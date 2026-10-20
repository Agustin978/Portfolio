export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details: unknown };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = '/api/v1';

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiSuccess<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  const body = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiErrorBody | null;

  if (!res.ok || !body || !body.success) {
    const err = body && !body.success ? body.error : null;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? res.statusText,
      err?.details ?? null,
    );
  }
  return body;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, payload?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(payload) }),
  put: <T>(path: string, payload?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
