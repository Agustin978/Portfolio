import type { PrismaClient } from '../../shared/db/prisma.js';

export const createAuthRepository = (db: PrismaClient) => ({
  findByEmail: (email: string) => db.adminUser.findUnique({ where: { email } }),

  findById: (id: number) => db.adminUser.findUnique({ where: { id } }),
});

export type AuthRepository = ReturnType<typeof createAuthRepository>;
