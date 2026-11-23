import { useTranslation } from 'react-i18next';
import { useLang } from '../../app/useLang';
import { ErrorBlock } from '../../components/ui/ErrorBlock';
import { PAGE_COLUMN, SECTION_SPACING } from '../../components/ui/layout';
import { Loading } from '../../components/ui/Loading';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Skeleton } from '../../components/ui/Skeleton';
import { canRetry, errorMessageKey } from '../../lib/apiErrors';
import type { SkillGroup } from '../../services/types';
import { SECTION_IDS } from '../layout/sections';
import { useAboutContent } from './useAboutContent';

const TITLE_ID = 'about-title';

export function AboutSection() {
  const { t } = useTranslation();
  const { profile, skills, bio, groups, visible } = useAboutContent(useLang());

  if (!visible) return null;

  return (
    <section
      id={SECTION_IDS.about}
      aria-labelledby={TITLE_ID}
      className="w-full border-t border-border"
    >
      <div className={`${PAGE_COLUMN} ${SECTION_SPACING} flex flex-wrap gap-x-12 gap-y-8`}>
        <div className="flex-[1_1_200px]">
          <SectionHeading id={TITLE_ID}>{t('about.title')}</SectionHeading>
        </div>
        <div className="flex min-w-0 flex-[2_1_420px] flex-col gap-10">
          {profile.isPending ? (
            <Loading label={t('common.loading')}>
              <div className="flex max-w-[60ch] flex-col gap-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            </Loading>
          ) : (
            bio.length > 0 && (
              <div className="flex max-w-[60ch] flex-col gap-4">
                {bio.map((paragraph, index) => (
                  // The first paragraph leads in the strong color; the rest step back.
                  <p
                    key={index}
                    className={`m-0 text-lg leading-[1.6] text-pretty ${index === 0 ? '' : 'text-muted'}`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )
          )}

          {skills.isPending ? (
            <Loading label={t('common.loading')}>
              <SkillRowsSkeleton />
            </Loading>
          ) : skills.isError ? (
            <ErrorBlock
              message={t(errorMessageKey(skills.error))}
              retryLabel={t('errors.retry')}
              onRetry={canRetry(skills.error) ? () => void skills.refetch() : undefined}
            />
          ) : (
            groups.length > 0 && <SkillList groups={groups} />
          )}
        </div>
      </div>
    </section>
  );
}

function SkillList({ groups }: { groups: SkillGroup[] }) {
  const { t } = useTranslation();
  return (
    <dl className="m-0 flex flex-col">
      {groups.map((group) => (
        <div
          key={group.group}
          className="flex flex-wrap gap-x-6 gap-y-3 border-t border-border py-5 last:border-b"
        >
          <dt className="m-0 flex-[0_0_140px] font-mono text-xs leading-[1.7] tracking-[0.08em] text-muted uppercase">
            {t(`skills.groups.${group.group}`)}
          </dt>
          <dd className="m-0 flex-[1_1_240px] text-base leading-[1.7]">
            {group.technologies.map((technology) => technology.name).join(' · ')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SkillRowsSkeleton() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex flex-wrap gap-x-6 gap-y-3 border-t border-border py-5 last:border-b"
        >
          <Skeleton className="h-4 flex-[0_0_140px]" />
          <Skeleton className="h-4 flex-[1_1_240px]" />
        </div>
      ))}
    </div>
  );
}
