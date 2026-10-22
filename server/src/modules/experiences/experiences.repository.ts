import type { Prisma } from '../../generated/prisma/client.js';
import { guarded } from '../../shared/db/guarded.js';
import type { PrismaClient } from '../../shared/db/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { invalidReference } from '../../shared/validation/publishable.js';
import {
  adminExperienceImageLinkSelect,
  IMAGE_ORDER,
  publicExperienceImageLinkSelect,
} from '../images/images.mapper.js';

// Public reads must never expose deactivated rows, so the filter lives here in one place
// instead of being repeated by every caller.
const ACTIVE = { deactivatedAt: null } as const;

// Explicit allow-lists: a column added to the table later is never exposed by accident.
const publicSelect = {
  id: true,
  company: true,
  companyUrl: true,
  location: true,
  roleEs: true,
  roleEn: true,
  descriptionEs: true,
  descriptionEn: true,
  startDate: true,
  endDate: true,
  technologies: {
    select: { technology: { select: { slug: true, name: true } } },
    orderBy: [{ technology: { sortOrder: 'asc' } }, { technologyId: 'asc' }],
  },
  images: { select: publicExperienceImageLinkSelect, orderBy: [...IMAGE_ORDER] },
} satisfies Prisma.ExperienceSelect;

const adminListSelect = {
  id: true,
  company: true,
  roleEs: true,
  roleEn: true,
  startDate: true,
  endDate: true,
  status: true,
  sortOrder: true,
  deactivatedAt: true,
  updatedAt: true,
} satisfies Prisma.ExperienceSelect;

const adminDetailSelect = {
  id: true,
  company: true,
  companyUrl: true,
  location: true,
  roleEs: true,
  roleEn: true,
  descriptionEs: true,
  descriptionEn: true,
  startDate: true,
  endDate: true,
  status: true,
  sortOrder: true,
  deactivatedAt: true,
  createdAt: true,
  updatedAt: true,
  technologies: { select: { technologyId: true }, orderBy: { technologyId: 'asc' } },
  images: { select: adminExperienceImageLinkSelect, orderBy: [...IMAGE_ORDER] },
} satisfies Prisma.ExperienceSelect;

// The columns the API lets an admin write. deactivatedAt is changed only by deactivate/reactivate.
export type ExperienceFields = {
  company: string;
  companyUrl: string | null;
  location: string | null;
  roleEs: string | null;
  roleEn: string | null;
  descriptionEs: string | null;
  descriptionEn: string | null;
  startDate: Date;
  endDate: Date | null;
  status: 'draft' | 'published';
  sortOrder: number;
};

export type ExperienceUpdateData = Partial<ExperienceFields>;

// Current positions (no end date) first, then the rest by start date, newest first. Prisma can't
// order by "is null", and the list is a handful of rows, so a stable sort here is the simple fix.
export const sortNewestFirst = <T extends { id: number; startDate: Date; endDate: Date | null }>(
  rows: T[],
): T[] =>
  [...rows].sort(
    (a, b) =>
      Number(a.endDate !== null) - Number(b.endDate !== null) ||
      b.startDate.getTime() - a.startDate.getTime() ||
      a.id - b.id,
  );

const notFound = () => new AppError(404, 'EXPERIENCE_NOT_FOUND', 'Experience not found');
const invalidTechnologies = () =>
  invalidReference('technologyIds', 'one or more technologies do not exist');

export const createExperiencesRepository = (db: PrismaClient) => {
  // Replaces the whole set; an unknown id fails the FK and aborts the surrounding transaction.
  const setTechnologies = async (
    tx: Prisma.TransactionClient,
    experienceId: number,
    technologyIds: number[],
  ) => {
    await tx.experienceTechnology.deleteMany({
      where: { experienceId, technologyId: { notIn: technologyIds } },
    });
    if (technologyIds.length > 0) {
      await guarded(
        () =>
          tx.experienceTechnology.createMany({
            data: technologyIds.map((technologyId) => ({ experienceId, technologyId })),
            skipDuplicates: true,
          }),
        { P2003: invalidTechnologies },
      );
    }
  };

  return {
    findPublished: async () =>
      sortNewestFirst(
        await db.experience.findMany({
          where: { ...ACTIVE, status: 'published' },
          select: publicSelect,
        }),
      ),

    // Admin listing: active only by default; deactivated rows are opt-in.
    findAll: async ({ includeDeactivated = false }: { includeDeactivated?: boolean } = {}) =>
      sortNewestFirst(
        await db.experience.findMany({
          where: includeDeactivated ? {} : ACTIVE,
          select: adminListSelect,
        }),
      ),

    // Unfiltered on purpose: reactivating needs to find a deactivated row.
    findById: (id: number) =>
      db.experience.findUnique({ where: { id }, select: adminDetailSelect }),

    create: (data: ExperienceFields, technologyIds: number[]) =>
      db.$transaction(async (tx) => {
        const { id } = await tx.experience.create({ data, select: { id: true } });
        await setTechnologies(tx, id, technologyIds);
        return tx.experience.findUniqueOrThrow({ where: { id }, select: adminDetailSelect });
      }),

    // technologyIds undefined leaves the set alone; [] empties it. Everything runs in one
    // transaction so a bad technology id cannot leave the other changes half-applied.
    update: (id: number, data: ExperienceUpdateData, technologyIds?: number[]) =>
      db.$transaction(async (tx) => {
        await guarded(() => tx.experience.update({ where: { id }, data, select: { id: true } }), {
          P2025: notFound,
        });
        if (technologyIds) await setTechnologies(tx, id, technologyIds);
        return tx.experience.findUniqueOrThrow({ where: { id }, select: adminDetailSelect });
      }),

    setDeactivatedAt: (id: number, deactivatedAt: Date | null) =>
      db.experience.update({ where: { id }, data: { deactivatedAt }, select: adminDetailSelect }),
  };
};

export type ExperiencesRepository = ReturnType<typeof createExperiencesRepository>;
