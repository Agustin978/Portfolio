import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createQueryClient } from './queryClient';

const queryClient = createQueryClient();

// Tests pass their own client so cached data never leaks between them.
export function Providers({
  children,
  client = queryClient,
}: {
  children: ReactNode;
  client?: QueryClient;
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
