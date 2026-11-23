import { z } from 'zod';

// Mirror of server/src/modules/contact/contact.schemas.ts (contactBody), for the visitor's sake
// only: the server validates again. Keep the limits in step with that file.
export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;

// Cc covers newlines and tabs; Zl/Zp are the Unicode line and paragraph separators.
const SINGLE_LINE_BREAKERS = /[\p{Cc}\p{Zl}\p{Zp}]/u;

// Messages are i18n keys; the form translates them with MESSAGE_VALUES.
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'form.errors.required')
    .max(NAME_MAX, 'form.errors.nameTooLong')
    .refine((value) => !SINGLE_LINE_BREAKERS.test(value), 'form.errors.nameInvalid'),
  email: z
    .string()
    .trim()
    .min(1, 'form.errors.required')
    .max(EMAIL_MAX, 'form.errors.emailInvalid')
    .pipe(z.email('form.errors.emailInvalid')),
  message: z
    .string()
    .trim()
    .min(1, 'form.errors.required')
    .min(MESSAGE_MIN, 'form.errors.messageTooShort')
    .max(MESSAGE_MAX, 'form.errors.messageTooLong')
    // PostgreSQL cannot store NUL.
    .refine((value) => !value.includes('\u0000'), 'form.errors.messageInvalid'),
  // Honeypot: never validated here, always sent as typed (empty for a person).
  hp_check: z.string(),
});

export type ContactFields = z.input<typeof contactSchema>;
export type ContactValues = z.output<typeof contactSchema>;

// The values each field's messages interpolate.
export const MESSAGE_VALUES: Record<'name' | 'email' | 'message', Record<string, number>> = {
  name: { max: NAME_MAX },
  email: { max: EMAIL_MAX },
  message: { min: MESSAGE_MIN, max: MESSAGE_MAX },
};
