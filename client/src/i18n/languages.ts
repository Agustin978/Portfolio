export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'es';

export const isLanguage = (value: string | undefined): value is Language =>
  SUPPORTED_LANGUAGES.includes(value as Language);
