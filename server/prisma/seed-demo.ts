import { env } from '../src/config/env.js';
import { createPrismaClient } from '../src/shared/db/prisma.js';
import { imageStorage } from '../src/shared/storage/index.js';
import { assertDemoTarget } from './demo/guard.js';
import { runSeedDemo } from './demo/run.js';

// Development-only demo content (see docs/plan-fase-6.md, section 13). Run it on one computer
// only: every computer uploads to the same Cloudinary folder but has its own database.
const db = createPrismaClient(env.DATABASE_URL);

// A connection string can carry the password, so it is masked in anything printed.
const safeMessage = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).replace(
    /postgres(?:ql)?:\/\/\S+/g,
    '<database url>',
  );

async function main() {
  // The name comes from the server, not from parsing the URL, so it is the database really in use.
  const [{ name }] = await db.$queryRaw<[{ name: string }]>`SELECT current_database() AS name`;
  assertDemoTarget({ nodeEnv: env.NODE_ENV, databaseName: name });

  const storageConfigured = Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  );
  console.log(`Demo seed on ${name} (images: ${storageConfigured ? 'Cloudinary' : 'none'})`);

  const report = await runSeedDemo({ db, storage: imageStorage, storageConfigured });

  for (const line of report.created) console.log(`  creado   ${line}`);
  for (const line of report.skipped) console.log(`  salteado ${line}`);
  for (const line of report.warnings) console.warn(`  aviso    ${line}`);
  for (const line of report.failed) console.error(`  falló    ${line}`);
  console.log(
    `Listo: ${report.created.length} creados, ${report.skipped.length} salteados, ${report.failed.length} fallidos.`,
  );
  if (report.failed.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`db:seed-demo failed: ${safeMessage(error)}`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
