import { z } from 'zod';
import {
  atLeastOneField,
  atLeastOneFieldMessage,
  requiredText,
  slugSchema,
  sortOrderSchema,
} from '../../shared/validation/fields.js';

// strictObject: unknown keys are a 400, not silently ignored, so typos don't look like successes.
const shape = {
  slug: slugSchema,
  nameEs: requiredText(120),
  nameEn: requiredText(120),
  sortOrder: sortOrderSchema,
};

export const createCategoryBody = z.strictObject({
  ...shape,
  sortOrder: shape.sortOrder.default(0),
});

export const updateCategoryBody = z
  .strictObject(shape)
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);
