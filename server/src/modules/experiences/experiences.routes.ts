import { Router } from 'express';
import type { ExperiencesController } from './experiences.controller.js';

export const createExperiencesPublicRouter = (controller: ExperiencesController) => {
  const router = Router();
  router.get('/', controller.listPublic);
  return router;
};

// No DELETE: experiences are deactivated and reactivated, never removed.
export const createExperiencesAdminRouter = (controller: ExperiencesController) => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.patch('/:id/deactivate', controller.deactivate);
  router.patch('/:id/reactivate', controller.reactivate);
  return router;
};
