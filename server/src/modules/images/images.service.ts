import { AppError } from '../../shared/errors/AppError.js';
import type { ImageStorage } from '../../shared/storage/imageStorage.js';
import { toAdminImage } from './images.mapper.js';
import { processImage } from './images.processing.js';
import { ownerNotFound, type ImagesRepository, type OwnerKind } from './images.repository.js';
import type { UpdateImageInput, UploadImageInput } from './images.schemas.js';

export const MAX_IMAGES_PER_OWNER = 12;

const imageNotFound = () => new AppError(404, 'IMAGE_NOT_FOUND', 'Image not found');

const limitReached = () =>
  new AppError(
    409,
    'IMAGE_LIMIT_REACHED',
    `At most ${MAX_IMAGES_PER_OWNER} images are allowed here`,
  );

const messageOf = (error: unknown) =>
  typeof (error as { message?: unknown } | null)?.message === 'string'
    ? (error as { message: string }).message
    : 'unknown';

// The file is already unreachable from the app by the time this runs, so a failure here must
// not undo anything: it is logged with the public id so the orphan can be removed by hand.
const destroyQuietly = async (storage: ImageStorage, publicId: string, reason: string) => {
  try {
    await storage.destroy(publicId);
  } catch (error) {
    console.error(`Image file left behind in storage (${reason})`, {
      publicId,
      error: messageOf(error),
    });
  }
};

// One service for both owners: the rules are the same, only the cover is project-only.
export const createImagesService = ({
  repository,
  storage,
  kind,
}: {
  repository: ImagesRepository;
  storage: ImageStorage;
  kind: OwnerKind;
}) => {
  const withCover = kind === 'project';

  return {
    async upload(ownerId: number, file: Buffer, alt: UploadImageInput) {
      // Refuse what is already doomed before spending CPU on the file or an upload on the host.
      if (!(await repository.exists(kind, ownerId))) throw ownerNotFound(kind);
      if ((await repository.count(kind, ownerId)) >= MAX_IMAGES_PER_OWNER) throw limitReached();

      const processed = await processImage(file);
      const stored = await storage.upload(processed.data);

      try {
        const link = await repository.transaction(kind, ownerId, async (tx) => {
          // Checked again under the lock: two uploads may both have passed the check above.
          const links = await tx.list();
          if (links.length >= MAX_IMAGES_PER_OWNER) throw limitReached();

          const sortOrder = links.reduce((max, l) => Math.max(max, l.sortOrder), -1) + 1;
          return tx.create(
            {
              publicId: stored.publicId,
              url: stored.url,
              width: processed.width,
              height: processed.height,
              altEs: alt.altEs ?? null,
              altEn: alt.altEn ?? null,
            },
            { sortOrder, isCover: withCover && !links.some((l) => l.isCover) },
          );
        });
        return toAdminImage(link, withCover);
      } catch (error) {
        await destroyQuietly(storage, stored.publicId, 'database write failed');
        throw error;
      }
    },

    update(ownerId: number, imageId: number, input: UpdateImageInput) {
      return repository.transaction(kind, ownerId, async (tx) => {
        const links = await tx.list();
        const target = links.find((l) => l.id === imageId);
        if (!target) throw imageNotFound();

        let isCover = target.isCover;
        if (withCover && input.isCover !== undefined) {
          if (!input.isCover && target.isCover) {
            throw new AppError(
              400,
              'CANNOT_UNSET_COVER',
              'A project always has a cover: choose another image as the cover instead',
            );
          }
          if (input.isCover && !target.isCover) {
            // The partial unique index can't be deferred, so the old cover is released first.
            const current = links.find((l) => l.isCover);
            if (current) await tx.updateLink(current.id, { isCover: false });
            await tx.updateLink(target.id, { isCover: true });
            isCover = true;
          }
        }

        const { altEs, altEn, sortOrder } = input;
        if (altEs !== undefined || altEn !== undefined) {
          await tx.updateAlt(imageId, {
            ...(altEs !== undefined ? { altEs } : {}),
            ...(altEn !== undefined ? { altEn } : {}),
          });
        }
        if (sortOrder !== undefined) await tx.updateLink(imageId, { sortOrder });

        return toAdminImage(
          {
            ...target,
            altEs: altEs !== undefined ? altEs : target.altEs,
            altEn: altEn !== undefined ? altEn : target.altEn,
            sortOrder: sortOrder ?? target.sortOrder,
            isCover,
          },
          withCover,
        );
      });
    },

    async remove(ownerId: number, imageId: number) {
      const orphanPublicId = await repository.transaction(kind, ownerId, async (tx) => {
        const links = await tx.list();
        const target = links.find((l) => l.id === imageId);
        if (!target) throw imageNotFound();

        // A visible project must keep a cover. Deactivated or draft ones may be emptied.
        if (
          withCover &&
          links.length === 1 &&
          tx.owner.status === 'published' &&
          !tx.owner.deactivated
        ) {
          throw new AppError(
            409,
            'COVER_REQUIRED',
            'A published project needs a cover: unpublish or deactivate it before removing its last image',
          );
        }

        const publicId = await tx.unlink(imageId);

        if (withCover && target.isCover) {
          const next = links.find((l) => l.id !== imageId);
          if (next) await tx.updateLink(next.id, { isCover: true });
        }
        return publicId;
      });

      // Outside the transaction on purpose: the rows are gone either way.
      if (orphanPublicId) await destroyQuietly(storage, orphanPublicId, 'image removed');
    },
  };
};

export type ImagesService = ReturnType<typeof createImagesService>;
