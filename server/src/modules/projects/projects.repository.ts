import type { PrismaClient } from '../../shared/db/prisma.js';

// Public reads must never expose deactivated rows, so the filter lives here in one place
// instead of being repeated by every caller.
const ACTIVE = { deactivatedAt: null } as const;

export const createProjectsRepository = (db: PrismaClient) => ({
  findPublished: () =>
    db.project.findMany({
      where: { ...ACTIVE, status: 'published' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),

  findPublishedBySlug: (slug: string) =>
    db.project.findFirst({ where: { ...ACTIVE, slug, status: 'published' } }),

  // Admin listing: active only by default; deactivated rows are opt-in.
  findAll: ({ includeDeactivated = false }: { includeDeactivated?: boolean } = {}) =>
    db.project.findMany({
      where: includeDeactivated ? {} : ACTIVE,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),

  // Unfiltered on purpose: reactivating needs to find a deactivated row.
  findById: (id: number) => db.project.findUnique({ where: { id } }),

  setDeactivatedAt: (id: number, deactivatedAt: Date | null) =>
    db.project.update({ where: { id }, data: { deactivatedAt } }),
});

export type ProjectsRepository = ReturnType<typeof createProjectsRepository>;
