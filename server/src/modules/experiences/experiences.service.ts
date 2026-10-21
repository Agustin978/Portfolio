import { AppError } from '../../shared/errors/AppError.js';
import { toDateOnly } from '../../shared/http/dates.js';
import { localized, type Lang } from '../../shared/http/lang.js';
import { assertDateRange, assertPublishable } from '../../shared/validation/publishable.js';
import type {
  ExperienceFields,
  ExperienceUpdateData,
  ExperiencesRepository,
} from './experiences.repository.js';
import type { CreateExperienceInput, UpdateExperienceInput } from './experiences.schemas.js';

type DetailRow = NonNullable<Awaited<ReturnType<ExperiencesRepository['findById']>>>;
type PublicRow = Awaited<ReturnType<ExperiencesRepository['findPublished']>>[number];

const REQUIRED_WHEN_PUBLISHED = ['roleEs', 'roleEn', 'descriptionEs', 'descriptionEn'] as const;

const notFound = () => new AppError(404, 'EXPERIENCE_NOT_FOUND', 'Experience not found');

const toAdminDetail = ({ technologies, startDate, endDate, ...row }: DetailRow) => ({
  ...row,
  startDate: toDateOnly(startDate),
  endDate: toDateOnly(endDate),
  technologyIds: technologies.map((t) => t.technologyId),
});

const toPublicItem = (row: PublicRow, lang: Lang) => ({
  id: row.id,
  company: row.company,
  companyUrl: row.companyUrl,
  location: row.location,
  role: localized(lang, row.roleEs, row.roleEn),
  description: localized(lang, row.descriptionEs, row.descriptionEn),
  startDate: toDateOnly(row.startDate),
  endDate: toDateOnly(row.endDate),
  technologies: row.technologies.map(({ technology }) => ({
    slug: technology.slug,
    name: technology.name,
  })),
});

// The resulting state, not just the patch, must be valid: a patch that empties a field of an
// already-published experience is rejected the same way as publishing an incomplete draft.
const assertValidState = (fields: ExperienceFields) => {
  assertDateRange(fields.startDate, fields.endDate, 'endDate');
  if (fields.status === 'published') assertPublishable(fields, REQUIRED_WHEN_PUBLISHED);
};

// There is deliberately no delete: experiences are only deactivated.
export const createExperiencesService = (repository: ExperiencesRepository) => ({
  async listPublic(lang: Lang) {
    const rows = await repository.findPublished();
    return rows.map((row) => toPublicItem(row, lang));
  },

  async list(options: { includeDeactivated?: boolean } = {}) {
    return repository.findAll(options);
  },

  async get(id: number) {
    const row = await repository.findById(id);
    if (!row) throw notFound();
    return toAdminDetail(row);
  },

  async create(input: CreateExperienceInput) {
    const { technologyIds = [], ...given } = input;
    const fields: ExperienceFields = {
      company: given.company,
      companyUrl: given.companyUrl ?? null,
      location: given.location ?? null,
      roleEs: given.roleEs ?? null,
      roleEn: given.roleEn ?? null,
      descriptionEs: given.descriptionEs ?? null,
      descriptionEn: given.descriptionEn ?? null,
      startDate: given.startDate,
      endDate: given.endDate ?? null,
      status: given.status ?? 'draft',
      sortOrder: given.sortOrder ?? 0,
    };
    assertValidState(fields);

    return toAdminDetail(await repository.create(fields, technologyIds));
  },

  async update(id: number, input: UpdateExperienceInput) {
    const current = await repository.findById(id);
    if (!current) throw notFound();

    const { technologyIds, ...changes } = input;
    assertValidState({ ...current, ...changes });

    // deactivatedAt is never part of an edit: editing must not bring an experience back to life.
    const data: ExperienceUpdateData = { ...changes };
    return toAdminDetail(await repository.update(id, data, technologyIds));
  },

  async deactivate(id: number) {
    const experience = await repository.findById(id);
    if (!experience) throw notFound();
    if (experience.deactivatedAt) {
      throw new AppError(
        409,
        'EXPERIENCE_ALREADY_DEACTIVATED',
        'Experience is already deactivated',
      );
    }
    return toAdminDetail(await repository.setDeactivatedAt(id, new Date()));
  },

  async reactivate(id: number) {
    const experience = await repository.findById(id);
    if (!experience) throw notFound();
    if (!experience.deactivatedAt) {
      throw new AppError(409, 'EXPERIENCE_NOT_DEACTIVATED', 'Experience is not deactivated');
    }
    return toAdminDetail(await repository.setDeactivatedAt(id, null));
  },
});

export type ExperiencesService = ReturnType<typeof createExperiencesService>;
