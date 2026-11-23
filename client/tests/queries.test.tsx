import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Providers } from '../src/app/Providers';
import { createQueryClient } from '../src/app/queryClient';
import { useProjects, useSendContactMessage, useSkills } from '../src/hooks/queries';
import type { Language } from '../src/i18n/languages';
import { apiError, mockApi, ok } from './helpers/mockApi';

const wrapper = () => {
  const client = createQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <Providers client={client}>{children}</Providers>
  );
};

describe('query hooks', () => {
  it('fetch again when the language changes instead of reusing the other language', async () => {
    const api = mockApi()
      .on('GET /projects?lang=es', ok([{ slug: 'a', title: 'Proyecto' }]))
      .on('GET /projects?lang=en', ok([{ slug: 'a', title: 'Project' }]));

    const { result, rerender } = renderHook(({ lang }: { lang: Language }) => useProjects(lang), {
      wrapper: wrapper(),
      initialProps: { lang: 'es' },
    });
    await waitFor(() => expect(result.current.data?.[0]?.title).toBe('Proyecto'));

    rerender({ lang: 'en' });
    await waitFor(() => expect(result.current.data?.[0]?.title).toBe('Project'));

    expect(api.calls.map((call) => call.route)).toEqual([
      'GET /projects?lang=es',
      'GET /projects?lang=en',
    ]);
  });

  it('expose the ApiError of a failed query', async () => {
    mockApi().on('GET /skills', apiError(500, 'INTERNAL_ERROR'));

    const { result } = renderHook(() => useSkills(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
  });

  it('send the contact message once, even when the server fails', async () => {
    const api = mockApi().on('POST /contact', apiError(503, 'SERVICE_UNAVAILABLE'));

    const { result } = renderHook(() => useSendContactMessage(), { wrapper: wrapper() });
    result.current.mutate({
      name: 'Ana',
      email: 'ana@example.com',
      message: 'Hola, ¿hablamos?',
      lang: 'es',
      hp_check: '',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(api.fetch).toHaveBeenCalledTimes(1);
  });
});
