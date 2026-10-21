import { Router } from 'express';
import type { ProfileController } from './profile.controller.js';

export const createProfilePublicRouter = (controller: ProfileController) => {
  const router = Router();
  router.get('/', controller.getPublic);
  return router;
};

// A singleton: there is no id and no create/delete.
export const createProfileAdminRouter = (controller: ProfileController) => {
  const router = Router();
  router.get('/', controller.get);
  router.patch('/', controller.update);
  return router;
};
