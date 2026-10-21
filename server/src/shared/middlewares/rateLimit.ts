import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';

type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  // Counts only responses with status >= 400, so a legitimate login never eats into the quota.
  skipSuccessfulRequests?: boolean;
};

// A factory (instead of a fixed limiter) so tests can inject a tiny limit, and Phase 5
// can reuse it for the contact form with different numbers.
export const createRateLimiter = ({
  limit,
  windowMs,
  skipSuccessfulRequests = false,
}: RateLimiterOptions) =>
  rateLimit({
    limit,
    windowMs,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Goes through the central error middleware so the body keeps the standard envelope.
    handler: (_req, _res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many attempts, try again later')),
  });
