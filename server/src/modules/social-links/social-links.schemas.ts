import { z } from 'zod';
import {
  atLeastOneField,
  atLeastOneFieldMessage,
  httpUrlSchema,
  sortOrderSchema,
} from '../../shared/validation/fields.js';

// The platform doubles as the icon key the client looks up (github, linkedin, ...).
const shape = {
  platform: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{0,29}$/, 'must be lowercase letters, digits and hyphens'),
  url: httpUrlSchema,
  isVisible: z.boolean(),
  sortOrder: sortOrderSchema,
};

export const createSocialLinkBody = z.strictObject({
  ...shape,
  isVisible: shape.isVisible.default(true),
  sortOrder: shape.sortOrder.default(0),
});

export const updateSocialLinkBody = z
  .strictObject(shape)
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);
