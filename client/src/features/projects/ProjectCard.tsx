import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Chip } from '../../components/ui/Chip';
import { ResponsiveImage } from '../../components/ui/ResponsiveImage';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Language } from '../../i18n/languages';
import type { ProjectSummary } from '../../services/types';
import { FROM_LIST } from './backToList';

// Two columns from 800 px (each about 460 px wide), one full-width column below.
const CARD_IMAGE_SIZES = '(min-width: 800px) 460px, calc(100vw - 40px)';

export function ProjectCard({ project, lang }: { project: ProjectSummary; lang: Language }) {
  const { t } = useTranslation();
  const { cover } = project;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-border-hover">
      {/* A published project always has a cover; if one ever lacks it, a plain block keeps the shape. */}
      <div
        className="aspect-video w-full border-b border-border bg-subtle"
        aria-hidden={cover ? undefined : 'true'}
      >
        {cover && (
          <ResponsiveImage
            image={cover}
            alt={cover.alt ?? project.title}
            sizes={CARD_IMAGE_SIZES}
          />
        )}
      </div>
      <div className="flex grow flex-col gap-3 p-6">
        <p className="m-0 font-mono text-xs tracking-[0.08em] text-accent uppercase">
          {project.category.name}
        </p>
        <h3 className="m-0 text-[22px] leading-[1.2] font-semibold tracking-[-0.02em]">
          {project.title}
        </h3>
        <p className="m-0 text-base leading-[1.55] text-pretty text-muted">{project.summary}</p>
        {project.technologies.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 pt-1">
            {project.technologies.map((technology) => (
              <li key={technology.slug}>
                <Chip>{technology.name}</Chip>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-2">
          {/* The link covers the whole card; its name says which project it opens. */}
          <Link
            to={`/${lang}/projects/${encodeURIComponent(project.slug)}`}
            state={FROM_LIST}
            aria-label={t('projects.detailFor', { title: project.title })}
            className="inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-accent no-underline after:absolute after:inset-0 after:content-['']"
          >
            {t('projects.detail')}
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
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-border bg-surface">
      <Skeleton shape="flat" className="aspect-video w-full" />
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
    </div>
  );
}
