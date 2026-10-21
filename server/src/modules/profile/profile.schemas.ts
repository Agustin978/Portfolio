import { z } from 'zod';
import {
  atLeastOneField,
  atLeastOneFieldMessage,
  nullableText,
  nullableUrl,
  requiredText,
} from '../../shared/validation/fields.js';

// Public contact address: an emptied field clears it, anything else must be a valid email.
const nullableEmail = z
  .string()
  .max(254)
  .trim()
  .toLowerCase()
  .pipe(z.email())
  .or(z.literal('').transform(() => null))
  .nullable();

export const updateProfileBody = z
  .strictObject({
    fullName: requiredText(120),
    location: nullableText(120),
    publicEmail: nullableEmail,
    cvUrlEs: nullableUrl,
    cvUrlEn: nullableUrl,
    roleEs: nullableText(120),
    roleEn: nullableText(120),
    headlineEs: nullableText(200),
    headlineEn: nullableText(200),
    introEs: nullableText(600),
    introEn: nullableText(600),
    bioEs: nullableText(4000),
    bioEn: nullableText(4000),
    availabilityEs: nullableText(200),
    availabilityEn: nullableText(200),
  })
  .partial()
  .refine(atLeastOneField, atLeastOneFieldMessage);
