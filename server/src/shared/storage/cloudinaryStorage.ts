import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../errors/AppError.js';
import type { ImageStorage } from './imageStorage.js';

export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

type Sdk = Pick<typeof cloudinary, 'config' | 'uploader'>;

type Options = {
  // null = no credentials (local development): every call answers 503 instead of crashing boot.
  config: CloudinaryConfig | null;
  folder: string;
  sdk?: Sdk;
};

const UPLOAD_TIMEOUT_MS = 30_000;

// Cloudinary errors are plain objects ({ message, http_code }), not Error instances.
const describe = (error: unknown) => {
  const e = error as { message?: unknown; http_code?: unknown } | null;
  return {
    message: typeof e?.message === 'string' ? e.message : 'unknown',
    httpCode: e?.http_code,
  };
};

export function createCloudinaryStorage({
  config,
  folder,
  sdk = cloudinary,
}: Options): ImageStorage {
  if (config) {
    sdk.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  const notConfigured = () =>
    new AppError(503, 'STORAGE_NOT_CONFIGURED', 'Image storage is not configured');

  return {
    upload(data) {
      if (!config) return Promise.reject(notConfigured());

      return new Promise((resolve, reject) => {
        const fail = (error: unknown) => {
          // The provider text is for the log only; the client always gets the same message.
          console.error('Cloudinary upload failed', describe(error));
          reject(new AppError(502, 'IMAGE_UPLOAD_FAILED', 'The image could not be stored'));
        };

        const stream = sdk.uploader.upload_stream(
          {
            folder,
            // Never derived from the name of the uploaded file.
            public_id: randomUUID(),
            overwrite: false,
            resource_type: 'image',
            timeout: UPLOAD_TIMEOUT_MS,
          },
          (error, result) => {
            if (error || !result) return fail(error);
            resolve({ publicId: result.public_id, url: result.secure_url });
          },
        );
        stream.on('error', fail);
        stream.end(data);
      });
    },

    async destroy(publicId) {
      if (!config) throw notConfigured();
      // A "not found" answer means the file is already gone, which is what the caller wants.
      await sdk.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
    },
  };
}
