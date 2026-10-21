import type { RequestHandler } from 'express';

// Session responses carry credentials-derived data, so no browser or proxy may keep a copy.
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
