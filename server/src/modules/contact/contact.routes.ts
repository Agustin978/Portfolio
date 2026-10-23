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
