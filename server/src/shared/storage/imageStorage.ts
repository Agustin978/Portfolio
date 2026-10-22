export type StoredImage = {
  // Kept in the database so the file can be deleted later.
  publicId: string;
  url: string;
};

// The only door to the image host: nothing outside shared/storage imports the vendor SDK.
export interface ImageStorage {
  upload(data: Buffer): Promise<StoredImage>;
  destroy(publicId: string): Promise<void>;
}
