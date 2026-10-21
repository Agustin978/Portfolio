import { Router } from 'express';
import type { TechnologiesController } from './technologies.controller.js';

export const createSkillsPublicRouter = (controller: TechnologiesController) => {
  const router = Router();
  router.get('/', controller.listSkills);
  return router;
};

export const createTechnologiesAdminRouter = (controller: TechnologiesController) => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
};
