import { env } from '../../config/env.js';
import { createCloudinaryStorage } from './cloudinaryStorage.js';

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;

// One folder per environment keeps development uploads out of production's library.
export const imageStorage = createCloudinaryStorage({
  folder: `portfolio/${env.NODE_ENV}`,
  config:
    CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
      ? {
          cloudName: CLOUDINARY_CLOUD_NAME,
          apiKey: CLOUDINARY_API_KEY,
          apiSecret: CLOUDINARY_API_SECRET,
        }
      : null,
});

export type { ImageStorage, StoredImage } from './imageStorage.js';
