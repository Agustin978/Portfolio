import { useIsFetching } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Render's free instance sleeps; the first request can take up to a minute to wake it.
export const SLOW_NOTICE_DELAY_MS = 4000;

// One notice for the whole page: shown when anything is still loading after 4 s, gone when all
// requests settle. The skeletons stay; after 60 s each section falls back to its own error.
export function SlowResponseNotice() {
  const { t } = useTranslation();
  const busy = useIsFetching() > 0;
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setWaited(true), SLOW_NOTICE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setWaited(false);
    };
  }, [busy]);

  // The live region is always in the page, so screen readers announce the text when it appears.
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-10 flex justify-center px-4"
    >
      {busy && waited && (
        <p className="m-0 max-w-md rounded-2xl bg-fg px-5 py-3 text-center text-sm leading-normal text-bg shadow-lg">
          {t('notice.slow')}
        </p>
      )}
    </div>
  );
}
