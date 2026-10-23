import type { Prisma } from '../../generated/prisma/client.js';
import { guarded } from '../../shared/db/guarded.js';
import type { PrismaClient } from '../../shared/db/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';

export type OwnerKind = 'project' | 'experience';

export type NewImage = {
  publicId: string;
  url: string;
  width: number;
  height: number;
  altEs: string | null;
  altEn: string | null;
};

// One image as attached to its owner. Experiences have no cover, so isCover is always false there.
export type ImageLink = Omit<NewImage, 'publicId'> & {
  id: number;
  publicId: string;
  sortOrder: number;
  isCover: boolean;
};

export type OwnerState = { status: 'draft' | 'published'; deactivated: boolean };

// Everything the service may do while the owner row is locked. All of it runs in one transaction.
export type OwnerTx = {
  owner: OwnerState;
  list(): Promise<ImageLink[]>;
  create(image: NewImage, placement: { sortOrder: number; isCover: boolean }): Promise<ImageLink>;
  updateAlt(imageId: number, alt: { altEs?: string | null; altEn?: string | null }): Promise<void>;
  updateLink(imageId: number, link: { sortOrder?: number; isCover?: boolean }): Promise<void>;
  // Removes the link, and the image row too when nothing else links to it. Returns the public id
  // of a deleted row (the file still has to be removed from the host), or null.
  unlink(imageId: number): Promise<string | null>;
};

const imageSelect = {
  id: true,
  cloudinaryPublicId: true,
  url: true,
  width: true,
  height: true,
  altEs: true,
  altEn: true,
} satisfies Prisma.ImageSelect;

type ImageRow = Prisma.ImageGetPayload<{ select: typeof imageSelect }>;

const toLink = (image: ImageRow, sortOrder: number, isCover: boolean): ImageLink => ({
  id: image.id,
  publicId: image.cloudinaryPublicId,
  url: image.url,
  width: image.width,
  height: image.height,
  altEs: image.altEs,
  altEn: image.altEn,
  sortOrder,
  isCover,
});

export const ownerNotFound = (kind: OwnerKind) =>
  kind === 'project'
    ? new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found')
    : new AppError(404, 'EXPERIENCE_NOT_FOUND', 'Experience not found');

const coverConflict = () =>
  new AppError(409, 'COVER_CONFLICT', 'The cover changed at the same time, try again');

type LockRow = { status: 'draft' | 'published'; deactivatedAt: Date | null };

const toState = (rows: LockRow[], kind: OwnerKind): OwnerState => {
  const row = rows[0];
  if (!row) throw ownerNotFound(kind);
  return { status: row.status, deactivated: row.deactivatedAt !== null };
};

// Both owners share the image table, so deleting an image row is only safe once neither kind
// of link points at it any more.
const deleteIfOrphan = async (tx: Prisma.TransactionClient, imageId: number) => {
  const [projects, experiences] = await Promise.all([
    tx.projectImage.count({ where: { imageId } }),
    tx.experienceImage.count({ where: { imageId } }),
  ]);
  if (projects + experiences > 0) return null;
  const { cloudinaryPublicId } = await tx.image.delete({
    where: { id: imageId },
    select: { cloudinaryPublicId: true },
  });
  return cloudinaryPublicId;
};

const projectOps = (tx: Prisma.TransactionClient, projectId: number): Omit<OwnerTx, 'owner'> => ({
  async list() {
    const rows = await tx.projectImage.findMany({
      where: { projectId },
      select: { sortOrder: true, isCover: true, image: { select: imageSelect } },
      orderBy: [{ sortOrder: 'asc' }, { imageId: 'asc' }],
    });
    return rows.map((row) => toLink(row.image, row.sortOrder, row.isCover));
  },

  async create(image, { sortOrder, isCover }) {
    const created = await tx.image.create({
      data: {
        cloudinaryPublicId: image.publicId,
        url: image.url,
        width: image.width,
        height: image.height,
        altEs: image.altEs,
        altEn: image.altEn,
      },
      select: imageSelect,
    });
    await guarded(
      () =>
        tx.projectImage.create({ data: { projectId, imageId: created.id, sortOrder, isCover } }),
      { P2002: coverConflict },
    );
    return toLink(created, sortOrder, isCover);
  },

  async updateAlt(imageId, alt) {
    await tx.image.update({ where: { id: imageId }, data: alt, select: { id: true } });
  },

  async updateLink(imageId, link) {
    await guarded(
      () =>
        tx.projectImage.update({
          where: { projectId_imageId: { projectId, imageId } },
          data: link,
          select: { imageId: true },
        }),
      { P2002: coverConflict },
    );
  },

  async unlink(imageId) {
    await tx.projectImage.delete({ where: { projectId_imageId: { projectId, imageId } } });
    return deleteIfOrphan(tx, imageId);
  },
});

