import { describe, expect, it } from 'vitest';
import { canRetry, errorKind, errorMessageKey } from '../../src/lib/apiErrors';
import { ApiError } from '../../src/services/apiClient';

const apiError = (status: number, code: string) => new ApiError(status, code, 'server text');

describe('errorKind', () => {
  it.each([
    [apiError(0, 'NETWORK_ERROR'), 'network', 'errors.network', true],
    [apiError(0, 'TIMEOUT'), 'timeout', 'errors.timeout', true],
    [apiError(400, 'VALIDATION_ERROR'), 'invalid', 'errors.invalid', false],
    [apiError(404, 'PROJECT_NOT_FOUND'), 'notFound', 'notFound.body', false],
    [apiError(429, 'RATE_LIMITED'), 'rateLimited', 'form.errors.rateLimited', false],
    [apiError(500, 'INTERNAL_ERROR'), 'server', 'errors.server', true],
    [apiError(503, 'SERVICE_UNAVAILABLE'), 'server', 'errors.server', true],
    [apiError(502, 'INVALID_RESPONSE'), 'server', 'errors.server', true],
    [apiError(200, 'INVALID_RESPONSE'), 'server', 'errors.server', true],
    [apiError(403, 'FORBIDDEN_ORIGIN'), 'generic', 'errors.generic', false],
    [new Error('boom'), 'generic', 'errors.generic', false],
    ['not an error', 'generic', 'errors.generic', false],
  ])('%o is %s', (error, kind, key, retry) => {
    expect(errorKind(error)).toBe(kind);
    expect(errorMessageKey(error)).toBe(key);
    expect(canRetry(error)).toBe(retry);
  });
});
