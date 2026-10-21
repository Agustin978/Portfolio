import type { RequestHandler } from 'express';
import { AppError } from '../../shared/errors/AppError.js';
import { SESSION_COOKIE } from './auth.cookie.js';
import type { AuthService } from './auth.service.js';

declare module 'express-serve-static-core' {
  interface Request {
    admin?: { id: number; email: string };
  }
}

// Express 5 forwards the rejected promise to the error middleware, so no try/catch is needed.
export const createRequireAuth =
  (service: AuthService): RequestHandler =>
  async (req, _res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token === '') {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    req.admin = await service.authenticate(token);
    next();
  };
