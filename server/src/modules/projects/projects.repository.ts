import type { Prisma } from '../../generated/prisma/client.js';
import { guarded } from '../../shared/db/guarded.js';
import type { PrismaClient } from '../../shared/db/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { invalidReference } from '../../shared/validation/publishable.js';

// Public reads must never expose deactivated rows, so the filter lives here in one place
// instead of being repeated by every caller.
const ACTIVE = { deactivatedAt: null } as const;

const ORDER = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

// Explicit allow-lists: a column added to the table later is never exposed by accident.
const publicListSelect = {
  slug: true,
  titleEs: true,
  titleEn: true,
  summaryEs: true,
  summaryEn: true,
  repoUrl: true,
  liveUrl: true,
  startedAt: true,
  endedAt: true,
  isFeatured: true,
  category: { select: { slug: true, nameEs: true, nameEn: true } },
  technologies: {
    select: { technology: { select: { slug: true, name: true } } },
    orderBy: [{ technology: { sortOrder: 'asc' } }, { technologyId: 'asc' }],
  },
} satisfies Prisma.ProjectSelect;

const publicDetailSelect = {
  ...publicListSelect,
  descriptionEs: true,
  descriptionEn: true,
} satisfies Prisma.ProjectSelect;

const adminListSelect = {
  id: true,
  slug: true,
  categoryId: true,
  titleEs: true,
  titleEn: true,
  status: true,
  isFeatured: true,
  sortOrder: true,
  publishedAt: true,
  deactivatedAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

const adminDetailSelect = {
  id: true,
  slug: true,
  categoryId: true,
  titleEs: true,
  titleEn: true,
  summaryEs: true,
  summaryEn: true,
  descriptionEs: true,
  descriptionEn: true,
  repoUrl: true,
  liveUrl: true,
  startedAt: true,
  endedAt: true,
  status: true,
  isFeatured: true,
  sortOrder: true,
  publishedAt: true,
  deactivatedAt: true,
  createdAt: true,
  updatedAt: true,
  technologies: { select: { technologyId: true }, orderBy: { technologyId: 'asc' } },
  // Only used by the service to know whether a cover exists; it is not part of the response.
  images: { select: { isCover: true } },
} satisfies Prisma.ProjectSelect;

// The columns the API lets an admin write. publishedAt/deactivatedAt are set by the service.
export type ProjectFields = {
  slug: string;
  categoryId: number;
  titleEs: string | null;
  titleEn: string | null;
  summaryEs: string | null;
  summaryEn: string | null;
  descriptionEs: string | null;
  descriptionEn: string | null;
  repoUrl: string | null;
  liveUrl: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  status: 'draft' | 'published';
  isFeatured: boolean;
  sortOrder: number;
};

export type ProjectCreateData = ProjectFields & { publishedAt: Date | null };
export type ProjectUpdateData = Partial<ProjectFields & { publishedAt: Date }>;

const notFound = () => new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
const invalidCategory = () => invalidReference('categoryId', 'category does not exist');
const invalidTechnologies = () =>
  invalidReference('technologyIds', 'one or more technologies do not exist');

export const createProjectsRepository = (db: PrismaClient) => {
  // The 409 says whether the clashing slug belongs to a deactivated project, because that one
  // is invisible in the default admin list and would otherwise look like a phantom conflict.
  const slugTaken = (slug: string | undefined) => async () => {
    const existing = slug
      ? await db.project.findUnique({ where: { slug }, select: { deactivatedAt: true } })
      : null;
    return new AppError(409, 'SLUG_TAKEN', 'A project with this slug already exists', {
      slug: ['already in use'],
      deactivated: existing ? existing.deactivatedAt !== null : null,
    });
  };

  // Replaces the whole set; an unknown id fails the FK and aborts the surrounding transaction.
  const setTechnologies = async (
    tx: Prisma.TransactionClient,
    projectId: number,
    technologyIds: number[],
  ) => {
    await tx.projectTechnology.deleteMany({
      where: { projectId, technologyId: { notIn: technologyIds } },
    });
    if (technologyIds.length > 0) {
      await guarded(
        () =>
          tx.projectTechnology.createMany({
            data: technologyIds.map((technologyId) => ({ projectId, technologyId })),
            skipDuplicates: true,
          }),
        { P2003: invalidTechnologies },
      );
    }
  };

  return {
    findPublished: (categorySlug?: string) =>
      db.project.findMany({
        where: {
          ...ACTIVE,
          status: 'published',
          ...(categorySlug ? { category: { slug: categorySlug } } : {}),
        },
        select: publicListSelect,
        orderBy: [...ORDER],
      }),

    findPublishedBySlug: (slug: string) =>
      db.project.findFirst({
        where: { ...ACTIVE, slug, status: 'published' },
        select: publicDetailSelect,
      }),

    // Admin listing: active only by default; deactivated rows are opt-in.
    findAll: ({ includeDeactivated = false }: { includeDeactivated?: boolean } = {}) =>
      db.project.findMany({
        where: includeDeactivated ? {} : ACTIVE,
        select: adminListSelect,
        orderBy: [...ORDER],
      }),

    // Unfiltered on purpose: reactivating needs to find a deactivated row.
    findById: (id: number) => db.project.findUnique({ where: { id }, select: adminDetailSelect }),

    create: (data: ProjectCreateData, technologyIds: number[]) =>
      db.$transaction(async (tx) => {
        const { id } = await guarded(() => tx.project.create({ data, select: { id: true } }), {
          P2002: slugTaken(data.slug),
          P2003: invalidCategory,
        });
        await setTechnologies(tx, id, technologyIds);
        return tx.project.findUniqueOrThrow({ where: { id }, select: adminDetailSelect });
      }),

    // technologyIds undefined leaves the set alone; [] empties it. Everything runs in one
    // transaction so a bad technology id cannot leave the other changes half-applied.
    update: (id: number, data: ProjectUpdateData, technologyIds?: number[]) =>
      db.$transaction(async (tx) => {
        await guarded(() => tx.project.update({ where: { id }, data, select: { id: true } }), {
          P2002: slugTaken(data.slug),
          P2003: invalidCategory,
          P2025: notFound,
        });
        if (technologyIds) await setTechnologies(tx, id, technologyIds);
        return tx.project.findUniqueOrThrow({ where: { id }, select: adminDetailSelect });
      }),

    setDeactivatedAt: (id: number, deactivatedAt: Date | null) =>
      db.project.update({ where: { id }, data: { deactivatedAt }, select: adminDetailSelect }),
  };
};

export type ProjectsRepository = ReturnType<typeof createProjectsRepository>;
