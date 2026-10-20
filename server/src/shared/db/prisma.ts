import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

// Prisma 7 talks to PostgreSQL through a driver adapter. A factory (instead of a lone singleton)
// lets tests build a client against the test database.
export const createPrismaClient = (connectionString: string) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

export type { PrismaClient };
