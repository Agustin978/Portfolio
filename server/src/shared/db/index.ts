import { env } from '../../config/env.js';
import { createPrismaClient } from './prisma.js';

// The app-wide client, built lazily so importing a module never opens a connection by itself.
let client: ReturnType<typeof createPrismaClient> | undefined;

export const getPrisma = () => (client ??= createPrismaClient(env.DATABASE_URL));
