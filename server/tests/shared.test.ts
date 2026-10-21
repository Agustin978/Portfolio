import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { AppError } from '../src/shared/errors/AppError.js';
import { localized, parseLang } from '../src/shared/http/lang.js';
import { parseId } from '../src/shared/http/validate.js';
import {
  httpUrlSchema,
  nullableText,
  nullableUrl,
  slugSchema,
} from '../src/shared/validation/fields.js';

const requestWith = (query: Record<string, unknown>) => ({ query }) as unknown as Request;

describe('parseLang', () => {
  it('defaults to es and accepts es and en', () => {
    expect(parseLang(requestWith({}))).toBe('es');
    expect(parseLang(requestWith({ lang: 'es' }))).toBe('es');
    expect(parseLang(requestWith({ lang: 'en' }))).toBe('en');
  });

  it.each([['fr'], [''], ['EN'], [['es', 'en']]])('rejects %j with a 400', (lang) => {
    expect(() => parseLang(requestWith({ lang }))).toThrow(AppError);
    try {
      parseLang(requestWith({ lang }));
    } catch (error) {
      expect((error as AppError).statusCode).toBe(400);
    }
  });
});

describe('localized', () => {
  it('returns the requested language', () => {
    expect(localized('es', 'hola', 'hello')).toBe('hola');
    expect(localized('en', 'hola', 'hello')).toBe('hello');
  });

  it('falls back to Spanish when the English value is null or blank', () => {
    expect(localized('en', 'hola', null)).toBe('hola');
    expect(localized('en', 'hola', '   ')).toBe('hola');
  });

  it('keeps null when there is nothing to fall back to', () => {
    expect(localized('en', null, null)).toBeNull();
    expect(localized('es', null, 'hello')).toBeNull();
  });
});

describe('parseId', () => {
  it('accepts positive integers', () => {
    expect(parseId('7')).toBe(7);
    expect(parseId('2147483647')).toBe(2_147_483_647);
  });

  it.each([['0'], ['-1'], ['1.5'], ['abc'], ['01'], ['2147483648'], [undefined], ['1e3']])(
    'rejects %j',
    (raw) => {
      expect(() => parseId(raw)).toThrow(AppError);
    },
  );
});

describe('field validators', () => {
  it('accepts kebab-case slugs only', () => {
    expect(slugSchema.safeParse('my-project-2').success).toBe(true);
    for (const bad of ['My-Project', 'a_b', '-a', 'a-', 'a--b', '', 'a b']) {
      expect(slugSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('accepts only http(s) URLs', () => {
    expect(httpUrlSchema.safeParse('https://example.com/x').success).toBe(true);
    expect(httpUrlSchema.safeParse('http://example.com').success).toBe(true);
    for (const bad of [
      'javascript:alert(1)',
      'mailto:a@b.co',
      'ftp://example.com',
      'example.com',
    ]) {
      expect(httpUrlSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('turns an emptied text or URL field into null', () => {
    expect(nullableText(10).parse('  ')).toBeNull();
    expect(nullableText(10).parse(null)).toBeNull();
    expect(nullableUrl.parse('')).toBeNull();
    expect(nullableUrl.parse(null)).toBeNull();
    expect(nullableUrl.parse('https://example.com')).toBe('https://example.com');
    expect(nullableUrl.safeParse('javascript:alert(1)').success).toBe(false);
  });
});
