import { AppError } from '../../shared/errors/AppError.js';
import { guarded } from '../../shared/db/guarded.js';
import type { PrismaClient } from '../../shared/db/prisma.js';

// Explicit allow-lists: a column added to the table later is never exposed by accident.
const publicSelect = { slug: true, nameEs: true, nameEn: true } as const;
const adminSelect = {
  id: true,
  slug: true,
  nameEs: true,
  nameEn: true,
  sortOrder: true,
  _count: { select: { projects: true } },
} as const;

const ORDER = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

export type CategoryInput = {
  slug: string;
  nameEs: string;
  nameEn: string;
  sortOrder: number;
};

const slugTaken = () =>
  new AppError(409, 'SLUG_TAKEN', 'A category with this slug already exists', {
    slug: ['already in use'],
  });
const notFound = () => new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');

export const createCategoriesRepository = (db: PrismaClient) => ({
  // Only categories that would show at least one project: an empty filter chip is noise.
  findWithPublishedProjects: () =>
    db.projectCategory.findMany({
      where: { projects: { some: { status: 'published', deactivatedAt: null } } },
      select: publicSelect,
      orderBy: [...ORDER],
    }),

  findAll: () => db.projectCategory.findMany({ select: adminSelect, orderBy: [...ORDER] }),

  findById: (id: number) => db.projectCategory.findUnique({ where: { id }, select: adminSelect }),

  create: (data: CategoryInput) =>
    guarded(() => db.projectCategory.create({ data, select: adminSelect }), {
      P2002: slugTaken,
    }),

  update: (id: number, data: Partial<CategoryInput>) =>
    guarded(() => db.projectCategory.update({ where: { id }, data, select: adminSelect }), {
      P2002: slugTaken,
      P2025: notFound,
    }),

  // Deactivated projects still count: they keep their category, so removing it would orphan them.
  // The count is only fetched after the database refused the delete, to word the message.
  remove: (id: number) =>
    guarded(() => db.projectCategory.delete({ where: { id }, select: { id: true } }), {
      P2003: async () => {
        const projects = await db.project.count({ where: { categoryId: id } });
        return new AppError(409, 'CATEGORY_IN_USE', 'Category is used by projects', { projects });
      },
      P2025: notFound,
    }),
});

export type CategoriesRepository = ReturnType<typeof createCategoriesRepository>;
