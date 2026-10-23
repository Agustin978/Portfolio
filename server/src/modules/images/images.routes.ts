import { Router } from 'express';
import type { ImagesController } from './images.controller.js';
import { uploadImage } from './images.upload.js';

// Mounted under /projects/:id/images or /experiences/:id/images, hence mergeParams for `id`.
// Images have no standalone endpoints: they exist only attached to a project or experience.
export const createImagesAdminRouter = (controller: ImagesController) => {
  const router = Router({ mergeParams: true });
  router.post('/', uploadImage, controller.upload);
  router.patch('/:imageId', controller.update);
  router.delete('/:imageId', controller.remove);
  return router;
};
