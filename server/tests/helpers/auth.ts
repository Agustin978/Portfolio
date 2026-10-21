import jwt from 'jsonwebtoken';
import type { TestDb } from './testDb.js';

// Creates the admin row and signs a session cookie directly, skipping the argon2 cost of a real
// login in suites that only need to be authenticated. Call it after resetDb.
export async function createAdminSession(db: TestDb) {
  const admin = await db.adminUser.create({
    data: { email: 'admin@example.com', passwordHash: 'not-used-in-these-tests' },
  });
  const token = jwt.sign({}, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
    subject: String(admin.id),
    expiresIn: 3600,
  });
  return { adminId: admin.id, cookie: `session=${token}` };
}
