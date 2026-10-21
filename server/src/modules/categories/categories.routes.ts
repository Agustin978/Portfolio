import { Router } from 'express';
import type { CategoriesController } from './categories.controller.js';

export const createCategoriesPublicRouter = (controller: CategoriesController) => {
  const router = Router();
  router.get('/', controller.listPublic);
  return router;
};

export const createCategoriesAdminRouter = (controller: CategoriesController) => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
};
