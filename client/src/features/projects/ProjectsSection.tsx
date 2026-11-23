import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useLang } from '../../app/useLang';
import { EmptyBlock } from '../../components/ui/EmptyBlock';
import { ErrorBlock } from '../../components/ui/ErrorBlock';
import { PAGE_COLUMN, SECTION_SPACING } from '../../components/ui/layout';
import { Loading } from '../../components/ui/Loading';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCategories, useProjects } from '../../hooks/queries';
import { canRetry, errorMessageKey } from '../../lib/apiErrors';
import type { Category } from '../../services/types';
import { SECTION_IDS } from '../layout/sections';
import { ProjectCard, ProjectCardSkeleton } from './ProjectCard';

const TITLE_ID = 'projects-title';
export const CATEGORY_PARAM = 'category';

export function ProjectsSection() {
  const { t } = useTranslation();
  const lang = useLang();
  const projects = useProjects(lang);
  const categories = useCategories(lang);
  const [params, setParams] = useSearchParams();

  // One request for every project; the filter runs here and lives in the URL. A slug that is
  // unknown, or that no listed project uses, falls back to "All".
  const list = projects.data ?? [];
  const chips: Category[] = (categories.data ?? []).filter((category) =>
    list.some((project) => project.category.slug === category.slug),
  );
  const requested = params.get(CATEGORY_PARAM);
  const active = chips.some((category) => category.slug === requested) ? requested : null;
  const shown = active ? list.filter((project) => project.category.slug === active) : list;

  const pick = (slug: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (slug) next.set(CATEGORY_PARAM, slug);
        else next.delete(CATEGORY_PARAM);
        return next;
      },
      // Filtering is not a new page: no history entry, and the scroll stays put.
      { replace: true, preventScrollReset: true },
    );

  return (
    <section
      id={SECTION_IDS.projects}
      aria-labelledby={TITLE_ID}
      className="w-full border-t border-border"
    >
      <div className={`${PAGE_COLUMN} ${SECTION_SPACING} flex flex-col gap-8`}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <SectionHeading id={TITLE_ID}>{t('projects.title')}</SectionHeading>
          {/* A filter with a single category would filter nothing. */}
          {chips.length > 1 && (
            <div
              role="group"
              aria-label={t('projects.filterLabel')}
              className="flex flex-wrap gap-2"
            >
              <FilterChip label={t('projects.all')} pressed={!active} onClick={() => pick(null)} />
              {chips.map((category) => (
                <FilterChip
                  key={category.slug}
                  label={category.name}
                  pressed={active === category.slug}
                  onClick={() => pick(category.slug)}
                />
              ))}
            </div>
          )}
          {projects.isSuccess && list.length > 0 && categories.isPending && (
            <div aria-hidden="true" className="flex gap-2">
              <Skeleton shape="pill" className="h-11 w-20" />
              <Skeleton shape="pill" className="h-11 w-16" />
              <Skeleton shape="pill" className="h-11 w-16" />
            </div>
          )}
        </div>

        {projects.isPending ? (
          <Loading label={t('common.loading')}>
            <ProjectGrid>
              <ProjectCardSkeleton />
              <ProjectCardSkeleton />
            </ProjectGrid>
          </Loading>
        ) : projects.isError ? (
          <ErrorBlock
            message={t(errorMessageKey(projects.error))}
            retryLabel={t('errors.retry')}
            onRetry={canRetry(projects.error) ? () => void projects.refetch() : undefined}
          />
        ) : list.length === 0 ? (
          <EmptyBlock message={t('projects.empty')} />
        ) : (
          <ProjectGrid>
            {shown.map((project) => (
              <ProjectCard key={project.slug} project={project} lang={lang} />
            ))}
          </ProjectGrid>
        )}
      </div>
    </section>
  );
}

function ProjectGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
      {children}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  pressed: boolean;
  onClick: () => void;
}

function FilterChip({ label, pressed, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 cursor-pointer rounded-pill border px-[18px] text-[15px] font-medium transition-colors ${
        pressed
          ? 'border-fg bg-fg text-bg'
          : 'border-border-strong bg-surface text-fg hover:border-border-hover'
      }`}
    >
      {label}
    </button>
  );
}
