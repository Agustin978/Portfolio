import { z } from 'zod';
import { normalizedEmail } from '../../shared/security/email.js';

// Cc covers newlines and tabs; Zl/Zp are the Unicode line and paragraph separators.
const SINGLE_LINE_BREAKERS = /[\p{Cc}\p{Zl}\p{Zp}]/u;

export const NAME_MAX = 100;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;

// Trim runs before the checks, so a trailing newline from a textarea-style paste is harmless.
export const contactBody = z.strictObject({
  // The name ends up in the email subject, so it must stay on one line.
  name: z
    .string()
    .trim()
    .min(1)
    .max(NAME_MAX)
    .refine((value) => !SINGLE_LINE_BREAKERS.test(value), {
      message: 'must be a single line without control characters',
    }),
  email: normalizedEmail,
  // Line breaks are welcome here; NUL is not, because PostgreSQL cannot store it.
  message: z
    .string()
    .trim()
    .min(MESSAGE_MIN)
    .max(MESSAGE_MAX)
    .refine((value) => !value.includes('\u0000'), { message: 'must not contain NUL characters' }),
  lang: z.enum(['es', 'en']).default('es'),
  // Honeypot, already screened by isHoneypotFilled before this schema runs.
  hp_check: z.string().optional(),
});

export type ContactInput = Omit<z.output<typeof contactBody>, 'hp_check'>;

// Runs before validation on purpose: a bot that fills the trap gets the same 201 as anyone
// else whatever else is wrong with its body, so the response never reveals the trap.
// Anything but an absent or blank string counts as filled; real browsers never send a null.
export const isHoneypotFilled = (body: unknown): boolean => {
  if (typeof body !== 'object' || body === null || !('hp_check' in body)) return false;
  const value = (body as { hp_check: unknown }).hp_check;
  if (value === undefined) return false;
  return !(typeof value === 'string' && value.trim() === '');
};
