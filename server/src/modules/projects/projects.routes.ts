import { Router } from 'express';
import type { ProjectsController } from './projects.controller.js';

export const createProjectsPublicRouter = (controller: ProjectsController) => {
  const router = Router();
  router.get('/', controller.listPublic);
  router.get('/:slug', controller.getPublic);
  return router;
};

// No DELETE: projects are deactivated and reactivated, never removed.
export const createProjectsAdminRouter = (controller: ProjectsController) => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.patch('/:id/deactivate', controller.deactivate);
  router.patch('/:id/reactivate', controller.reactivate);
  return router;
};
