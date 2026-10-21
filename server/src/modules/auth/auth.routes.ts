import { Router, type RequestHandler } from 'express';
import type { AuthController } from './auth.controller.js';

export const createAuthRouter = (controller: AuthController, requireAuth: RequestHandler) => {
  const router = Router();

  router.post('/login', controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);

  return router;
};
