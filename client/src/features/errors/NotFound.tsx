import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLang } from '../../app/useLang';
import { PAGE_COLUMN } from '../../components/ui/layout';
import { pillClassName } from '../../components/ui/PillLink';
import { PageTitle } from '../layout/PageTitle';

// Also meant for a project that does not exist (PROJECT_NOT_FOUND), with its own message.
export function NotFound({ message }: { message?: string }) {
  const { t } = useTranslation();
  const lang = useLang();

  return (
    <section
      aria-labelledby="not-found-title"
      className={`${PAGE_COLUMN} flex flex-col items-start gap-6 py-[clamp(56px,10vw,120px)]`}
    >
      <PageTitle page={t('notFound.title')} />
      <h1
        id="not-found-title"
        className="m-0 text-[clamp(32px,5vw,48px)] leading-[1.1] font-semibold tracking-[-0.03em]"
      >
        {t('notFound.title')}
      </h1>
      <p className="m-0 max-w-[56ch] text-lg leading-[1.55] text-muted">
        {message ?? t('notFound.body')}
      </p>
      <Link to={`/${lang}`} className={pillClassName('primary')}>
        {t('notFound.home')}
      </Link>
    </section>
  );
}
