import { AppError } from '../../shared/errors/AppError.js';
import { toDateOnly } from '../../shared/http/dates.js';
import { localized, type Lang } from '../../shared/http/lang.js';
import { assertDateRange, assertPublishable } from '../../shared/validation/publishable.js';
import type {
  ProjectFields,
  ProjectUpdateData,
  ProjectsRepository,
} from './projects.repository.js';
import type { CreateProjectInput, UpdateProjectInput } from './projects.schemas.js';

type DetailRow = NonNullable<Awaited<ReturnType<ProjectsRepository['findById']>>>;
type PublicListRow = Awaited<ReturnType<ProjectsRepository['findPublished']>>[number];
type PublicDetailRow = NonNullable<Awaited<ReturnType<ProjectsRepository['findPublishedBySlug']>>>;

const REQUIRED_WHEN_PUBLISHED = [
  'titleEs',
  'titleEn',
  'summaryEs',
  'summaryEn',
  'descriptionEs',
  'descriptionEn',
] as const;

const notFound = () => new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');

const toAdminDetail = ({ technologies, startedAt, endedAt, ...row }: DetailRow) => ({
  ...row,
  startedAt: toDateOnly(startedAt),
  endedAt: toDateOnly(endedAt),
  technologyIds: technologies.map((t) => t.technologyId),
});

const toPublicListItem = (row: PublicListRow, lang: Lang) => ({
  slug: row.slug,
  title: localized(lang, row.titleEs, row.titleEn),
  summary: localized(lang, row.summaryEs, row.summaryEn),
  repoUrl: row.repoUrl,
  liveUrl: row.liveUrl,
  startedAt: toDateOnly(row.startedAt),
  endedAt: toDateOnly(row.endedAt),
  isFeatured: row.isFeatured,
  category: {
    slug: row.category.slug,
    name: localized(lang, row.category.nameEs, row.category.nameEn),
  },
  technologies: row.technologies.map(({ technology }) => ({
    slug: technology.slug,
    name: technology.name,
  })),
});

const toPublicDetail = (row: PublicDetailRow, lang: Lang) => ({
  ...toPublicListItem(row, lang),
  description: localized(lang, row.descriptionEs, row.descriptionEn),
});

// The resulting state, not just the patch, must be valid: a patch that empties a field of an
// already-published project is rejected the same way as publishing an incomplete draft.
const assertValidState = (fields: ProjectFields) => {
  assertDateRange(fields.startedAt, fields.endedAt, 'endedAt');
  if (fields.status === 'published') assertPublishable(fields, REQUIRED_WHEN_PUBLISHED);
};

// There is deliberately no delete: projects are only deactivated, so slugs and history survive.
export const createProjectsService = (repository: ProjectsRepository) => ({
  async listPublic(lang: Lang, categorySlug?: string) {
    const rows = await repository.findPublished(categorySlug);
    return rows.map((row) => toPublicListItem(row, lang));
  },

  async getPublic(slug: string, lang: Lang) {
    const row = await repository.findPublishedBySlug(slug);
    if (!row) throw notFound();
    return toPublicDetail(row, lang);
  },

  async list(options: { includeDeactivated?: boolean } = {}) {
    return repository.findAll(options);
  },

  async get(id: number) {
    const row = await repository.findById(id);
    if (!row) throw notFound();
    return toAdminDetail(row);
  },

  async create(input: CreateProjectInput) {
    const { technologyIds = [], ...given } = input;
    const fields: ProjectFields = {
      slug: given.slug,
      categoryId: given.categoryId,
      titleEs: given.titleEs ?? null,
      titleEn: given.titleEn ?? null,
      summaryEs: given.summaryEs ?? null,
      summaryEn: given.summaryEn ?? null,
      descriptionEs: given.descriptionEs ?? null,
      descriptionEn: given.descriptionEn ?? null,
      repoUrl: given.repoUrl ?? null,
      liveUrl: given.liveUrl ?? null,
      startedAt: given.startedAt ?? null,
      endedAt: given.endedAt ?? null,
      status: given.status ?? 'draft',
      isFeatured: given.isFeatured ?? false,
      sortOrder: given.sortOrder ?? 0,
    };
    assertValidState(fields);

    const publishedAt = fields.status === 'published' ? new Date() : null;
    return toAdminDetail(await repository.create({ ...fields, publishedAt }, technologyIds));
  },

  async update(id: number, input: UpdateProjectInput) {
    const current = await repository.findById(id);
    if (!current) throw notFound();

    const { technologyIds, ...changes } = input;

    // After the first publication the slug is a public URL, so it stops being editable.
    if (changes.slug !== undefined && changes.slug !== current.slug && current.publishedAt) {
      throw new AppError(
        409,
        'SLUG_LOCKED',
        'The slug cannot change once the project was published',
      );
    }

    assertValidState({ ...current, ...changes });

    // deactivatedAt is never part of an edit: editing must not bring a project back to life.
    const data: ProjectUpdateData = { ...changes };
    if (changes.status === 'published' && !current.publishedAt) data.publishedAt = new Date();

    return toAdminDetail(await repository.update(id, data, technologyIds));
  },

  async deactivate(id: number) {
    const project = await repository.findById(id);
    if (!project) throw notFound();
    if (project.deactivatedAt) {
      throw new AppError(409, 'PROJECT_ALREADY_DEACTIVATED', 'Project is already deactivated');
    }
    return toAdminDetail(await repository.setDeactivatedAt(id, new Date()));
  },

  async reactivate(id: number) {
    const project = await repository.findById(id);
    if (!project) throw notFound();
    if (!project.deactivatedAt) {
      throw new AppError(409, 'PROJECT_NOT_DEACTIVATED', 'Project is not deactivated');
    }
    return toAdminDetail(await repository.setDeactivatedAt(id, null));
  },
});

export type ProjectsService = ReturnType<typeof createProjectsService>;
