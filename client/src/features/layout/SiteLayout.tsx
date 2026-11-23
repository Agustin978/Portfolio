import { useTranslation } from 'react-i18next';
import { Outlet, ScrollRestoration } from 'react-router';
import { Footer } from './Footer';
import { Header } from './Header';
import { SECTION_IDS } from './sections';
import { SlowResponseNotice } from './SlowResponseNotice';

export function SiteLayout() {
  const { t } = useTranslation();

  return (
    <div id={SECTION_IDS.top} className="flex min-h-dvh flex-col">
      <a
        href={`#${SECTION_IDS.main}`}
        className="sr-only z-20 rounded-pill bg-fg px-5 py-3 text-bg focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        {t('nav.skip')}
      </a>
      <Header />
      {/* Focusable only by script (the skip link), so it never shows a focus ring of its own. */}
      <main id={SECTION_IDS.main} tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <SlowResponseNotice />
      {/* Restores the position when going back and scrolls to #hash targets on navigation. */}
      <ScrollRestoration />
    </div>
  );
}
