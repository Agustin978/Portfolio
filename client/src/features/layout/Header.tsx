import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLang } from '../../app/useLang';
import { PAGE_COLUMN } from '../../components/ui/layout';
import { Skeleton } from '../../components/ui/Skeleton';
import { useProfile } from '../../hooks/queries';
import { useAboutContent } from '../about/useAboutContent';
import { useExperienceContent } from '../experience/useExperienceContent';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SECTION_IDS, useSectionLink } from './sections';

export function Header() {
  const { t } = useTranslation();
  const lang = useLang();
  const profile = useProfile(lang);
  const about = useAboutContent(lang);
  const experience = useExperienceContent(lang);
  const sectionLink = useSectionLink();

  const links = [
    { id: SECTION_IDS.projects, label: t('nav.projects') },
    ...(about.visible ? [{ id: SECTION_IDS.about, label: t('nav.about') }] : []),
    ...(experience.visible ? [{ id: SECTION_IDS.experience, label: t('nav.experience') }] : []),
    { id: SECTION_IDS.contact, label: t('nav.contact') },
  ];

  // Without the name yet (or ever, if the profile fails) the link still has one.
  const homeLabel = t('nav.home', { name: profile.data?.fullName ?? t('meta.title') });

  return (
    <header
      className={`${PAGE_COLUMN} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4`}
    >
      <Link
        to={`/${lang}`}
        aria-label={homeLabel}
        title={homeLabel}
        className="inline-flex min-h-11 items-center gap-2.5 text-lg font-semibold tracking-[-0.01em] no-underline"
      >
        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-accent" />
        {profile.data
          ? profile.data.fullName
          : profile.isPending && <Skeleton className="h-5 w-24" />}
      </Link>

      {/* On a phone the menu drops to its own row under the name and the language switcher. */}
      <nav
        aria-label={t('nav.label')}
        className="order-last flex w-full flex-wrap gap-x-5 sm:order-none sm:ml-auto sm:w-auto sm:gap-x-7"
      >
        {links.map((link) => (
          <Link
            key={link.id}
            to={sectionLink(link.id)}
            className="inline-flex min-h-11 items-center border-b border-transparent text-[15px] text-muted no-underline transition-colors hover:border-fg hover:text-fg"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <LanguageSwitcher />
    </header>
  );
}
