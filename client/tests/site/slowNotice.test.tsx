import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SLOW_NOTICE_DELAY_MS,
  SlowResponseNotice,
} from '../../src/features/layout/SlowResponseNotice';
import i18n from '../../src/i18n';

const NOTICE = 'El servidor está iniciando; puede tardar hasta un minuto.';

// A query whose answer the test releases by hand.
function setup() {
  let release: (value: string) => void = () => {};
  const pending = new Promise<string>((resolve) => {
    release = resolve;
  });
  function Loader() {
    useQuery({ queryKey: ['slow'], queryFn: () => pending });
    return null;
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Loader />
      <SlowResponseNotice />
    </QueryClientProvider>,
  );
  return { release: (value: string) => release(value) };
}

describe('slow server notice', () => {
  beforeEach(async () => {
    // jsdom's browser language is English; the text under test is the Spanish one.
    await i18n.changeLanguage('es');
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('appears after 4 s of loading and leaves when everything settles', async () => {
    const { release } = setup();
    const status = screen.getByRole('status');

    await act(() => vi.advanceTimersByTimeAsync(SLOW_NOTICE_DELAY_MS - 100));
    expect(status).toBeEmptyDOMElement();

    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(status).toHaveTextContent(NOTICE);

    await act(async () => {
      release('done');
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(status).toBeEmptyDOMElement();
  });

  it('is announced as a status and never takes the focus', async () => {
    const outside = document.body.appendChild(document.createElement('button'));
    outside.focus();
    setup();

    await act(() => vi.advanceTimersByTimeAsync(SLOW_NOTICE_DELAY_MS));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(NOTICE);
    expect(document.activeElement).toBe(outside);
    // Nothing inside can be reached with Tab either.
    expect(status.querySelectorAll('a, button, [tabindex]')).toHaveLength(0);
    outside.remove();
  });

  it('never shows up when the answer is quick', async () => {
    const { release } = setup();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    await act(async () => {
      release('done');
      await vi.advanceTimersByTimeAsync(SLOW_NOTICE_DELAY_MS);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