const experienceOps = (
  tx: Prisma.TransactionClient,
  experienceId: number,
): Omit<OwnerTx, 'owner'> => ({
  async list() {
    const rows = await tx.experienceImage.findMany({
      where: { experienceId },
      select: { sortOrder: true, image: { select: imageSelect } },
      orderBy: [{ sortOrder: 'asc' }, { imageId: 'asc' }],
    });
    return rows.map((row) => toLink(row.image, row.sortOrder, false));
  },

  async create(image, { sortOrder }) {
    const created = await tx.image.create({
      data: {
        cloudinaryPublicId: image.publicId,
        url: image.url,
        width: image.width,
        height: image.height,
        altEs: image.altEs,
        altEn: image.altEn,
      },
      select: imageSelect,
    });
    await tx.experienceImage.create({ data: { experienceId, imageId: created.id, sortOrder } });
    return toLink(created, sortOrder, false);
  },

  async updateAlt(imageId, alt) {
    await tx.image.update({ where: { id: imageId }, data: alt, select: { id: true } });
  },

  async updateLink(imageId, { sortOrder }) {
    if (sortOrder === undefined) return;
    await tx.experienceImage.update({
      where: { experienceId_imageId: { experienceId, imageId } },
      data: { sortOrder },
      select: { imageId: true },
    });
  },

  async unlink(imageId) {
    await tx.experienceImage.delete({
      where: { experienceId_imageId: { experienceId, imageId } },
    });
    return deleteIfOrphan(tx, imageId);
  },
});

export const createImagesRepository = (db: PrismaClient) => ({
  // Cheap checks the service runs before it spends an upload on a request that would be refused.
  async exists(kind: OwnerKind, ownerId: number) {
    const where = { id: ownerId };
    const row =
      kind === 'project'
        ? await db.project.findUnique({ where, select: { id: true } })
        : await db.experience.findUnique({ where, select: { id: true } });
    return row !== null;
  },

  count: (kind: OwnerKind, ownerId: number) =>
    kind === 'project'
      ? db.projectImage.count({ where: { projectId: ownerId } })
      : db.experienceImage.count({ where: { experienceId: ownerId } }),

  // Locks the owner row for the length of the transaction, so two requests changing the same
  // project's images take turns: the count and the cover decision can't be made on stale data.
  // Never call the image host inside `work`: a slow upload would hold the lock.
  transaction<T>(kind: OwnerKind, ownerId: number, work: (tx: OwnerTx) => Promise<T>): Promise<T> {
    return db.$transaction(async (tx) => {
      const rows =
        kind === 'project'
          ? await tx.$queryRaw<LockRow[]>`
              SELECT status::text AS status, deactivated_at AS "deactivatedAt"
              FROM projects WHERE id = ${ownerId} FOR UPDATE`
          : await tx.$queryRaw<LockRow[]>`
              SELECT status::text AS status, deactivated_at AS "deactivatedAt"
              FROM experiences WHERE id = ${ownerId} FOR UPDATE`;
      const owner = toState(rows, kind);
      const ops = kind === 'project' ? projectOps(tx, ownerId) : experienceOps(tx, ownerId);
      return work({ owner, ...ops });
    });
  },
});

export type ImagesRepository = ReturnType<typeof createImagesRepository>;
