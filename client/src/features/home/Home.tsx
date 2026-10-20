import { useTranslation } from 'react-i18next';

// Provisional page: presentational only, no data fetching.
export function Home() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-page px-6 py-24">
      <h1 className="text-4xl font-semibold">{t('home.title')}</h1>
      <p className="mt-4 text-muted">{t('home.subtitle')}</p>
    </main>
  );
}
