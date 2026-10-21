import { z } from 'zod';

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase letters, digits and single hyphens');

// Only http(s): a stored `javascript:` URL would execute when rendered as a link.
export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .pipe(z.url({ protocol: /^https?$/ }));

// Required text: blank is rejected.
export const requiredText = (max: number) => z.string().trim().min(1).max(max);

// Optional text: an empty string clears the column, which is what an emptied form field sends.
export const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === '' ? null : value));

export const nullableUrl = httpUrlSchema.or(z.literal('').transform(() => null)).nullable();

export const sortOrderSchema = z.number().int().min(-1_000_000).max(1_000_000);

// A PATCH with nothing to change is almost certainly a client bug, so it is rejected loudly.
export const atLeastOneField = (value: object) => Object.keys(value).length > 0;
export const atLeastOneFieldMessage = { message: 'at least one field is required' };

// Calendar dates travel as "YYYY-MM-DD". The round trip rejects impossible days such as 2026-02-31,
// which some engines would otherwise roll over into March.
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      // toISOString() throws on an Invalid Date, so that case must be ruled out first.
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    },
    { message: 'must be a valid YYYY-MM-DD date' },
  )
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const nullableDate = dateOnlySchema.or(z.literal('').transform(() => null)).nullable();

export const positiveIdSchema = z.number().int().positive().max(2_147_483_647);

// Duplicates are dropped here so the same id twice is not an error. The set has no order of its
// own: the junction tables have no sort_order column.
export const idListSchema = z
  .array(positiveIdSchema)
  .max(100)
  .transform((ids) => [...new Set(ids)]);
