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
