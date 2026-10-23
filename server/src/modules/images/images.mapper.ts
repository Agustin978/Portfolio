import { localized, type Lang } from '../../shared/http/lang.js';

const imageFields = { url: true, width: true, height: true, altEs: true, altEn: true } as const;

// Explicit allow-lists for the repositories of projects and experiences: the public id and
// timestamps of an image never leave the server.
export const publicImageLinkSelect = {
  isCover: true,
  image: { select: imageFields },
} as const;

export const publicExperienceImageLinkSelect = {
  image: { select: imageFields },
} as const;

export const adminImageLinkSelect = {
  sortOrder: true,
  isCover: true,
  image: { select: { id: true, ...imageFields } },
} as const;

export const adminExperienceImageLinkSelect = {
  sortOrder: true,
  image: { select: { id: true, ...imageFields } },
} as const;

export const IMAGE_ORDER = [{ sortOrder: 'asc' }, { imageId: 'asc' }] as const;

type ImageData = {
  url: string;
  width: number;
  height: number;
  altEs: string | null;
  altEn: string | null;
};

// alt follows the usual rule (requested language, Spanish as fallback) and is null only when
// neither language has one: the client then falls back to the title of the project.
export const toPublicImage = (image: ImageData, lang: Lang) => ({
  url: image.url,
  width: image.width,
  height: image.height,
  alt: localized(lang, image.altEs, image.altEn),
});

type AdminImageSource = ImageData & { id: number; sortOrder: number; isCover: boolean };

// What the admin panel sees of an image. Experiences have no cover, so they get no isCover key.
export const toAdminImage = (image: AdminImageSource, withCover: boolean) => ({
  id: image.id,
  url: image.url,
  width: image.width,
  height: image.height,
  altEs: image.altEs,
  altEn: image.altEn,
  sortOrder: image.sortOrder,
  ...(withCover ? { isCover: image.isCover } : {}),
});

type ProjectLink = { sortOrder: number; isCover: boolean; image: ImageData & { id: number } };
type ExperienceLink = { sortOrder: number; image: ImageData & { id: number } };

export const toAdminProjectImage = (link: ProjectLink) =>
  toAdminImage({ ...link.image, sortOrder: link.sortOrder, isCover: link.isCover }, true);

export const toAdminExperienceImage = (link: ExperienceLink) =>
  toAdminImage({ ...link.image, sortOrder: link.sortOrder, isCover: false }, false);
