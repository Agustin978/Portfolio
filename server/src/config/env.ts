import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// The single .env lives in the repo root so client and server share one source of truth.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

// Only variables used so far are required; later phases add theirs when they need them,
// so a fresh clone can boot without credentials for services it doesn't use yet.
// ADMIN_EMAIL / ADMIN_PASSWORD are read by the seed script only, never by the running API.
const cloudinaryKeys = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

const resendKeys = ['RESEND_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL'] as const;

// An empty value in .env ("CLOUDINARY_API_KEY=") counts as unset.
const optionalString = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().min(1).optional(),
);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CLIENT_ORIGIN: z.url(),
    DATABASE_URL: z.string().min(1),
    // HS256 key: short secrets are brute-forceable offline from a single captured token.
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    // One value for both the JWT `exp` and the cookie `maxAge`, so the two can never drift apart.
    JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(28800),
    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,
    RESEND_API_KEY: optionalString,
    // Where visitor messages are delivered; the sender must be a Resend-verified address.
    CONTACT_TO_EMAIL: z.preprocess((v) => (v === '' ? undefined : v), z.email().optional()),
    CONTACT_FROM_EMAIL: optionalString,
  })
  // Locally the API boots without Cloudinary or Resend (uploads answer 503, contact messages are
  // saved but not emailed); production must not.
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    for (const key of [...cloudinaryKeys, ...resendKeys]) {
      if (!env[key])
        ctx.addIssue({ code: 'custom', path: [key], message: 'required in production' });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
