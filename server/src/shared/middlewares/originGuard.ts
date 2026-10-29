import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// CORS only stops a foreign page from *reading* a response; the request still reaches the API.
// With a cookie session that is a CSRF hole, so state-changing requests that declare a foreign
// Origin are refused outright. A missing Origin (curl, server-to-server, same-origin) is allowed.
export const createOriginGuard = (allowedOrigin: string): RequestHandler => {
  // env already hands over a bare origin; normalizing again keeps the guard safe on its own.
  const allowed = new URL(allowedOrigin).origin;

  return (req, _res, next) => {
    const origin = req.get('Origin');
    if (origin !== undefined && STATE_CHANGING.has(req.method) && origin !== allowed) {
      next(new AppError(403, 'FORBIDDEN_ORIGIN', 'Origin not allowed'));
      return;
    }
    next();
  };
};
