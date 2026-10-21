import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { createAuthController } from './modules/auth/auth.controller.js';
import { createRequireAuth } from './modules/auth/auth.middleware.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { healthRouter } from './modules/health/health.routes.js';
import { getPrisma } from './shared/db/index.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/errorHandler.js';
import { createRateLimiter } from './shared/middlewares/rateLimit.js';

export const app = express();

const authService = createAuthService(createAuthRepository(getPrisma()), {
  jwtSecret: env.JWT_SECRET,
  expiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
});

// Exactly one proxy hop (Render's load balancer) is trusted. `true` would trust any
// X-Forwarded-For value and let a client dodge the per-IP rate limit by spoofing it.
app.set('trust proxy', 1);

app.use(helmet());
// Credentials are required for the httpOnly auth cookie added in Phase 2.
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use('/api/v1/health', healthRouter);
app.use(
  '/api/v1/auth',
  createAuthRouter({
    controller: createAuthController(authService),
    requireAuth: createRequireAuth(authService),
    loginRateLimiter: createRateLimiter({
      limit: 5,
      windowMs: 15 * 60 * 1000,
      skipSuccessfulRequests: true,
    }),
  }),
);

app.use(notFoundHandler);
app.use(errorHandler);
