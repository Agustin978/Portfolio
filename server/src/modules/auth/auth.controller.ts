import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { ok } from '../../shared/http/response.js';
import { normalizedEmail } from '../../shared/security/email.js';
import { SESSION_COOKIE, sessionCookieMaxAgeMs, sessionCookieOptions } from './auth.cookie.js';
import type { AuthService } from './auth.service.js';

// The caps stop an oversized password from forcing a huge argon2 input.
const loginBody = z.object({
  email: normalizedEmail,
  password: z.string().min(1).max(256),
});

export const createAuthController = (service: AuthService) => ({
  async login(req: Request, res: Response) {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      // Only field messages are returned, never the submitted values.
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Invalid request body',
        z.flattenError(parsed.error).fieldErrors,
      );
    }

    const { token, admin } = await service.login(parsed.data.email, parsed.data.password);
    res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions, maxAge: sessionCookieMaxAgeMs });
    res.json(ok({ admin }));
  },

  // requireAuth has already loaded the admin, so there is nothing left to look up here.
  me(req: Request, res: Response) {
    res.json(ok({ admin: req.admin }));
  },

  logout(_req: Request, res: Response) {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
    res.json(ok(null));
  },
});

export type AuthController = ReturnType<typeof createAuthController>;
