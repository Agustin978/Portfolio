import type { PrismaClient } from '../../shared/db/prisma.js';

// Public reads must never expose deactivated rows, so the filter lives here in one place
// instead of being repeated by every caller.
const ACTIVE = { deactivatedAt: null } as const;

// Most recent first; current positions (end_date null) come before finished ones.
const NEWEST_FIRST = [
  { endDate: { sort: 'desc', nulls: 'first' } },
  { startDate: 'desc' },
  { id: 'asc' },
] as const;

export const createExperiencesRepository = (db: PrismaClient) => ({
  findPublished: () =>
    db.experience.findMany({
      where: { ...ACTIVE, status: 'published' },
      orderBy: [...NEWEST_FIRST],
    }),

  // Admin listing: active only by default; deactivated rows are opt-in.
  findAll: ({ includeDeactivated = false }: { includeDeactivated?: boolean } = {}) =>
    db.experience.findMany({
      where: includeDeactivated ? {} : ACTIVE,
      orderBy: [...NEWEST_FIRST],
    }),

  // Unfiltered on purpose: reactivating needs to find a deactivated row.
  findById: (id: number) => db.experience.findUnique({ where: { id } }),

  setDeactivatedAt: (id: number, deactivatedAt: Date | null) =>
    db.experience.update({ where: { id }, data: { deactivatedAt } }),
});

export type ExperiencesRepository = ReturnType<typeof createExperiencesRepository>;
