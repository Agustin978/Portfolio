import { z } from 'zod';
import {
  atLeastOneField,
  atLeastOneFieldMessage,
  requiredText,
  slugSchema,
  sortOrderSchema,
} from '../../shared/validation/fields.js';

const shape = {
  slug: slugSchema,
  name: requiredText(80),
  skillGroup: z.enum(['development', 'data', 'infrastructure', 'other']),
  showInSkills: z.boolean(),
  sortOrder: sortOrderSchema,
};

export const createTechnologyBody = z.strictObject({
  ...shape,
  skillGroup: shape.skillGroup.default('other'),
  showInSkills: shape.showInSkills.default(false),
  sortOrder: shape.sortOrder.default(0),
});

export const updateTechnologyBody = z
  .strictObject(shape)
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);
