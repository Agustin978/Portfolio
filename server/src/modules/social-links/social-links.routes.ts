import { Router } from 'express';
import type { SocialLinksController } from './social-links.controller.js';

export const createSocialLinksPublicRouter = (controller: SocialLinksController) => {
  const router = Router();
  router.get('/', controller.listPublic);
  return router;
};

export const createSocialLinksAdminRouter = (controller: SocialLinksController) => {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.patch('/:id', controller.update);
  return router;
};
