import { vi } from 'vitest';
import { AppError } from '../../src/shared/errors/AppError.js';
import type { ImageStorage } from '../../src/shared/storage/imageStorage.js';

let counter = 0;

// Stand-in for Cloudinary: no network, no credentials. Tests swap it in with vi.mock on
// shared/storage/index.js and drive failures through the `fail*` switches.
export const fakeStorage = {
  upload: vi.fn<ImageStorage['upload']>(),
  destroy: vi.fn<ImageStorage['destroy']>(),
  failUpload: false,
  failDestroy: false,
  // Public ids currently "in the cloud": uploaded and not destroyed.
  stored: new Set<string>(),

  reset() {
    this.failUpload = false;
    this.failDestroy = false;
    this.stored.clear();
    this.upload.mockReset().mockImplementation(async () => {
      if (this.failUpload) {
        throw new AppError(502, 'IMAGE_UPLOAD_FAILED', 'The image could not be stored');
      }
      const publicId = `portfolio/test/fake-${++counter}`;
      this.stored.add(publicId);
      return { publicId, url: `https://res.cloudinary.test/${publicId}.webp` };
    });
    this.destroy.mockReset().mockImplementation(async (publicId) => {
      if (this.failDestroy) throw { message: 'provider says: secret detail', http_code: 500 };
      this.stored.delete(publicId);
    });
  },
};

fakeStorage.reset();
