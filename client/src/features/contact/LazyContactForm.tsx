import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Loading } from '../../components/ui/Loading';
import { pillClassName } from '../../components/ui/PillLink';
import { Skeleton } from '../../components/ui/Skeleton';

interface FormProps {
  mailto: string | null;
  email?: string;
}

// The form brings react-hook-form and zod (about 120 kB): loaded on its own, it keeps them out of
// the first load of the page. If the chunk cannot be fetched (the connection dropped), the panel
// says so instead of breaking the page.
const ContactForm = lazy(() =>
  import('./ContactForm').then(
    (module) => ({ default: module.ContactForm }),
    () => ({ default: FormUnavailable }),
  ),
);

export function LazyContactForm(props: FormProps) {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <Loading label={t('common.loading')}>
          <FormSkeleton />
        </Loading>
      }
    >
      <ContactForm {...props} />
    </Suspense>
  );
}

// Same shape as the form: three labelled fields and the row with the counter and the button.
function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {['h-12', 'h-12', 'h-40'].map((height, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton tone="dark" className="h-4 w-20" />
          <Skeleton tone="dark" shape="card" className={height} />
        </div>
      ))}
      <div className="flex items-center justify-between gap-4">
        <Skeleton tone="dark" className="h-4 w-16" />
        <Skeleton tone="dark" shape="pill" className="h-12 w-40" />
      </div>
    </div>
  );
}

function FormUnavailable({ mailto, email }: FormProps) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-card border border-border-field p-5"
    >
      <p className="m-0 text-base leading-[1.6] text-bg">{t('errors.network')}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className={`${pillClassName('ghost')} min-h-11`}
      >
        {t('errors.retry')}
      </button>
      {mailto && email && (
        <p className="m-0 text-base leading-[1.6] text-border-strong">
          {t('form.fallback')}{' '}
          <a
            href={mailto}
            className="-my-2.5 inline-block py-2.5 font-medium text-bg underline decoration-border-field underline-offset-4 hover:decoration-bg"
          >
            {email}
          </a>
        </p>
      )}
    </div>
  );
}
