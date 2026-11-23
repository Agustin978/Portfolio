import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useLang } from '../../app/useLang';
import { Chip } from '../../components/ui/Chip';
import { DateRangeText } from '../../components/ui/DateRangeText';
import { ErrorBlock } from '../../components/ui/ErrorBlock';
import { PAGE_COLUMN } from '../../components/ui/layout';
import { Loading } from '../../components/ui/Loading';
import { PillLink } from '../../components/ui/PillLink';
import { Skeleton } from '../../components/ui/Skeleton';
import { useProject } from '../../hooks/queries';
import { canRetry, errorKind, errorMessageKey } from '../../lib/apiErrors';
import { dateRange } from '../../lib/dates';
import { toParagraphs } from '../../lib/paragraphs';
import { safeUrl } from '../../lib/safeUrl';
import type { ProjectDetail as Project } from '../../services/types';
import { NotFound } from '../errors/NotFound';
import { PageTitle } from '../layout/PageTitle';
import { useBackToList } from '../projects/backToList';
import { Gallery } from './Gallery';

const TITLE_ID = 'project-title';

export function ProjectDetail() {
  const { t } = useTranslation();
  const lang = useLang();
  const { slug = '' } = useParams();
  const project = useProject(slug, lang);

  // A draft, a deactivated project and a mistyped slug all answer 404 PROJECT_NOT_FOUND.
  if (project.isError && errorKind(project.error) === 'notFound') {
    return <NotFound message={t('notFound.project')} />;
  }

  return (
    <article
      aria-labelledby={TITLE_ID}
      className={`${PAGE_COLUMN} flex flex-col gap-10 pt-6 pb-[clamp(56px,10vw,104px)]`}
    >
      <PageTitle page={project.data?.title} />
      <BackLink />

      {project.isPending ? (
        <>
          {/* The page keeps its single h1 while the project loads or fails. */}
          <h1 id={TITLE_ID} className="sr-only">
            {t('projects.title')}
          </h1>
          <Loading label={t('common.loading')}>
            <DetailSkeleton />
          </Loading>
        </>
      ) : project.isError ? (
        <>
          <h1 id={TITLE_ID} className="sr-only">
            {t('projects.title')}
          </h1>
          <ErrorBlock
            message={t(errorMessageKey(project.error))}
            retryLabel={t('errors.retry')}
            onRetry={canRetry(project.error) ? () => void project.refetch() : undefined}
          />
        </>
      ) : (
        <ProjectBody project={project.data} />
      )}
    </article>
  );
}

function BackLink() {
  const { t } = useTranslation();
  const back = useBackToList();
  return (
    <Link
      to={back.to}
      onClick={back.onClick}
      className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start px-1 text-[15px] text-muted no-underline transition-colors hover:text-fg"
    >
      <span aria-hidden="true">←</span>
      {t('projectDetail.back')}
    </Link>
  );
}

function ProjectBody({ project }: { project: Project }) {
  const { t } = useTranslation();
  const lang = useLang();
  const range = dateRange(project.startedAt, project.endedAt, lang);
  const liveUrl = safeUrl(project.liveUrl);
  const repoUrl = safeUrl(project.repoUrl);
  const paragraphs = toParagraphs(project.description);
  // The API lists the cover among the images; the list view's cover is a fallback if it ever
  // came empty.
  const images = project.images.length > 0 ? project.images : project.cover ? [project.cover] : [];

  return (
    <>
      <header className="flex flex-col gap-4">
        <p className="m-0 font-mono text-xs tracking-[0.08em] text-accent uppercase">
          {project.category.name}
        </p>
        <h1
          id={TITLE_ID}
          className="m-0 max-w-[22ch] text-[clamp(28px,4vw,40px)] leading-[1.1] font-semibold tracking-[-0.03em] text-balance"
        >
          {project.title}
        </h1>
        <p className="m-0 max-w-[60ch] text-lg leading-[1.55] text-pretty text-muted">
          {project.summary}
        </p>
        {(range || liveUrl || repoUrl) && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 pt-2">
            {range && (
              <DateRangeText
                range={range}
                presentLabel={t('experience.present')}
                className="text-muted"
              />
            )}
            {(liveUrl || repoUrl) && (
              <div className="flex flex-wrap gap-3">
                {liveUrl && (
                  <PillLink href={liveUrl} variant="primary" newTabLabel={t('common.newTab')}>
                    {t('projectDetail.live')}
                    <ExternalArrow />
                  </PillLink>
                )}
                {repoUrl && (
                  <PillLink href={repoUrl} variant="secondary" newTabLabel={t('common.newTab')}>
                    {t('projectDetail.repo')}
                    <ExternalArrow />
                  </PillLink>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {images.length > 0 && <Gallery images={images} title={project.title} />}

      {(paragraphs.length > 0 || project.technologies.length > 0) && (
        <div className="flex max-w-[68ch] flex-col gap-8">
          {paragraphs.length > 0 && (
            <div className="flex flex-col gap-4">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="m-0 text-lg leading-[1.65] text-pretty">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
          {project.technologies.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-6">
              <p id="project-technologies" className="m-0 text-[15px] font-medium text-muted">
                {t('projectDetail.technologies')}
              </p>
              <ul
                aria-labelledby="project-technologies"
                className="m-0 flex list-none flex-wrap gap-2 p-0"
              >
                {project.technologies.map((technology) => (
                  <li key={technology.slug}>
                    <Chip>{technology.name}</Chip>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ExternalArrow() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 11 11 5M6 5h5v5" />
    </svg>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-3/5" />
        <Skeleton className="h-5 w-4/5 max-w-[60ch]" />
        <div className="flex gap-3 pt-2">
          <Skeleton shape="pill" className="h-12 w-32" />
          <Skeleton shape="pill" className="h-12 w-32" />
        </div>
      </div>
      <Skeleton shape="card" className="aspect-video w-full" />
      <div className="flex max-w-[68ch] flex-col gap-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/5" />
      </div>
    </div>
  );
}
