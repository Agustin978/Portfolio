import { z } from 'zod';
import {
  atLeastOneField,
  atLeastOneFieldMessage,
  idListSchema,
  nullableDate,
  nullableText,
  nullableUrl,
  positiveIdSchema,
  slugSchema,
  sortOrderSchema,
} from '../../shared/validation/fields.js';

const shape = {
  slug: slugSchema,
  categoryId: positiveIdSchema,
  titleEs: nullableText(160),
  titleEn: nullableText(160),
  summaryEs: nullableText(400),
  summaryEn: nullableText(400),
  descriptionEs: nullableText(8000),
  descriptionEn: nullableText(8000),
  repoUrl: nullableUrl,
  liveUrl: nullableUrl,
  startedAt: nullableDate,
  endedAt: nullableDate,
  status: z.enum(['draft', 'published']),
  isFeatured: z.boolean(),
  sortOrder: sortOrderSchema,
  technologyIds: idListSchema,
};

// Only slug and category are mandatory: a draft can be saved half-written. The service applies
// the defaults and, when the result is published, checks both languages are complete.
export const createProjectBody = z.strictObject(shape).partial().required({
  slug: true,
  categoryId: true,
});

export const updateProjectBody = z
  .strictObject(shape)
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const adminListQuery = z.object({
  includeDeactivated: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

// An unknown slug is not an error: it just matches nothing. An empty value means "no filter".
export const publicListQuery = z.object({
  category: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => value || undefined),
});

export type CreateProjectInput = z.output<typeof createProjectBody>;
export type UpdateProjectInput = z.output<typeof updateProjectBody>;
