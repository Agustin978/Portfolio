import { z } from 'zod';
import {
  atLeastOneField,
  atLeastOneFieldMessage,
  dateOnlySchema,
  idListSchema,
  nullableDate,
  nullableText,
  nullableUrl,
  requiredText,
  sortOrderSchema,
} from '../../shared/validation/fields.js';

const shape = {
  company: requiredText(120),
  companyUrl: nullableUrl,
  location: nullableText(120),
  roleEs: nullableText(120),
  roleEn: nullableText(120),
  descriptionEs: nullableText(4000),
  descriptionEn: nullableText(4000),
  startDate: dateOnlySchema,
  endDate: nullableDate,
  status: z.enum(['draft', 'published']),
  sortOrder: sortOrderSchema,
  technologyIds: idListSchema,
};

// Only company and start date are mandatory: a draft can be saved half-written. The service
// applies the defaults and, when the result is published, checks both languages are complete.
export const createExperienceBody = z.strictObject(shape).partial().required({
  company: true,
  startDate: true,
});

export const updateExperienceBody = z
  .strictObject(shape)
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const adminListQuery = z.object({
  includeDeactivated: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type CreateExperienceInput = z.output<typeof createExperienceBody>;
export type UpdateExperienceInput = z.output<typeof updateExperienceBody>;
