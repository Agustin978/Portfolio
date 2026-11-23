import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../src/i18n/en.json';
import es from '../src/i18n/es.json';
import { ERROR_MESSAGE_KEYS } from '../src/lib/apiErrors';
import { SKILL_GROUPS } from '../src/services/types';

type Tree = { [key: string]: string | Tree };

const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((all, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...all, [path]: value }
      : { ...all, ...flatten(value, path) };
  }, {});

const esKeys = flatten(es);
const enKeys = flatten(en);
const placeholders = (text: string) =>
  [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('i18n files', () => {
  it('have exactly the same keys in es and en', () => {
    expect(Object.keys(enKeys).sort()).toEqual(Object.keys(esKeys).sort());
  });

  it('have no empty texts', () => {
    for (const [key, text] of Object.entries({ ...esKeys, ...enKeys })) {
      expect(text.trim(), key).not.toBe('');
    }
  });

  it('use the same placeholders in both languages', () => {
    for (const key of Object.keys(esKeys)) {
      expect(placeholders(enKeys[key]!), key).toEqual(placeholders(esKeys[key]!));
    }
  });

  it('have every key the code builds at runtime', () => {
    const used = [
      ...Object.values(ERROR_MESSAGE_KEYS),
      ...SKILL_GROUPS.map((group) => `skills.groups.${group}`),
      // Button labels, not icons: they keep the brand's casing (YouTube, GitLab).
      ...['github', 'linkedin', 'x', 'instagram', 'youtube', 'gitlab'].map((p) => `social.${p}`),
    ];
    for (const key of used) expect(esKeys, key).toHaveProperty([key]);
  });
});

describe('language detection', () => {
  afterEach(() => {
    vi.resetModules();
    window.history.replaceState(null, '', '/');
  });

  // A fresh i18n instance per case: detection runs once, at init.
  const initAt = async (path: string, languages: string[] = ['es-AR']) => {
    window.history.replaceState(null, '', path);
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(languages);
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(languages[0] ?? '');
    vi.resetModules();
    return (await import('../src/i18n')).default;
  };

  it('takes the language from the path before the first render', async () => {
    const i18n = await initAt('/en/projects/rucvm', ['es-AR']);
    expect(i18n.resolvedLanguage).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it.each([
    [['es-AR'], 'es'],
    [['en-US'], 'en'],
    [['fr', 'en'], 'en'],
    [['fr'], 'es'],
  ])('on "/" uses the first supported browser language (%j -> %s)', async (languages, expected) => {
    const i18n = await initAt('/', languages);
    expect(i18n.resolvedLanguage).toBe(expected);
  });
});
