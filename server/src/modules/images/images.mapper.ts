// What the admin panel sees of an image. The public id stays server-side; experiences have no
// cover, so they don't get an isCover key at all.
export type AdminImageSource = {
  id: number;
  url: string;
  width: number;
  height: number;
  altEs: string | null;
  altEn: string | null;
  sortOrder: number;
  isCover: boolean;
};

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
