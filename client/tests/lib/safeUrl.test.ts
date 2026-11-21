import { describe, expect, it } from 'vitest';
import { mailtoHref, safeUrl } from '../../src/lib/safeUrl';

describe('safeUrl', () => {
  it('keeps absolute http(s) URLs', () => {
    expect(safeUrl('https://github.com/agustin')).toBe('https://github.com/agustin');
    expect(safeUrl('http://example.com')).toBe('http://example.com/');
    expect(safeUrl('  https://example.com/x  ')).toBe('https://example.com/x');
  });

  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'mailto:a@example.com',
    '/relative/path',
    '//example.com',
    'example.com',
    '',
    null,
    undefined,
  ])('drops %s', (value) => {
    expect(safeUrl(value)).toBeNull();
  });
});

describe('mailtoHref', () => {
  it('builds a mailto link from a plain address', () => {
    expect(mailtoHref('demo@example.com')).toBe('mailto:demo@example.com');
  });

  it.each([
    'demo@example.com?subject=hi',
    'demo@example.com&cc=x@example.com',
    'a@example.com,b@example.com',
    'not an email',
    'javascript:alert(1)//@example.com',
    '',
    null,
  ])('refuses %s', (value) => {
    expect(mailtoHref(value)).toBeNull();
  });
});
