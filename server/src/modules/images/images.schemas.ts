import { z } from 'zod';
import {
  atLeastOneField,
  atLeastOneFieldMessage,
  nullableText,
  sortOrderSchema,
} from '../../shared/validation/fields.js';

const ALT_MAX = 300;

// multipart fields arrive as strings: an empty one means "no alt text", same as null.
const altShape = {
  altEs: nullableText(ALT_MAX),
  altEn: nullableText(ALT_MAX),
};

export const uploadImageBody = z.strictObject(altShape).partial();

export const updateProjectImageBody = z
  .strictObject({ ...altShape, sortOrder: sortOrderSchema, isCover: z.boolean() })
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

// Experiences have no cover, so isCover is an unknown key there and strictObject rejects it.
export const updateExperienceImageBody = z
  .strictObject({ ...altShape, sortOrder: sortOrderSchema })
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

export type UploadImageInput = z.output<typeof uploadImageBody>;
export type UpdateImageInput = z.output<typeof updateProjectImageBody>;
