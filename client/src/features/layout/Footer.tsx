import { useTranslation } from 'react-i18next';
import { useLang } from '../../app/useLang';
import { PAGE_COLUMN } from '../../components/ui/layout';
import { useProfile } from '../../hooks/queries';
import { SECTION_IDS } from './sections';

export function Footer() {
  const { t } = useTranslation();
  const profile = useProfile(useLang()).data;
  const year = new Date().getFullYear();

  return (
    <footer
      className={`${PAGE_COLUMN} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border pt-6 pb-10`}
    >
      {profile && (
        <p className="m-0 font-mono text-[13px] text-muted">
          © {year} {profile.fullName}
          {profile.location && ` · ${profile.location}`}
        </p>
      )}
      <a
        href={`#${SECTION_IDS.top}`}
        className="inline-flex min-h-11 items-center gap-1.5 font-mono text-[13px] text-muted no-underline hover:text-fg sm:ml-auto"
      >
        {t('footer.top')}
        <span aria-hidden="true">↑</span>
      </a>
    </footer>
  );
}
