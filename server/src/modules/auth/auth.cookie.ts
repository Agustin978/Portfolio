import type { CookieOptions } from 'express';
import { env } from '../../config/env.js';

export const SESSION_COOKIE = 'session';

// clearCookie only removes a cookie when these options match the ones used to set it.
// SameSite=Lax is enough while client and API share a site; Phase 9 revisits it (see CLAUDE.md).
export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
};

export const sessionCookieMaxAgeMs = env.JWT_EXPIRES_IN_SECONDS * 1000;
