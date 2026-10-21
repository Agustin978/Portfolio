import jwt from 'jsonwebtoken';
import { AppError } from '../../shared/errors/AppError.js';
import { getDummyHash, verifyPassword } from '../../shared/security/password.js';
import type { AuthRepository } from './auth.repository.js';

export type AuthConfig = { jwtSecret: string; expiresInSeconds: number };

// Never includes the password hash: this is the only admin shape that leaves the service.
const toPublicAdmin = (admin: { id: number; email: string }) => ({
  id: admin.id,
  email: admin.email,
});

const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

export const createAuthService = (repository: AuthRepository, config: AuthConfig) => ({
  async login(email: string, password: string) {
    const admin = await repository.findByEmail(email);

    if (!admin) {
      // Spend the same argon2 time as a real check so response time doesn't reveal which emails exist.
      await verifyPassword(await getDummyHash(), password);
      throw invalidCredentials();
    }
    if (!(await verifyPassword(admin.passwordHash, password))) throw invalidCredentials();

    // The payload is just `sub` (jsonwebtoken adds iat/exp). Anything else would go stale the
    // moment the row changes, so the admin is re-read on every request instead.
    const token = jwt.sign({}, config.jwtSecret, {
      algorithm: 'HS256',
      subject: String(admin.id),
      expiresIn: config.expiresInSeconds,
    });
    return { token, admin: toPublicAdmin(admin) };
  },

  async authenticate(token: string) {
    let payload: jwt.JwtPayload;
    try {
      // Pinning the algorithm is what rejects `alg: none` and key-confusion tokens.
      const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
      if (typeof decoded === 'string') throw unauthenticated();
      payload = decoded;
    } catch {
      throw unauthenticated();
    }

    const id = Number(payload.sub);
    if (!Number.isInteger(id) || payload.iat === undefined) throw unauthenticated();

    const admin = await repository.findById(id);
    if (!admin) throw unauthenticated();

    // A password rotation (re-running the seed) bumps updated_at and thereby kills older sessions.
    // Compared in whole seconds because `iat` has no sub-second part.
    if (payload.iat < Math.floor(admin.updatedAt.getTime() / 1000)) throw unauthenticated();

    return toPublicAdmin(admin);
  },
});

export type AuthService = ReturnType<typeof createAuthService>;
