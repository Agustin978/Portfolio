import { AppError } from '../../shared/errors/AppError.js';
import { localized, type Lang } from '../../shared/http/lang.js';
import type { CategoriesRepository, CategoryInput } from './categories.repository.js';

type AdminRow = NonNullable<Awaited<ReturnType<CategoriesRepository['findById']>>>;

const toAdminCategory = ({ _count, ...row }: AdminRow) => ({
  ...row,
  projectsCount: _count.projects,
});

export const createCategoriesService = (repository: CategoriesRepository) => ({
  async listPublic(lang: Lang) {
    const rows = await repository.findWithPublishedProjects();
    return rows.map((row) => ({
      slug: row.slug,
      name: localized(lang, row.nameEs, row.nameEn),
    }));
  },

  async list() {
    return (await repository.findAll()).map(toAdminCategory);
  },

  async get(id: number) {
    const row = await repository.findById(id);
    if (!row) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    return toAdminCategory(row);
  },

  async create(input: CategoryInput) {
    return toAdminCategory(await repository.create(input));
  },

  async update(id: number, input: Partial<CategoryInput>) {
    return toAdminCategory(await repository.update(id, input));
  },

  async remove(id: number) {
    await repository.remove(id);
  },
});

export type CategoriesService = ReturnType<typeof createCategoriesService>;
