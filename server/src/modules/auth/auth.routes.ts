import { Router, type RequestHandler } from 'express';
import type { AuthController } from './auth.controller.js';

type AuthRouterDeps = {
  controller: AuthController;
  requireAuth: RequestHandler;
  loginRateLimiter: RequestHandler;
};

export const createAuthRouter = ({ controller, requireAuth, loginRateLimiter }: AuthRouterDeps) => {
  const router = Router();

  router.post('/login', loginRateLimiter, controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);

  return router;
};
