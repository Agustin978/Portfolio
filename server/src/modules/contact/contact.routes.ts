import { Router, type RequestHandler } from 'express';
import type { ContactController } from './contact.controller.js';

export const createContactPublicRouter = ({
  controller,
  rateLimiter,
}: {
  controller: ContactController;
  rateLimiter: RequestHandler;
}) => {
  const router = Router();
  router.post('/', rateLimiter, controller.submit);
  return router;
};

export const createContactAdminRouter = (controller: ContactController) => {
  const router = Router();
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
};
