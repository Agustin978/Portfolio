import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { useLang } from '../../app/useLang';
import { SUPPORTED_LANGUAGES } from '../../i18n/languages';

// Links, not buttons: each language is a real URL. They keep the rest of the path, the query
// and the hash, and leave the scroll where it is.
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const lang = useLang();
  const { pathname, search, hash } = useLocation();
  const rest = pathname.replace(/^\/[^/]+/, '');

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="inline-flex rounded-pill border border-border-strong"
    >
      {SUPPORTED_LANGUAGES.map((option) => {
        const active = option === lang;
        // "ES" alone reads as a word; the name says which language it is. Each name is written in
        // its own language (lang below) and still starts with the visible code, so voice control
        // users can say what they see.
        const name = t(`language.names.${option}`);
        return (
          <Link
            key={option}
            to={`/${option}${rest}${search}${hash}`}
            preventScrollReset
            aria-label={name}
            title={name}
            lang={option}
            hrefLang={option}
            aria-current={active ? 'true' : undefined}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill px-3 font-mono text-[13px] font-medium no-underline transition-colors ${
              active ? 'bg-fg text-bg' : 'text-muted hover:text-fg'
            }`}
          >
            {t(`language.${option}`)}
          </Link>
        );
      })}
    </div>
  );
}
