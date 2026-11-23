import { useTranslation } from 'react-i18next';
import { useLang } from '../../app/useLang';
import { Chip } from '../../components/ui/Chip';
import { DateRangeText } from '../../components/ui/DateRangeText';
import { ErrorBlock } from '../../components/ui/ErrorBlock';
import { PAGE_COLUMN, SECTION_SPACING } from '../../components/ui/layout';
import { Loading } from '../../components/ui/Loading';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Language } from '../../i18n/languages';
import { canRetry, errorMessageKey } from '../../lib/apiErrors';
import { dateRange } from '../../lib/dates';
import { toParagraphs } from '../../lib/paragraphs';
import { safeUrl } from '../../lib/safeUrl';
import type { Experience } from '../../services/types';
import { SECTION_IDS } from '../layout/sections';
import { useExperienceContent } from './useExperienceContent';

const TITLE_ID = 'experience-title';

// Same two-column layout as "About me": heading on the left, entries as rows on the right.
export function ExperienceSection() {
  const { t } = useTranslation();
  const lang = useLang();
  const { experiences, visible } = useExperienceContent(lang);

  if (!visible) return null;

  return (
    <section
      id={SECTION_IDS.experience}
      aria-labelledby={TITLE_ID}
      className="w-full border-t border-border"
    >
      <div className={`${PAGE_COLUMN} ${SECTION_SPACING} flex flex-wrap gap-x-12 gap-y-8`}>
        <div className="flex-[1_1_200px]">
          <SectionHeading id={TITLE_ID}>{t('experience.title')}</SectionHeading>
        </div>
        <div className="min-w-0 flex-[2_1_420px]">
          {experiences.isPending ? (
            <Loading label={t('common.loading')}>
              <EntriesSkeleton />
            </Loading>
          ) : experiences.isError ? (
            <ErrorBlock
              message={t(errorMessageKey(experiences.error))}
              retryLabel={t('errors.retry')}
              onRetry={canRetry(experiences.error) ? () => void experiences.refetch() : undefined}
            />
          ) : (
            <ol className="m-0 flex list-none flex-col p-0">
              {experiences.data.map((entry) => (
                <ExperienceEntry key={entry.id} entry={entry} lang={lang} />
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function ExperienceEntry({ entry, lang }: { entry: Experience; lang: Language }) {
  const { t } = useTranslation();
  const range = dateRange(entry.startDate, entry.endDate, lang);
  const companyHref = safeUrl(entry.companyUrl);
  const paragraphs = toParagraphs(entry.description);

  return (
    <li className="flex flex-wrap gap-x-6 gap-y-3 border-t border-border py-7 last:border-b">
      <div className="flex-[0_0_140px] text-muted">
        {range && <DateRangeText range={range} presentLabel={t('experience.present')} />}
      </div>
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-3">
        <h3 className="m-0 text-[22px] leading-[1.2] font-semibold tracking-[-0.02em]">
          {entry.role}
        </h3>
        <p className="m-0 text-base leading-[1.6]">
          {companyHref ? (
            // The padding gives the inline link a 44 px tap area without moving the line.
            <a
              href={companyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="-my-2.5 inline-block py-2.5 font-medium underline decoration-border-hover underline-offset-4 transition-colors hover:decoration-fg"
            >
              {entry.company} <span className="sr-only">{t('common.newTab')}</span>
            </a>
          ) : (
            <span className="font-medium">{entry.company}</span>
          )}
          {entry.location && <span className="text-muted"> · {entry.location}</span>}
        </p>
        {paragraphs.length > 0 && (
          <div className="flex max-w-[60ch] flex-col gap-3">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="m-0 text-base leading-[1.6] text-pretty text-muted">
                {paragraph}
              </p>
            ))}
          </div>
        )}
        {entry.technologies.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 pt-1">
            {entry.technologies.map((technology) => (
              <li key={technology.slug}>
                <Chip>{technology.name}</Chip>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function EntriesSkeleton() {
  return (
    <div className="flex flex-col">
      {[0, 1].map((row) => (
        <div
          key={row}
          className="flex flex-wrap gap-x-6 gap-y-3 border-t border-border py-7 last:border-b"
        >
          <Skeleton className="h-4 flex-[0_0_140px]" />
          <div className="flex flex-[1_1_240px] flex-col gap-3">
            <Skeleton className="h-6 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
