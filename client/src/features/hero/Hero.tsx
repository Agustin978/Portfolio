import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLang } from '../../app/useLang';
import { ErrorBlock } from '../../components/ui/ErrorBlock';
import { PAGE_COLUMN } from '../../components/ui/layout';
import { Loading } from '../../components/ui/Loading';
import { PillLink, pillClassName } from '../../components/ui/PillLink';
import { Skeleton } from '../../components/ui/Skeleton';
import { useProfile } from '../../hooks/queries';
import { canRetry, errorMessageKey } from '../../lib/apiErrors';
import { safeUrl } from '../../lib/safeUrl';
import type { Profile } from '../../services/types';
import { SECTION_IDS, useSectionLink } from '../layout/sections';

const TITLE_ID = 'hero-title';

const titleClass =
  'm-0 max-w-[16em] text-[clamp(36px,7vw,72px)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance';

export function Hero() {
  const { t } = useTranslation();
  const profile = useProfile(useLang());

  return (
    <section
      aria-labelledby={TITLE_ID}
      className={`${PAGE_COLUMN} flex flex-col items-start gap-6 py-[clamp(56px,10vw,120px)]`}
    >
      {profile.data ? (
        <HeroContent profile={profile.data} />
      ) : (
        <>
          {/* The page keeps its single h1 while the profile loads or fails. */}
          <h1 id={TITLE_ID} className="sr-only">
            {t('meta.title')}
          </h1>
          {profile.isError ? (
            <ErrorBlock
              message={t(errorMessageKey(profile.error))}
              retryLabel={t('errors.retry')}
              onRetry={canRetry(profile.error) ? () => void profile.refetch() : undefined}
            />
          ) : (
            <HeroSkeleton label={t('common.loading')} />
          )}
        </>
      )}
    </section>
  );
}

function HeroContent({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const sectionLink = useSectionLink();
  const eyebrow = [profile.role, profile.location].filter(Boolean).join(' · ');
  const cvUrl = safeUrl(profile.cvUrl);

  return (
    <>
      {eyebrow && (
        <p className="m-0 inline-flex items-center gap-2.5 font-mono text-[13px] tracking-[0.08em] text-muted uppercase">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
          {eyebrow}
        </p>
      )}
      {/* Without a headline the name takes its place: the page still needs its h1. */}
      <h1 id={TITLE_ID} className={titleClass}>
        {profile.headline ?? profile.fullName}
      </h1>
      {profile.intro && (
        <p className="m-0 max-w-[56ch] text-[clamp(17px,2vw,20px)] leading-[1.55] text-pretty text-muted">
          {profile.intro}
        </p>
      )}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link to={sectionLink(SECTION_IDS.projects)} className={pillClassName('primary')}>
          {t('hero.projects')}
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3v10M4 9l4 4 4-4" />
          </svg>
        </Link>
        <Link to={sectionLink(SECTION_IDS.contact)} className={pillClassName('secondary')}>
          {t('hero.contact')}
        </Link>
        {cvUrl && (
          <PillLink href={cvUrl} variant="secondary" newTabLabel={t('common.newTab')}>
            {t('hero.cv')}
          </PillLink>
        )}
      </div>
    </>
  );
}

function HeroSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label}>
      <div className="flex w-full flex-col items-start gap-6">
        <Skeleton className="h-4 w-56" />
        <div className="flex w-full max-w-[16em] flex-col gap-3 text-[clamp(36px,7vw,72px)]">
          <Skeleton className="h-[0.9em] w-full" />
          <Skeleton className="h-[0.9em] w-2/3" />
        </div>
        <div className="flex w-full max-w-[56ch] flex-col gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
        <div className="flex gap-3 pt-2">
          <Skeleton shape="pill" className="h-12 w-40" />
          <Skeleton shape="pill" className="h-12 w-32" />
        </div>
      </div>
    </Loading>
  );
}
