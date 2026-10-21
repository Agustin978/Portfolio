import { Router, type RequestHandler } from 'express';
import { noStore } from '../../shared/middlewares/noStore.js';

export type AdminMount = { path: string; router: Router };

// requireAuth is mounted once, before any sub-router, so a new admin module can't ship
// unprotected by forgetting it. Mounts are passed in as data so a test can walk every route.
export const createAdminRouter = (requireAuth: RequestHandler, mounts: AdminMount[]) => {
  const router = Router();

  router.use(noStore, requireAuth);
  for (const { path, router: child } of mounts) router.use(path, child);

  return router;
};
