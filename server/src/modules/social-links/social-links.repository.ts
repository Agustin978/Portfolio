import { guarded } from '../../shared/db/guarded.js';
import type { PrismaClient } from '../../shared/db/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';

const publicSelect = { platform: true, url: true } as const;
const adminSelect = {
  id: true,
  platform: true,
  url: true,
  isVisible: true,
  sortOrder: true,
} as const;

const ORDER = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

export type SocialLinkInput = {
  platform: string;
  url: string;
  isVisible: boolean;
  sortOrder: number;
};

const platformTaken = () =>
  new AppError(409, 'PLATFORM_TAKEN', 'A link for this platform already exists', {
    platform: ['already in use'],
  });
const notFound = () => new AppError(404, 'SOCIAL_LINK_NOT_FOUND', 'Social link not found');

export const createSocialLinksRepository = (db: PrismaClient) => ({
  findVisible: () =>
    db.socialLink.findMany({
      where: { isVisible: true },
      select: publicSelect,
      orderBy: [...ORDER],
    }),

  findAll: () => db.socialLink.findMany({ select: adminSelect, orderBy: [...ORDER] }),

  create: (data: SocialLinkInput) =>
    guarded(() => db.socialLink.create({ data, select: adminSelect }), { P2002: platformTaken }),

  update: (id: number, data: Partial<SocialLinkInput>) =>
    guarded(() => db.socialLink.update({ where: { id }, data, select: adminSelect }), {
      P2002: platformTaken,
      P2025: notFound,
    }),
});

export type SocialLinksRepository = ReturnType<typeof createSocialLinksRepository>;
