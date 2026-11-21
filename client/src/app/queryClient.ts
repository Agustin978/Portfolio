import { QueryClient } from '@tanstack/react-query';
import { isRetryable } from '../services/apiClient';

const MAX_RETRIES = 2;

// failureCount is 0 on the first failure, so this allows two retries.
export const shouldRetryQuery = (failureCount: number, error: unknown) =>
  failureCount < MAX_RETRIES && isRetryable(error);

// 1 s, then 2 s.
export const retryDelay = (failureCount: number) => 1000 * 2 ** failureCount;

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Public content changes rarely; a visit should not refetch it on every navigation.
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        retryDelay,
      },
      // A POST (the contact form) is never retried: it could send the message twice.
      mutations: { retry: false },
    },
  });
