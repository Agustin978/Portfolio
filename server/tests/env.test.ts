import { describe, expect, it } from 'vitest';
import { envSchema } from '../src/config/env.js';

const base = {
  CLIENT_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};
const resend = {
  RESEND_API_KEY: 're_key',
  CONTACT_TO_EMAIL: 'owner@example.com',
  CONTACT_FROM_EMAIL: 'onboarding@resend.dev',
};
const cloudinary = {
  CLOUDINARY_CLOUD_NAME: 'cloud',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
};

describe('CLIENT_ORIGIN', () => {
  const parse = (CLIENT_ORIGIN: string) => envSchema.safeParse({ ...base, CLIENT_ORIGIN });

  it('is reduced to its origin, without a trailing slash or path', () => {
    expect(parse('http://localhost:5173').data?.CLIENT_ORIGIN).toBe('http://localhost:5173');
    expect(parse('http://localhost:5173/').data?.CLIENT_ORIGIN).toBe('http://localhost:5173');
    expect(parse('https://app.example.com/portfolio/?x=1').data?.CLIENT_ORIGIN).toBe(
      'https://app.example.com',
    );
  });

  it('lowercases the host so it matches what the browser sends', () => {
    expect(parse('https://App.Example.com/').data?.CLIENT_ORIGIN).toBe('https://app.example.com');
  });

  // These URLs parse but have the opaque origin "null", which would let `Origin: null`
  // (sandboxed iframes, local files) through CORS and the origin guard.
  it.each(['file:///etc/hosts', 'data:text/plain,hi', 'javascript:alert(1)', 'ftp://example.com'])(
    'rejects %s because it is not an http(s) URL',
    (value) => {
      expect(parse(value).success).toBe(false);
    },
  );

  it('rejects text that is not a URL', () => {
    expect(parse('localhost:5173').success).toBe(false);
    expect(parse('').success).toBe(false);
  });
});

describe('Cloudinary variables', () => {
  it('are optional outside production', () => {
    expect(envSchema.safeParse({ ...base, NODE_ENV: 'development' }).success).toBe(true);
    expect(envSchema.safeParse({ ...base, NODE_ENV: 'test', CLOUDINARY_API_KEY: '' }).success).toBe(
      true,
    );
  });

  it('are required in production, each one named when missing', () => {
    const result = envSchema.safeParse({
      ...base,
      NODE_ENV: 'production',
      CLOUDINARY_CLOUD_NAME: 'cloud',
      CLOUDINARY_API_KEY: '',
    });

    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((issue) => issue.path[0]);
    expect(paths.sort()).toEqual([
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'CONTACT_FROM_EMAIL',
      'CONTACT_TO_EMAIL',
      'RESEND_API_KEY',
    ]);
  });

  it('pass in production when all three are set', () => {
    expect(
      envSchema.safeParse({ ...base, NODE_ENV: 'production', ...cloudinary, ...resend }).success,
    ).toBe(true);
  });
});

describe('Resend variables', () => {
  it('are optional outside production', () => {
    expect(envSchema.safeParse({ ...base, NODE_ENV: 'development' }).success).toBe(true);
    expect(envSchema.safeParse({ ...base, RESEND_API_KEY: '', CONTACT_TO_EMAIL: '' }).success).toBe(
      true,
    );
  });

  it('are required in production, each one named when missing', () => {
    const result = envSchema.safeParse({
      ...base,
      NODE_ENV: 'production',
      ...cloudinary,
      RESEND_API_KEY: 're_key',
    });

    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((issue) => issue.path[0]);
    expect(paths.sort()).toEqual(['CONTACT_FROM_EMAIL', 'CONTACT_TO_EMAIL']);
  });

  it('reject a recipient that is not an email address', () => {
    expect(envSchema.safeParse({ ...base, CONTACT_TO_EMAIL: 'not-an-email' }).success).toBe(false);
  });
});
