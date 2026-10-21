import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { createPrismaClient } from '../src/shared/db/prisma.js';
import { normalizedEmail } from '../src/shared/security/email.js';
import { hashPassword } from '../src/shared/security/password.js';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env'), quiet: true });

// Seed credentials are required only here: the running API never needs them.
const seedEnv = z
  .object({
    DATABASE_URL: z.string().min(1),
    ADMIN_EMAIL: normalizedEmail,
    ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD must be at least 12 characters'),
  })
  .parse(process.env);

const db = createPrismaClient(seedEnv.DATABASE_URL);

async function main() {
  const passwordHash = await hashPassword(seedEnv.ADMIN_PASSWORD);

  // Re-running the seed re-applies ADMIN_PASSWORD, which is how the password gets rotated.
  await db.adminUser.upsert({
    where: { email: seedEnv.ADMIN_EMAIL },
    create: { email: seedEnv.ADMIN_EMAIL, passwordHash },
    update: { passwordHash },
  });

  // `update: {}` so a re-run never overwrites what was edited later from the admin panel.
  await db.profile.upsert({
    where: { id: 1 },
    create: { id: 1, fullName: 'Nombre Apellido' },
    update: {},
  });

  console.log('Seed complete: admin user and profile are in place.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
