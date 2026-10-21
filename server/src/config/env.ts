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
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.url(),
  DATABASE_URL: z.string().min(1),
  // HS256 key: short secrets are brute-forceable offline from a single captured token.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // One value for both the JWT `exp` and the cookie `maxAge`, so the two can never drift apart.
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(28800),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
