import { describe, expect, it } from 'vitest';
import { envSchema } from '../src/config/env.js';

const base = {
  CLIENT_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};
const cloudinary = {
  CLOUDINARY_CLOUD_NAME: 'cloud',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
};

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
    expect(paths.sort()).toEqual(['CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']);
  });

  it('pass in production when all three are set', () => {
    expect(envSchema.safeParse({ ...base, NODE_ENV: 'production', ...cloudinary }).success).toBe(
      true,
    );
  });
});
