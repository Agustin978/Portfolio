import type { Request, Response } from 'express';
import type { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { ok } from '../../shared/http/response.js';
import { parseId, validate } from '../../shared/http/validate.js';
import type { ImagesService } from './images.service.js';
import { uploadImageBody, type UpdateImageInput } from './images.schemas.js';
import { IMAGE_FIELD } from './images.upload.js';

// The PATCH schema is a parameter because only projects accept isCover.
export const createImagesController = (
  service: ImagesService,
  updateBody: z.ZodType<UpdateImageInput>,
) => ({
  async upload(req: Request, res: Response) {
    const ownerId = parseId(req.params.id);
    const alt = validate(uploadImageBody, req.body ?? {});
    if (!req.file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', {
        [IMAGE_FIELD]: ['an image file is required'],
      });
    }
    res.status(201).json(ok(await service.upload(ownerId, req.file.buffer, alt)));
  },

  async update(req: Request, res: Response) {
    const image = await service.update(
      parseId(req.params.id),
      parseId(req.params.imageId),
      validate(updateBody, req.body),
    );
    res.json(ok(image));
  },

  async remove(req: Request, res: Response) {
    await service.remove(parseId(req.params.id), parseId(req.params.imageId));
    res.json(ok(null));
  },
});

export type ImagesController = ReturnType<typeof createImagesController>;
