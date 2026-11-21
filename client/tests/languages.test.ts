import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, isLanguage } from '../src/i18n/languages';

describe('isLanguage', () => {
  it('accepts only the supported languages', () => {
    expect(isLanguage('es')).toBe(true);
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
    expect(isLanguage('es-AR')).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });

  it('defaults to Spanish', () => {
    expect(DEFAULT_LANGUAGE).toBe('es');
  });
});
