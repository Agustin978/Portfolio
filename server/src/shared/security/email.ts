import { z } from 'zod';

// 254 is the RFC 5321 limit. Normalizing in one place keeps the seed and login from disagreeing
// on casing or stray spaces, which would otherwise lock the admin out or create a second row.
export const normalizedEmail = z.string().max(254).trim().toLowerCase().pipe(z.email());
