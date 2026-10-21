import { guarded } from '../../shared/db/guarded.js';
import type { PrismaClient } from '../../shared/db/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';

// The public allow-list leaves out updatedAt: visitors have no use for it.
const publicSelect = {
  fullName: true,
  location: true,
  publicEmail: true,
  cvUrlEs: true,
  cvUrlEn: true,
  roleEs: true,
  roleEn: true,
  headlineEs: true,
  headlineEn: true,
  introEs: true,
  introEn: true,
  bioEs: true,
  bioEn: true,
  availabilityEs: true,
  availabilityEn: true,
} as const;

const adminSelect = { ...publicSelect, updatedAt: true } as const;

export type ProfileInput = {
  fullName: string;
  location: string | null;
  publicEmail: string | null;
  cvUrlEs: string | null;
  cvUrlEn: string | null;
  roleEs: string | null;
  roleEn: string | null;
  headlineEs: string | null;
  headlineEn: string | null;
  introEs: string | null;
  introEn: string | null;
  bioEs: string | null;
  bioEn: string | null;
  availabilityEs: string | null;
  availabilityEn: string | null;
};

// profile is a singleton (CHECK id = 1) created by the seed, never by the API.
const SINGLETON_ID = 1;
const missing = () =>
  new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found; run the database seed');

export const createProfileRepository = (db: PrismaClient) => ({
  findPublic: () => db.profile.findUnique({ where: { id: SINGLETON_ID }, select: publicSelect }),

  find: () => db.profile.findUnique({ where: { id: SINGLETON_ID }, select: adminSelect }),

  update: (data: Partial<ProfileInput>) =>
    guarded(() => db.profile.update({ where: { id: SINGLETON_ID }, data, select: adminSelect }), {
      P2025: missing,
    }),
});

export type ProfileRepository = ReturnType<typeof createProfileRepository>;
