import { ApiError, CLIENT_ERROR_CODES } from '../services/apiClient';

export type ErrorKind =
  'network' | 'timeout' | 'invalid' | 'notFound' | 'rateLimited' | 'server' | 'generic';

// The server's message is in English and is never shown; only the kind decides the text.
export function errorKind(error: unknown): ErrorKind {
  if (!(error instanceof ApiError)) return 'generic';
  if (error.code === CLIENT_ERROR_CODES.network) return 'network';
  if (error.code === CLIENT_ERROR_CODES.timeout) return 'timeout';
  if (error.code === CLIENT_ERROR_CODES.invalidResponse || error.status >= 500) return 'server';
  if (error.status === 400) return 'invalid';
  if (error.status === 404) return 'notFound';
  if (error.status === 429) return 'rateLimited';
  // 403 FORBIDDEN_ORIGIN and the rest are configuration problems the visitor cannot fix.
  return 'generic';
}

export const ERROR_MESSAGE_KEYS: Record<ErrorKind, string> = {
  network: 'errors.network',
  timeout: 'errors.timeout',
  invalid: 'errors.invalid',
  notFound: 'notFound.body',
  rateLimited: 'form.errors.rateLimited',
  server: 'errors.server',
  generic: 'errors.generic',
};

export const errorMessageKey = (error: unknown) => ERROR_MESSAGE_KEYS[errorKind(error)];

// Whether "Reintentar" makes sense: trying again can fix these, not a 404 or a bad request.
export const canRetry = (error: unknown) =>
  ['network', 'timeout', 'server'].includes(errorKind(error));
