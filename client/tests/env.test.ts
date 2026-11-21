import { describe, expect, it } from 'vitest';
import { parseApiOrigin } from '../src/config/env';

describe('parseApiOrigin', () => {
  it('treats an empty or missing value as same origin', () => {
    expect(parseApiOrigin(undefined)).toBe('');
    expect(parseApiOrigin('')).toBe('');
    expect(parseApiOrigin('   ')).toBe('');
  });

  it('keeps only the origin, without trailing slash or path', () => {
    expect(parseApiOrigin('https://api.example.com')).toBe('https://api.example.com');
    expect(parseApiOrigin('https://api.example.com/')).toBe('https://api.example.com');
    expect(parseApiOrigin('https://api.example.com/api/v1')).toBe('https://api.example.com');
    expect(parseApiOrigin('http://localhost:4000')).toBe('http://localhost:4000');
  });

  it.each(['api.example.com', 'ftp://api.example.com', 'javascript:alert(1)'])(
    'rejects %s',
    (value) => {
      expect(() => parseApiOrigin(value)).toThrow(/VITE_API_URL/);
    },
  );
});
