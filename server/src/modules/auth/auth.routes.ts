import { Router } from 'express';
import type { AuthController } from './auth.controller.js';

export const createAuthRouter = (controller: AuthController) => {
  const router = Router();

  router.post('/login', controller.login);
  router.post('/logout', controller.logout);

  return router;
};
