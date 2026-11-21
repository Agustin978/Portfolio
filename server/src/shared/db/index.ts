import { env } from '../../config/env.js';
import { createPrismaClient } from './prisma.js';

// The app-wide client, built lazily so importing a module never opens a connection by itself.
let client: ReturnType<typeof createPrismaClient> | undefined;

export const getPrisma = () => (client ??= createPrismaClient(env.DATABASE_URL));

// Closes the pool if it was ever opened. Tests call it after each file: otherwise the pool's
// sockets and timers stay open until the test runner kills the worker.
export const disconnectPrisma = async () => {
  if (!client) return;
  const open = client;
  client = undefined;
  await open.$disconnect();
};
