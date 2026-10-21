import type { Request } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';

export type Lang = 'es' | 'en';

const langQuery = z.enum(['es', 'en']).default('es');

// A missing ?lang falls back to Spanish; anything else (including a repeated ?lang=es&lang=en) is a 400.
export const parseLang = (req: Request): Lang => {
  const parsed = langQuery.safeParse(req.query.lang);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid lang, expected "es" or "en"', {
      lang: ['must be "es" or "en"'],
    });
  }
  return parsed.data;
};

const hasText = (value: string | null): value is string => value !== null && value.trim() !== '';

// Spanish is the base language: when an English value is missing or blank the public API
// serves the Spanish one instead of a null the client would have to special-case.
export function localized(lang: Lang, es: string, en: string | null): string;
export function localized(lang: Lang, es: string | null, en: string | null): string | null;
export function localized(lang: Lang, es: string | null, en: string | null): string | null {
  return lang === 'en' && hasText(en) ? en : es;
}
