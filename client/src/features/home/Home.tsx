import { useTranslation } from 'react-i18next';

// Provisional page until the sections land; the layout now owns <main>.
export function Home() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-page px-6 py-24">
      <h1 className="text-4xl font-semibold">{t('home.title')}</h1>
      <p className="mt-4 text-muted">{t('home.subtitle')}</p>
    </section>
  );
}
